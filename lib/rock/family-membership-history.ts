import { z } from "zod";

// Verified against this church's v1 History entity metadata.
export const FAMILY_HISTORY_ENTITY_TYPES = {
  person: 15,
  group: 16,
  member: 90,
} as const;
export const MAX_FAMILY_HISTORY_ROWS = 200;
export const sourceLocalTimestamp = z.iso
  .datetime({ local: true })
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?$/);
export const familyHistorySchema = z
  .array(
    z.object({
      Id: z.number().int().positive(),
      EntityTypeId: z.number().int().positive(),
      EntityId: z.number().int().positive(),
      Verb: z.string().nullable(),
      ChangeType: z.string().nullable(),
      RelatedEntityTypeId: z.number().int().positive().nullable(),
      RelatedEntityId: z.number().int().positive().nullable(),
      CreatedDateTime: sourceLocalTimestamp,
    }),
  )
  .max(MAX_FAMILY_HISTORY_ROWS - 1);
export type FamilyHistoryRow = z.infer<typeof familyHistorySchema>[number];

export function sourceHistoryOrderKey(timestamp: string) {
  const [seconds, fraction = ""] = timestamp.split(".");
  return `${seconds}.${fraction.padEnd(7, "0")}`;
}

export const priorFamilyRemovalSchema = z.object({
  memberHistoryRockId: z.number().int().positive(),
  sourceRecordedAt: sourceLocalTimestamp,
});
