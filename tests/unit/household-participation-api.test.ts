import { createRequire } from "node:module";
import type { graphql as graphqlType } from "graphql";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { GraphQLContext } from "@/lib/graphql/context";
import { executeMcpTool, defaultMcpToolDependencies } from "@/lib/mcp/tools";
const mocks = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("@/lib/giving/household-participation", async () => ({
  ...(await vi.importActual<
    typeof import("@/lib/giving/household-participation")
  >("@/lib/giving/household-participation")),
  getHouseholdParticipation: mocks.report,
}));
import { schema } from "@/lib/graphql/schema";
const { graphql } = createRequire(import.meta.url)("graphql") as {
  graphql: typeof graphqlType;
};
const actor = {
  active: true,
  id: "staff",
  auth0Subject: "auth0|staff",
  email: null,
  name: null,
  rockPersonId: null,
};
const summary = {
  stage: "TOTAL",
  households: 123,
  giving: 1,
  christian: 0,
  nonChristian: 31,
  unknown: 92,
  christianParticipationRate: null,
};
const report = {
  snapshotId: "snapshot",
  totalCount: 123,
  summaries: [summary],
  rows: [
    {
      rockId: 1,
      stage: "OTHER",
      christianStatus: "NON_CHRISTIAN",
      proxyAdultCount: 1,
      givingSelected: true,
    },
  ],
  filters: { asOf: "2026-10-24T00:00:00.000Z", months: 6 },
};
beforeEach(() => mocks.report.mockReset());
describe("household participation API contract", () => {
  it.each<GraphQLContext>([
    { accessState: { status: "anonymous" } },
    {
      accessState: {
        status: "needs_access",
        identity: { sub: "auth0|pending" },
      },
    },
  ])("rejects callers without local staff access", async (context) => {
    const result = await graphql({
      schema,
      source: "{ householdParticipation { totalCount } }",
      contextValue: context,
    });
    expect(result.errors?.[0].extensions.code).toMatch(
      /UNAUTHENTICATED|FORBIDDEN/,
    );
    expect(mocks.report).not.toHaveBeenCalled();
  });
  it("uses the same report service for typed GraphQL and bounded MCP", async () => {
    mocks.report.mockResolvedValue(report);
    const result = await graphql({
      schema,
      source:
        "{ householdParticipation(months:6, campusRockIds:[3], includeUnassigned:true) { totalCount snapshotId summaries { stage households giving christianParticipationRate } rows { rockId stage christianStatus proxyAdultCount givingSelected } } }",
      contextValue: { accessState: { status: "authorized", user: actor } },
    });
    expect(result.errors).toBeUndefined();
    expect(result.data?.householdParticipation).toMatchObject({
      totalCount: 123,
      snapshotId: "snapshot",
      summaries: [
        {
          stage: "TOTAL",
          households: 123,
          giving: 1,
          christianParticipationRate: null,
        },
      ],
    });
    expect(mocks.report).toHaveBeenCalledWith(
      expect.objectContaining({ months: 6, campusRockIds: [3, null] }),
      actor,
    );
    const audit = vi.fn();
    const output = await executeMcpTool(
      "get_household_participation",
      { months: 6, campusRockIds: [3, null] },
      { user: actor },
      {
        ...defaultMcpToolDependencies,
        getHouseholdParticipation: mocks.report,
        recordAuditEvent: audit,
      },
    );
    expect(output.isError).toBeUndefined();
    const block = output.content[0];
    expect(block.type).toBe("text");
    if (block.type === "text") expect(JSON.parse(block.text)).toEqual(report);
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: "HOUSEHOLD", resultCount: 1 }),
    );
    expect(JSON.stringify(audit.mock.calls)).not.toContain("NON_CHRISTIAN");
  });
  it("rejects invalid windows and oversized MCP requests before querying", async () => {
    const graphqlResult = await graphql({
      schema,
      source: "{ householdParticipation(months:2) { totalCount } }",
      contextValue: { accessState: { status: "authorized", user: actor } },
    });
    expect(graphqlResult.errors?.[0].extensions.code).toBe("BAD_USER_INPUT");
    const mcp = await executeMcpTool(
      "get_household_participation",
      { first: 1000 },
      { user: actor },
      {
        ...defaultMcpToolDependencies,
        getHouseholdParticipation: mocks.report,
        recordAuditEvent: vi.fn(),
      },
    );
    expect(mcp.isError).toBe(true);
    expect(mocks.report).not.toHaveBeenCalled();
  });
});
