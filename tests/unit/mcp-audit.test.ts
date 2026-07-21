import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  auditMetadataForToolCall,
  buildMcpAuditEvent,
  createMcpAuditEvent,
} from "@/lib/mcp/audit";
import { executeMcpTool, type McpToolDependencies } from "@/lib/mcp/tools";

const staffUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|staff",
  email: "staff@example.test",
  id: "user_1",
  name: "Staff User",
  rockPersonId: "101",
};

describe("MCP audit events", () => {
  it("persists only minimal audit fields", async () => {
    const create = vi.fn().mockResolvedValue({});

    await createMcpAuditEvent({ mcpAuditEvent: { create } } as never, {
      appUserId: "user_1",
      requestId: "request_1",
      resultCount: 2,
      status: "SUCCEEDED",
      targetRockId: 101,
      targetType: "PERSON",
      toolName: "query_people",
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        appUserId: "user_1",
        errorCode: undefined,
        requestId: "request_1",
        resultCount: 2,
        status: "SUCCEEDED",
        targetRockId: 101,
        targetType: "PERSON",
        toolName: "query_people",
      },
    });
  });

  it("derives target ids and result counts without raw tool input", () => {
    expect(
      auditMetadataForToolCall("get_person_profile", { rockId: 101 }),
    ).toEqual({
      targetRockId: 101,
      targetType: "PERSON",
    });

    expect(
      auditMetadataForToolCall(
        "query_households",
        {
          filterDefinition: {
            conditions: [{ field: "displayName", value: "Sensitive Name" }],
          },
        },
        { edges: [{ node: { id: "1" } }, { node: { id: "2" } }] },
      ),
    ).toEqual({
      resultCount: 2,
      targetType: "HOUSEHOLD",
    });
  });

  it("builds failed events for unknown tools without storing arguments", () => {
    expect(
      buildMcpAuditEvent({
        appUserId: "user_1",
        errorCode: "UNKNOWN_TOOL",
        status: "FAILED",
        toolInput: { sql: "select * from RockPerson" },
        toolName: "query_sql",
      }),
    ).toEqual({
      appUserId: "user_1",
      errorCode: "UNKNOWN_TOOL",
      status: "FAILED",
      toolName: "query_sql",
    });
  });

  it("records successful tool calls and ignores audit storage failures", async () => {
    const recordAuditEvent = vi.fn().mockRejectedValue(new Error("db down"));
    const dependencies = {
      getFilterCatalog: vi.fn(),
      getHouseholdProfile: vi.fn(),
      getPersonProfile: vi.fn(),
      getSyncStatus: vi.fn(),
      listHouseholdRows: vi.fn(),
      listPeopleRows: vi.fn().mockResolvedValue({ edges: [{ node: {} }] }),
      listSegments: vi.fn(),
      recordAuditEvent,
    } as unknown as McpToolDependencies;

    const result = await executeMcpTool(
      "query_people",
      { first: 1 },
      { requestId: "request_1", user: staffUser },
      dependencies,
    );

    expect(result.isError).toBeUndefined();
    expect(recordAuditEvent).toHaveBeenCalledWith({
      appUserId: "user_1",
      requestId: "request_1",
      resultCount: 1,
      status: "SUCCEEDED",
      targetType: "PERSON",
      toolName: "query_people",
    });
  });

  it("records validation failures before service execution", async () => {
    const recordAuditEvent = vi.fn().mockResolvedValue(undefined);
    const listPeopleRows = vi.fn();
    const dependencies = {
      getFilterCatalog: vi.fn(),
      getHouseholdProfile: vi.fn(),
      getPersonProfile: vi.fn(),
      getSyncStatus: vi.fn(),
      listHouseholdRows: vi.fn(),
      listPeopleRows,
      listSegments: vi.fn(),
      recordAuditEvent,
    } as unknown as McpToolDependencies;

    const result = await executeMcpTool(
      "query_people",
      { first: 101 },
      { user: staffUser },
      dependencies,
    );

    expect(result.isError).toBe(true);
    expect(listPeopleRows).not.toHaveBeenCalled();
    expect(recordAuditEvent).toHaveBeenCalledWith({
      appUserId: "user_1",
      errorCode: "INVALID_INPUT",
      status: "FAILED",
      targetType: "PERSON",
      toolName: "query_people",
    });
  });
});
