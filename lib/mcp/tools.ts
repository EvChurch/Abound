import { GraphQLError } from "graphql";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { LocalAppUser } from "@/lib/auth/types";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import { listHouseholds } from "@/lib/list-views/households-list";
import { listPeople } from "@/lib/list-views/people-list";
import { listSavedListViews } from "@/lib/list-views/saved-views";
import {
  getRockHouseholdProfile,
  getRockPersonProfile,
} from "@/lib/people/profiles";
import { getSyncStatusSummary } from "@/lib/sync/status";
import {
  buildMcpAuditEvent,
  recordMcpAuditEvent,
  type McpAuditRecorder,
} from "@/lib/mcp/audit";
import {
  isMcpToolName,
  toolInputSchemas,
  type McpToolName,
} from "@/lib/mcp/tool-schemas";

export type McpToolDependencies = {
  getFilterCatalog: typeof getListViewFilterCatalog;
  getHouseholdProfile: typeof getRockHouseholdProfile;
  getPersonProfile: typeof getRockPersonProfile;
  getSyncStatus: typeof getSyncStatusSummary;
  listHouseholdRows: typeof listHouseholds;
  listPeopleRows: typeof listPeople;
  listSegments: typeof listSavedListViews;
  recordAuditEvent?: McpAuditRecorder;
};

export type McpToolContext = {
  requestId?: string;
  user: LocalAppUser;
};

export const defaultMcpToolDependencies: McpToolDependencies = {
  getFilterCatalog: getListViewFilterCatalog,
  getHouseholdProfile: getRockHouseholdProfile,
  getPersonProfile: getRockPersonProfile,
  getSyncStatus: getSyncStatusSummary,
  listHouseholdRows: listHouseholds,
  listPeopleRows: listPeople,
  listSegments: listSavedListViews,
  recordAuditEvent: recordMcpAuditEvent,
};

export const MCP_TOOL_DEFINITIONS: Array<{
  description: string;
  name: McpToolName;
  title: string;
}> = [
  {
    description: "Return the authenticated Abound staff context.",
    name: "get_staff_context",
    title: "Get Staff Context",
  },
  {
    description: "Return Rock sync freshness, issue counts, and synced counts.",
    name: "get_sync_status",
    title: "Get Sync Status",
  },
  {
    description: "List saved people or household segments available to staff.",
    name: "list_saved_segments",
    title: "List Saved Segments",
  },
  {
    description: "Return filter fields and operators for people or households.",
    name: "get_filter_catalog",
    title: "Get Filter Catalog",
  },
  {
    description: "Query people through Abound's bounded list-view read model.",
    name: "query_people",
    title: "Query People",
  },
  {
    description:
      "Query households through Abound's bounded list-view read model.",
    name: "query_households",
    title: "Query Households",
  },
  {
    description:
      "Return one Rock person profile with existing giving summary fields.",
    name: "get_person_profile",
    title: "Get Person Profile",
  },
  {
    description:
      "Return one Rock household profile with existing giving summary fields.",
    name: "get_household_profile",
    title: "Get Household Profile",
  },
];

export async function executeMcpTool(
  name: string,
  input: unknown,
  context: McpToolContext,
  dependencies: McpToolDependencies = defaultMcpToolDependencies,
): Promise<CallToolResult> {
  if (!isMcpToolName(name)) {
    await auditToolCall(dependencies, {
      context,
      errorCode: "UNKNOWN_TOOL",
      name,
      status: "FAILED",
      toolInput: input,
    });

    return errorResult("Unknown MCP tool.");
  }

  const parsed = toolInputSchemas[name].safeParse(input ?? {});
  if (!parsed.success) {
    await auditToolCall(dependencies, {
      context,
      errorCode: "INVALID_INPUT",
      name,
      status: "FAILED",
      toolInput: input,
    });

    return errorResult("MCP tool input is invalid.");
  }

  try {
    const result = await executeParsedTool(
      name,
      parsed.data,
      context,
      dependencies,
    );

    await auditToolCall(dependencies, {
      context,
      name,
      result,
      status: "SUCCEEDED",
      toolInput: parsed.data,
    });

    return jsonResult(result);
  } catch (error) {
    await auditToolCall(dependencies, {
      context,
      errorCode: error instanceof GraphQLError ? "GRAPHQL_ERROR" : "TOOL_ERROR",
      name,
      status: "FAILED",
      toolInput: parsed.data,
    });

    return errorResult(safeToolErrorMessage(error));
  }
}

async function executeParsedTool(
  name: McpToolName,
  input: object,
  context: McpToolContext,
  dependencies: McpToolDependencies,
) {
  switch (name) {
    case "get_staff_context":
      return {
        user: {
          email: context.user.email,
          id: context.user.id,
          name: context.user.name,
          rockPersonId: context.user.rockPersonId,
        },
      };
    case "get_sync_status":
      return dependencies.getSyncStatus();
    case "list_saved_segments": {
      const args = input as { resource: "PEOPLE" | "HOUSEHOLDS" };
      return {
        segments: await dependencies.listSegments(args.resource, context.user),
      };
    }
    case "get_filter_catalog": {
      const args = input as { resource: "PEOPLE" | "HOUSEHOLDS" };
      return {
        fields: dependencies.getFilterCatalog(args.resource),
      };
    }
    case "query_people": {
      const args = input as {
        after?: string;
        filterDefinition?: unknown;
        first?: number;
        savedViewId?: string;
      };
      return dependencies.listPeopleRows(
        {
          after: args.after,
          filterDefinition: args.filterDefinition,
          first: args.first,
          savedViewId: args.savedViewId,
        },
        context.user,
      );
    }
    case "query_households": {
      const args = input as {
        after?: string;
        filterDefinition?: unknown;
        first?: number;
        savedViewId?: string;
      };
      return dependencies.listHouseholdRows(
        {
          after: args.after,
          filterDefinition: args.filterDefinition,
          first: args.first,
          savedViewId: args.savedViewId,
        },
        context.user,
      );
    }
    case "get_person_profile": {
      const args = input as { rockId: number };
      return {
        profile: await dependencies.getPersonProfile(
          { rockId: args.rockId },
          context.user,
        ),
      };
    }
    case "get_household_profile": {
      const args = input as { rockId: number };
      return {
        profile: await dependencies.getHouseholdProfile(
          { rockId: args.rockId },
          context.user,
        ),
      };
    }
  }
}

export function jsonResult(value: unknown): CallToolResult {
  return {
    content: [
      {
        text: JSON.stringify(value),
        type: "text",
      },
    ],
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    content: [
      {
        text: message,
        type: "text",
      },
    ],
    isError: true,
  };
}

function safeToolErrorMessage(error: unknown) {
  if (error instanceof GraphQLError) {
    return error.message;
  }

  return "The MCP tool could not be completed.";
}

async function auditToolCall(
  dependencies: McpToolDependencies,
  input: {
    context: McpToolContext;
    errorCode?: string;
    name: string;
    result?: unknown;
    status: "SUCCEEDED" | "FAILED";
    toolInput: unknown;
  },
) {
  if (!dependencies.recordAuditEvent) {
    return;
  }

  try {
    await dependencies.recordAuditEvent(
      buildMcpAuditEvent({
        appUserId: input.context.user.id,
        errorCode: input.errorCode,
        requestId: input.context.requestId,
        result: input.result,
        status: input.status,
        toolInput: input.toolInput,
        toolName: input.name,
      }),
    );
  } catch {
    // Audit persistence must not hide a successful read response.
  }
}
