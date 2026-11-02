import type { Prisma } from "@prisma/client";
import type { FamilyMembershipDecision } from "./family-membership-removal";
import { priorFamilyRemovalSchema } from "@/lib/rock/family-membership-history";
import { ROCK_SYNC_SOURCE } from "./models";

type Client = Pick<
  Prisma.TransactionClient,
  "rockHouseholdMember" | "syncIssue"
>;
const REMOVAL_CODE = "FAMILY_MEMBERSHIP_REMOVAL_CONFIRMED";

export async function persistConfirmedFamilyRemoval(
  client: Client,
  decision: FamilyMembershipDecision,
  syncRunId: string,
) {
  const { known } = decision;
  const changed = await client.rockHouseholdMember.updateMany({
    where: {
      rockId: known.rockId,
      householdRockId: known.householdRockId,
      personRockId: known.personRockId,
      lastSyncedAt: known.lastSyncedAt,
      sourceRemovalVerifiedAt: null,
    },
    data: {
      sourceRemovalVerifiedAt: decision.verifiedAt,
      sourceRemovalEvidence: decision.evidence,
      lastSyncRunId: syncRunId,
    },
  });
  if (changed.count !== 1) return false;
  await client.syncIssue.create({
    data: {
      syncRunId,
      severity:
        decision.evidence.personPresentInSource === true ? "INFO" : "WARNING",
      status:
        decision.evidence.personPresentInSource === true ? "RESOLVED" : "OPEN",
      ...(decision.evidence.personPresentInSource === true
        ? { resolvedAt: new Date() }
        : {}),
      source: ROCK_SYNC_SOURCE,
      recordType: "RockHouseholdMember",
      rockId: String(known.rockId),
      code: REMOVAL_CODE,
      message:
        "Rock history confirms this family association ended. Its record and proof are retained; no person deletion or merge is inferred. Absent source-person identities still require disposition review.",
      redactedDetail: {
        ...decision.evidence,
        verifiedAt: decision.verifiedAt.toISOString(),
      },
    },
  });
  return true;
}

/** The caller's transaction keeps a presence change and its proof indivisible. */
export async function persistCurrentFamilyMember(
  client: Client,
  record: Prisma.RockHouseholdMemberCreateManyInput,
  restoration: FamilyMembershipDecision | undefined,
  syncRunId: string,
): Promise<{ written: boolean; audited: boolean }> {
  const existing = await client.rockHouseholdMember.findUnique({
    where: { rockId: record.rockId },
    select: {
      rockId: true,
      householdRockId: true,
      personRockId: true,
      lastSyncedAt: true,
      lastSyncRunId: true,
      sourceRemovalVerifiedAt: true,
      sourceRemovalEvidence: true,
    },
  });
  if (!existing) {
    await client.rockHouseholdMember.create({ data: record });
    return { written: true, audited: false };
  }
  if (
    existing.sourceRemovalVerifiedAt &&
    (!restoration ||
      restoration.known.rockId !== record.rockId ||
      restoration.known.householdRockId !== record.householdRockId ||
      restoration.known.personRockId !== record.personRockId ||
      existing.householdRockId !== record.householdRockId ||
      existing.personRockId !== record.personRockId ||
      restoration.known.lastSyncedAt.getTime() !==
        existing.lastSyncedAt.getTime() ||
      restoration.known.sourceRemovalVerifiedAt?.getTime() !==
        existing.sourceRemovalVerifiedAt.getTime())
  )
    return { written: false, audited: false };
  const prior = existing.sourceRemovalVerifiedAt
    ? priorFamilyRemovalSchema.safeParse(existing.sourceRemovalEvidence)
    : null;
  if (prior && !prior.success) return { written: false, audited: false };
  const changed = await client.rockHouseholdMember.updateMany({
    where: {
      rockId: record.rockId,
      householdRockId: existing.householdRockId,
      personRockId: existing.personRockId,
      lastSyncedAt: existing.lastSyncedAt,
      sourceRemovalVerifiedAt: existing.sourceRemovalVerifiedAt,
    },
    data: {
      ...record,
      ...(existing.sourceRemovalVerifiedAt
        ? {
            sourceRemovalVerifiedAt: null,
          }
        : {}),
    },
  });
  if (changed.count !== 1) return { written: false, audited: false };
  if (existing.sourceRemovalVerifiedAt && restoration) {
    await client.syncIssue.create({
      data: {
        syncRunId,
        severity: "INFO",
        status: "RESOLVED",
        resolvedAt: new Date(),
        source: ROCK_SYNC_SOURCE,
        recordType: "RockHouseholdMember",
        rockId: String(record.rockId),
        code: "FAMILY_MEMBERSHIP_SOURCE_REAPPEARED",
        message:
          "The same family membership reappeared and was verified directly in Rock. Current presence is restored; earlier removal evidence remains in sync history.",
        redactedDetail: {
          ...restoration.evidence,
          ...(prior?.success
            ? {
                previousRemovalHistoryRockId: prior.data.memberHistoryRockId,
                previousSourceRecordedAt: prior.data.sourceRecordedAt,
              }
            : {}),
          previousRemovalVerifiedAt:
            existing.sourceRemovalVerifiedAt.toISOString(),
          previousRemovalSyncRunId: existing.lastSyncRunId,
          verifiedAt: restoration.verifiedAt.toISOString(),
        },
      },
    });
    await client.syncIssue.updateMany({
      where: {
        recordType: "RockHouseholdMember",
        rockId: String(record.rockId),
        code: REMOVAL_CODE,
        status: "OPEN",
      },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return { written: true, audited: true };
  }
  return { written: true, audited: false };
}
