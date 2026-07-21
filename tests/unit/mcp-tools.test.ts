import { GraphQLError } from "graphql";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  executeMcpTool,
  MCP_TOOL_DEFINITIONS,
  type McpToolDependencies,
} from "@/lib/mcp/tools";
import { MCP_TOOL_NAMES } from "@/lib/mcp/tool-schemas";

const staffUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|staff",
  email: "staff@example.test",
  id: "user_1",
  name: "Staff User",
  rockPersonId: "101",
};

const mocks = vi.hoisted(() => ({
  getFilterCatalog: vi.fn(),
  getHouseholdProfile: vi.fn(),
  getPersonProfile: vi.fn(),
  getSyncStatus: vi.fn(),
  listHouseholdRows: vi.fn(),
  listPeopleRows: vi.fn(),
  listSegments: vi.fn(),
}));

const dependencies = mocks as unknown as McpToolDependencies;

function resultJson(result: Awaited<ReturnType<typeof executeMcpTool>>) {
  const content = result.content[0];

  if (!content || content.type !== "text") {
    throw new Error("Expected text MCP content.");
  }

  return JSON.parse(content.text) as unknown;
}

describe("MCP read-only tools", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it("registers only the expected v1 read-only tool names", () => {
    expect(MCP_TOOL_DEFINITIONS.map((tool) => tool.name).sort()).toEqual(
      [...MCP_TOOL_NAMES].sort(),
    );
    expect(MCP_TOOL_NAMES).toEqual(
      expect.not.arrayContaining([
        "create_task",
        "send_email",
        "run_sync",
        "execute_graphql",
        "query_sql",
        "update_pledge",
      ]),
    );
  });

  it("returns active staff context without exposing tokens", async () => {
    const result = await executeMcpTool(
      "get_staff_context",
      {},
      { user: staffUser },
      dependencies,
    );

    expect(result.isError).toBeUndefined();
    expect(resultJson(result)).toEqual({
      user: {
        email: "staff@example.test",
        id: "user_1",
        name: "Staff User",
        rockPersonId: "101",
      },
    });
  });

  it("delegates profile and sync tools to existing read services", async () => {
    mocks.getSyncStatus.mockResolvedValue({ openIssueCount: 0 });
    mocks.getPersonProfile.mockResolvedValue({
      displayName: "Demo Donor",
      givingSummary: { totalGiven: "100.00" },
      rockId: 101,
    });
    mocks.getHouseholdProfile.mockResolvedValue({
      givingSummary: { totalGiven: "200.00" },
      name: "Demo Household",
      rockId: 501,
    });

    const syncResult = await executeMcpTool(
      "get_sync_status",
      {},
      { user: staffUser },
      dependencies,
    );
    expect(syncResult.isError).toBeUndefined();
    await executeMcpTool(
      "get_person_profile",
      { rockId: 101 },
      { user: staffUser },
      dependencies,
    );
    await executeMcpTool(
      "get_household_profile",
      { rockId: 501 },
      { user: staffUser },
      dependencies,
    );

    expect(mocks.getSyncStatus).toHaveBeenCalledOnce();
    expect(mocks.getPersonProfile).toHaveBeenCalledWith(
      { rockId: 101 },
      staffUser,
    );
    expect(mocks.getHouseholdProfile).toHaveBeenCalledWith(
      { rockId: 501 },
      staffUser,
    );
  });

  it("delegates segment and list tools to existing list services", async () => {
    mocks.listSegments.mockResolvedValue([{ id: "view_1", name: "Givers" }]);
    mocks.getFilterCatalog.mockReturnValue([{ id: "lifecycle" }]);
    mocks.listPeopleRows.mockResolvedValue({ edges: [], pageInfo: {} });
    mocks.listHouseholdRows.mockResolvedValue({ edges: [], pageInfo: {} });

    await executeMcpTool(
      "list_saved_segments",
      { resource: "PEOPLE" },
      { user: staffUser },
      dependencies,
    );
    await executeMcpTool(
      "get_filter_catalog",
      { resource: "HOUSEHOLDS" },
      { user: staffUser },
      dependencies,
    );
    await executeMcpTool(
      "query_people",
      { first: 25, savedViewId: "view_1" },
      { user: staffUser },
      dependencies,
    );
    await executeMcpTool(
      "query_households",
      { filterDefinition: { kind: "group", conditions: [] } },
      { user: staffUser },
      dependencies,
    );

    expect(mocks.listSegments).toHaveBeenCalledWith("PEOPLE", staffUser);
    expect(mocks.getFilterCatalog).toHaveBeenCalledWith("HOUSEHOLDS");
    expect(mocks.listPeopleRows).toHaveBeenCalledWith(
      {
        after: undefined,
        filterDefinition: undefined,
        first: 25,
        savedViewId: "view_1",
      },
      staffUser,
    );
    expect(mocks.listHouseholdRows).toHaveBeenCalledWith(
      {
        after: undefined,
        filterDefinition: { kind: "group", conditions: [] },
        first: undefined,
        savedViewId: undefined,
      },
      staffUser,
    );
  });

  it("rejects oversized list requests before service execution", async () => {
    const result = await executeMcpTool(
      "query_people",
      { first: 101 },
      { user: staffUser },
      dependencies,
    );

    expect(result.isError).toBe(true);
    expect(mocks.listPeopleRows).not.toHaveBeenCalled();
  });

  it("returns safe tool errors for service failures", async () => {
    mocks.getPersonProfile.mockRejectedValue(
      new GraphQLError("Rock person ID must be a positive Rock id."),
    );

    const result = await executeMcpTool(
      "get_person_profile",
      { rockId: 1 },
      { user: staffUser },
      dependencies,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      text: "Rock person ID must be a positive Rock id.",
      type: "text",
    });
  });

  it("does not execute unknown tools", async () => {
    const result = await executeMcpTool(
      "query_sql",
      { sql: "select * from donors" },
      { user: staffUser },
      dependencies,
    );

    expect(result.isError).toBe(true);
    expect(result.content[0]).toMatchObject({
      text: "Unknown MCP tool.",
      type: "text",
    });
  });
});
