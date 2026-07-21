import { z } from "zod";

export const listViewResourceSchema = z.enum(["PEOPLE", "HOUSEHOLDS"]);

export const emptyInputSchema = z.object({}).strict();

export const savedSegmentsInputSchema = z
  .object({
    resource: listViewResourceSchema,
  })
  .strict();

export const filterCatalogInputSchema = savedSegmentsInputSchema;

export const listQueryInputSchema = z
  .object({
    after: z.string().min(1).optional(),
    filterDefinition: z.unknown().optional(),
    first: z.number().int().min(1).max(100).optional(),
    savedViewId: z.string().min(1).optional(),
  })
  .strict();

export const rockProfileInputSchema = z
  .object({
    rockId: z.number().int().positive(),
  })
  .strict();

export const toolInputSchemas = {
  get_filter_catalog: filterCatalogInputSchema,
  get_household_profile: rockProfileInputSchema,
  get_person_profile: rockProfileInputSchema,
  get_staff_context: emptyInputSchema,
  get_sync_status: emptyInputSchema,
  list_saved_segments: savedSegmentsInputSchema,
  query_households: listQueryInputSchema,
  query_people: listQueryInputSchema,
};

export type McpToolName = keyof typeof toolInputSchemas;

export const MCP_TOOL_NAMES = Object.keys(toolInputSchemas) as McpToolName[];

export function isMcpToolName(name: string): name is McpToolName {
  return Object.hasOwn(toolInputSchemas, name);
}
