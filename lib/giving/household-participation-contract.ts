import { z } from "zod";

export const HOUSEHOLD_STAGES = [
  "GROWING",
  "ATTENDING",
  "JOINING",
  "OTHER",
] as const;
export const CHRISTIAN_STATUSES = [
  "CHRISTIAN",
  "NON_CHRISTIAN",
  "UNKNOWN",
] as const;
export const participationInputSchema = z
  .object({
    months: z
      .union([
        z.literal(1),
        z.literal(3),
        z.literal(6),
        z.literal(12),
        z.literal(24),
      ])
      .default(12),
    asOf: z.string().datetime().optional(),
    campusRockIds: z
      .array(z.number().int().positive().nullable())
      .max(100)
      .default([2, 3, 4]),
    fundRockIds: z.array(z.number().int().positive()).max(100).optional(),
    stage: z.enum(HOUSEHOLD_STAGES).optional(),
    christianStatus: z.enum(CHRISTIAN_STATUSES).optional(),
    giving: z.enum(["SELECTED", "LATEST", "NOT_SELECTED"]).optional(),
    recordedGivers: z
      .enum(["ZERO", "ONE", "TWO", "THREE_OR_MORE", "UNRESOLVED"])
      .optional(),
    reviewOnly: z.boolean().default(false),
    after: z.number().int().positive().optional(),
    first: z.number().int().min(1).max(100).default(50),
    snapshotId: z.string().max(200).optional(),
  })
  .strict()
  .refine(
    (input) => !input.after || (!!input.asOf && !!input.snapshotId),
    "Pagination requires the report asOf and snapshotId.",
  );
export type ParticipationInput = z.input<typeof participationInputSchema>;
export type ParticipationFilters = z.output<typeof participationInputSchema>;
export type HouseholdStage = (typeof HOUSEHOLD_STAGES)[number];
export type ChristianStatus = (typeof CHRISTIAN_STATUSES)[number];
export const STAGE_LABELS: Record<HouseholdStage, string> = {
  GROWING: "Growing",
  ATTENDING: "Attending",
  JOINING: "Joining",
  OTHER: "Other / needs classification",
};
export const CHRISTIAN_LABELS: Record<ChristianStatus, string> = {
  CHRISTIAN: "Christian adult present",
  NON_CHRISTIAN: "All adults classified non-Christian",
  UNKNOWN: "Unknown",
};
export const RULE_VERSION = "household-participation-v1-investigating";
export const SOURCE_EXPLANATION =
  "Current household profile, giving during the selected period. Active, non-deceased adults in active family memberships determine classification. Growing > Attending > Joining; other statuses remain visible. Investigating (65) is a temporary non-Christian proxy; other statuses stay Unknown. No positive Christian source is verified. Actual contribution transactions only, net of signed refunds, to enabled platform funds. Reporting months use the existing UTC effective-month convention; scheduled gifts and pledges are excluded. Healthy lifecycle is a separate measure.";

export type AdultStatus = {
  connectionStatusValueRockId: number | null;
  explicitChristianStatus?: ChristianStatus;
};
export function classifyHouseholdAdults(adults: AdultStatus[]) {
  const ids = new Set(adults.map((a) => a.connectionStatusValueRockId));
  const stage: HouseholdStage = ids.has(1229)
    ? "GROWING"
    : ids.has(146)
      ? "ATTENDING"
      : ids.has(1406)
        ? "JOINING"
        : "OTHER";
  const statuses = adults.map((a) =>
    a.explicitChristianStatus && a.explicitChristianStatus !== "UNKNOWN"
      ? a.explicitChristianStatus
      : a.connectionStatusValueRockId === 65
        ? "NON_CHRISTIAN"
        : "UNKNOWN",
  );
  const christianStatus: ChristianStatus = statuses.includes("CHRISTIAN")
    ? "CHRISTIAN"
    : statuses.length > 0 && statuses.every((s) => s === "NON_CHRISTIAN")
      ? "NON_CHRISTIAN"
      : "UNKNOWN";
  return {
    stage,
    christianStatus,
    mismatch: adults.some(
      (a) =>
        a.connectionStatusValueRockId === 65 &&
        a.explicitChristianStatus === "CHRISTIAN",
    ),
    proxyAdultCount: adults.filter(
      (a) =>
        a.connectionStatusValueRockId === 65 &&
        (!a.explicitChristianStatus || a.explicitChristianStatus === "UNKNOWN"),
    ).length,
  };
}

export function completedParticipationWindow(asOf: Date, months: number) {
  const end = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1));
  const start = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - months, 1),
  );
  const latestStart = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 1, 1),
  );
  return { start, end, latestStart };
}
