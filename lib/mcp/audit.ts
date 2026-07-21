import type { PrismaClient } from "@prisma/client";

import type { McpToolName } from "@/lib/mcp/tool-schemas";

export type McpAuditStatus = "SUCCEEDED" | "FAILED";

export type McpAuditEventInput = {
  appUserId: string;
  errorCode?: string;
  requestId?: string;
  resultCount?: number;
  status: McpAuditStatus;
  targetRockId?: number;
  targetType?: string;
  toolName: string;
};

export type McpAuditRecorder = (event: McpAuditEventInput) => Promise<void>;

export async function recordMcpAuditEvent(event: McpAuditEventInput) {
  const { prisma } = await import("@/lib/db/prisma");

  await createMcpAuditEvent(prisma, event);
}

export async function createMcpAuditEvent(
  prisma: Pick<PrismaClient, "mcpAuditEvent">,
  event: McpAuditEventInput,
) {
  await prisma.mcpAuditEvent.create({
    data: {
      appUserId: event.appUserId,
      errorCode: event.errorCode,
      requestId: event.requestId,
      resultCount: event.resultCount,
      status: event.status,
      targetRockId: event.targetRockId,
      targetType: event.targetType,
      toolName: event.toolName,
    },
  });
}

export function buildMcpAuditEvent(input: {
  appUserId: string;
  errorCode?: string;
  requestId?: string;
  result?: unknown;
  status: McpAuditStatus;
  toolInput?: unknown;
  toolName: string;
}): McpAuditEventInput {
  const metadata = isKnownReadTool(input.toolName)
    ? auditMetadataForToolCall(input.toolName, input.toolInput, input.result)
    : {};

  return {
    appUserId: input.appUserId,
    errorCode: input.errorCode,
    requestId: input.requestId,
    status: input.status,
    toolName: input.toolName,
    ...metadata,
  };
}

export function auditMetadataForToolCall(
  toolName: McpToolName,
  toolInput: unknown,
  result?: unknown,
) {
  switch (toolName) {
    case "get_household_profile":
      return {
        targetRockId: numericField(toolInput, "rockId"),
        targetType: "HOUSEHOLD",
      };
    case "get_person_profile":
      return {
        targetRockId: numericField(toolInput, "rockId"),
        targetType: "PERSON",
      };
    case "get_filter_catalog":
    case "list_saved_segments":
      return {
        resultCount: resultCollectionCount(result, toolName),
        targetType: stringField(toolInput, "resource"),
      };
    case "query_households":
      return {
        resultCount: resultCollectionCount(result, toolName),
        targetType: "HOUSEHOLD",
      };
    case "query_people":
      return {
        resultCount: resultCollectionCount(result, toolName),
        targetType: "PERSON",
      };
    case "get_staff_context":
    case "get_sync_status":
      return {};
  }
}

function isKnownReadTool(toolName: string): toolName is McpToolName {
  return [
    "get_filter_catalog",
    "get_household_profile",
    "get_person_profile",
    "get_staff_context",
    "get_sync_status",
    "list_saved_segments",
    "query_households",
    "query_people",
  ].includes(toolName);
}

function numericField(input: unknown, field: string) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = (input as Record<string, unknown>)[field];
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function stringField(input: unknown, field: string) {
  if (!input || typeof input !== "object") {
    return undefined;
  }

  const value = (input as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

function resultCollectionCount(result: unknown, toolName: McpToolName) {
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const resultObject = result as Record<string, unknown>;

  if (Array.isArray(resultObject.edges)) {
    return resultObject.edges.length;
  }

  if (
    toolName === "list_saved_segments" &&
    Array.isArray(resultObject.segments)
  ) {
    return resultObject.segments.length;
  }

  if (toolName === "get_filter_catalog" && Array.isArray(resultObject.fields)) {
    return resultObject.fields.length;
  }

  return undefined;
}
