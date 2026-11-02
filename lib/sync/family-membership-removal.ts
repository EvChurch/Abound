import type { Prisma, PrismaClient } from "@prisma/client";
import type { RockClient, RockSyncSlice } from "@/lib/rock/client";
import {
  sourceHistoryOrderKey,
  priorFamilyRemovalSchema,
  type FamilyHistoryRow,
} from "@/lib/rock/family-membership-history";
import { ROCK_SYNC_SOURCE } from "./models";
import type { SyncIssueInput } from "./reconcile";

export const MAX_FAMILY_MEMBERSHIP_CHECKS = 200;
type KnownMembership = {
  rockId: number;
  householdRockId: number;
  personRockId: number;
  lastSyncedAt: Date;
  sourceRemovalVerifiedAt: Date | null;
  sourceRemovalEvidence?: Prisma.JsonValue | null;
};
export type FamilyMembershipDecision = {
  known: KnownMembership;
  verifiedAt: Date;
  evidence: Prisma.InputJsonObject;
};
export type FamilyMembershipDecisions = {
  removals: FamilyMembershipDecision[];
  restorations: FamilyMembershipDecision[];
};

/** Source timestamps have no offset. Compare their calendar values, never guess UTC. */
export function confirmedFamilyRemovalEvidence(
  known: Pick<KnownMembership, "rockId" | "householdRockId" | "personRockId">,
  history: FamilyHistoryRow[],
  replacementMemberRockId?: number,
  previousRemoval?: { memberHistoryRockId: number; sourceRecordedAt: string },
): Prisma.InputJsonObject | null {
  const ids = new Set<number>();
  let previous: FamilyHistoryRow | undefined;
  for (const row of history) {
    if (ids.has(row.Id)) throw new Error("Duplicate source history identity.");
    ids.add(row.Id);
    if (previous) {
      const order = sourceHistoryOrderKey(row.CreatedDateTime).localeCompare(
        sourceHistoryOrderKey(previous.CreatedDateTime),
      );
      if (order < 0 || (order === 0 && row.Id <= previous.Id))
        throw new Error("Source history is not completely ordered.");
    }
    previous = row;
  }
  const memberRows = history.filter(
    (r) => r.EntityTypeId === 90 && r.EntityId === known.rockId,
  );
  const removal = memberRows.at(-1);
  const relatedFamily = (r: FamilyHistoryRow) =>
    r.RelatedEntityTypeId === 16 && r.RelatedEntityId === known.householdRockId;
  if (
    !removal ||
    removal.Verb !== "REMOVEDFROMGROUP" ||
    removal.ChangeType !== "Record" ||
    !relatedFamily(removal)
  )
    return null;
  const removedAt = sourceHistoryOrderKey(removal.CreatedDateTime);
  if (
    previousRemoval &&
    (removal.Id <= previousRemoval.memberHistoryRockId ||
      removedAt <= sourceHistoryOrderKey(previousRemoval.sourceRecordedAt))
  )
    return null;
  if (
    memberRows.some(
      (r) =>
        r.Id !== removal.Id &&
        sourceHistoryOrderKey(r.CreatedDateTime) === removedAt &&
        r.Verb !== "REMOVEDFROMGROUP",
    )
  )
    return null;
  const personRows = history.filter(
    (r) =>
      r.EntityTypeId === 15 &&
      r.EntityId === known.personRockId &&
      relatedFamily(r),
  );
  const personRemoval = [...personRows]
    .reverse()
    .find(
      (r) =>
        r.Verb === "REMOVEDFROMGROUP" &&
        r.ChangeType === "Record" &&
        sourceHistoryOrderKey(r.CreatedDateTime) === removedAt,
    );
  if (!personRemoval) return null;
  const additions = personRows.filter(
    (r) =>
      r.Verb === "ADDEDTOGROUP" &&
      sourceHistoryOrderKey(r.CreatedDateTime) >= removedAt,
  );
  if (
    additions.some(
      (r) => sourceHistoryOrderKey(r.CreatedDateTime) === removedAt,
    ) ||
    (additions.length > 0 && !replacementMemberRockId)
  )
    return null;
  if (
    history.some(
      (r) =>
        r.RelatedEntityTypeId === 90 &&
        r.RelatedEntityId === known.rockId &&
        sourceHistoryOrderKey(r.CreatedDateTime) >= removedAt,
    )
  )
    return null;
  return {
    version: 1,
    memberRockId: known.rockId,
    personRockId: known.personRockId,
    householdRockId: known.householdRockId,
    memberHistoryRockId: removal.Id,
    personHistoryRockId: personRemoval.Id,
    sourceRecordedAt: removal.CreatedDateTime,
    verb: "REMOVEDFROMGROUP",
    directMemberReadStatus: 404,
    ...(replacementMemberRockId ? { replacementMemberRockId } : {}),
  };
}

export async function prepareFamilyMembershipReconciliation(
  slice: RockSyncSlice,
  client: Pick<PrismaClient, "rockHouseholdMember">,
  rock: Pick<RockClient, "findGroupMember" | "getFamilyMembershipHistory">,
): Promise<
  FamilyMembershipDecisions & { slice: RockSyncSlice; issues: SyncIssueInput[] }
> {
  const result: FamilyMembershipDecisions & {
    slice: RockSyncSlice;
    issues: SyncIssueInput[];
  } = { slice, removals: [], restorations: [], issues: [] };
  const familyIds = slice.familyGroups
    .filter(
      (g) =>
        g.GroupTypeId === 10 && g.IsActive === true && g.IsArchived === false,
    )
    .map((g) => g.Id);
  const allFamilyIds = new Set(
    slice.familyGroups.filter((g) => g.GroupTypeId === 10).map((g) => g.Id),
  );
  if (!allFamilyIds.size) return result;
  const presentIds = new Set(slice.familyMembers.map((m) => m.Id));
  const supportedFamilies = new Set(familyIds);
  const candidates: KnownMembership[] = [];
  const unresolved = (
    rockId?: number,
    code = "FAMILY_MEMBERSHIP_REMOVAL_UNRESOLVED",
  ) =>
    result.issues.push({
      severity: "ERROR",
      source: ROCK_SYNC_SOURCE,
      recordType: "RockHouseholdMember",
      rockId: rockId ? String(rockId) : null,
      code,
      message:
        "A family membership could not be safely reconciled; its retained state requires review.",
    });
  // Scan small metadata pages instead of binding tens of thousands of source IDs
  // into an IN/NOT IN query. Never certify a truncated discovery scan.
  let after = 0;
  let complete = false;
  for (let page = 0; page < 100; page++) {
    const rows = await client.rockHouseholdMember.findMany({
      where: {
        rockId: { gt: after },
        OR: [
          {
            household: { active: true, archived: false, groupTypeRockId: 10 },
            sourceRemovalVerifiedAt: null,
            archived: false,
            groupMemberStatus: 1,
            groupRoleRockId: 3,
            person: {
              recordStatusValueRockId: 3,
              deceased: false,
              mergedIntoPersonRockId: null,
            },
          },
          { sourceRemovalVerifiedAt: { not: null } },
        ],
      },
      select: {
        rockId: true,
        householdRockId: true,
        personRockId: true,
        lastSyncedAt: true,
        sourceRemovalVerifiedAt: true,
        sourceRemovalEvidence: true,
      },
      orderBy: { rockId: "asc" },
      take: 1000,
    });
    if (rows.some((r) => r.rockId <= after)) break;
    for (const row of rows) {
      if (
        !(row.sourceRemovalVerifiedAt ? allFamilyIds : supportedFamilies).has(
          row.householdRockId,
        )
      )
        continue;
      if (
        row.sourceRemovalVerifiedAt
          ? presentIds.has(row.rockId)
          : !presentIds.has(row.rockId)
      )
        candidates.push(row);
    }
    if (candidates.length > MAX_FAMILY_MEMBERSHIP_CHECKS) break;
    if (rows.length < 1000) {
      complete = true;
      break;
    }
    after = rows.at(-1)!.rockId;
  }
  if (!complete || candidates.length > MAX_FAMILY_MEMBERSHIP_CHECKS) {
    unresolved(undefined, "FAMILY_MEMBERSHIP_RECONCILIATION_LIMIT");
    return result;
  }
  const refreshed = new Map<number, RockSyncSlice["familyMembers"][number]>();
  for (const known of candidates) {
    try {
      const member = await rock.findGroupMember(known.rockId);
      if (member) {
        if (
          member.Id !== known.rockId ||
          member.GroupId !== known.householdRockId ||
          member.PersonId !== known.personRockId ||
          (member.GroupTypeId != null && member.GroupTypeId !== 10)
        )
          throw new Error("Source membership identity changed.");
        refreshed.set(member.Id, member);
        if (known.sourceRemovalVerifiedAt)
          result.restorations.push({
            known,
            verifiedAt: new Date(),
            evidence: {
              version: 1,
              memberRockId: known.rockId,
              householdRockId: known.householdRockId,
              personRockId: known.personRockId,
              directMemberReadStatus: 200,
            },
          });
        continue;
      }
      if (known.sourceRemovalVerifiedAt)
        throw new Error("Source reappearance was not verified.");
      const replacements = slice.familyMembers.filter(
        (m) =>
          m.Id !== known.rockId &&
          m.GroupId === known.householdRockId &&
          m.PersonId === known.personRockId,
      );
      if (replacements.length > 1)
        throw new Error("Ambiguous replacement memberships.");
      let replacementId: number | undefined;
      if (replacements[0]) {
        const current = await rock.findGroupMember(replacements[0].Id);
        if (
          !current ||
          current.Id !== replacements[0].Id ||
          current.GroupId !== known.householdRockId ||
          current.PersonId !== known.personRockId ||
          (current.GroupTypeId != null && current.GroupTypeId !== 10)
        )
          throw new Error("Replacement was not verified.");
        replacementId = current.Id;
        refreshed.set(current.Id, current);
      }
      const history = await rock.getFamilyMembershipHistory(
        known.personRockId,
        known.rockId,
      );
      const previous = known.sourceRemovalEvidence
        ? priorFamilyRemovalSchema.parse(known.sourceRemovalEvidence)
        : null;
      const evidence = confirmedFamilyRemovalEvidence(
        known,
        history,
        replacementId,
        previous
          ? {
              memberHistoryRockId: previous.memberHistoryRockId,
              sourceRecordedAt: previous.sourceRecordedAt,
            }
          : undefined,
      );
      if (!evidence) throw new Error("Source removal evidence is incomplete.");
      result.removals.push({
        known,
        verifiedAt: new Date(),
        evidence: {
          ...evidence,
          personPresentInSource: slice.people.some(
            (p) => p.Id === known.personRockId,
          ),
        },
      });
    } catch {
      unresolved(known.rockId);
    }
  }
  if (refreshed.size)
    result.slice = {
      ...slice,
      familyMembers: [
        ...slice.familyMembers.filter((m) => !refreshed.has(m.Id)),
        ...refreshed.values(),
      ],
    };
  return result;
}
