import type { PrismaClient } from "@prisma/client";

import {
  CONNECT_GROUP_TYPE_IDS,
  isConnectGroupType,
} from "@/lib/giving/models";
import type { RockClient, RockSyncSlice } from "@/lib/rock/client";
import { ROCK_SYNC_SOURCE } from "@/lib/sync/models";
import type { SyncIssueInput } from "@/lib/sync/reconcile";

export const MAX_MISSING_MEMBERSHIP_READS = 200;

/** Rock collection reads omit archived rows that remain readable by ID. */
export async function refreshKnownConnectMemberships(
  slice: RockSyncSlice,
  client: Pick<PrismaClient, "rockGroupMember">,
  rock: Pick<RockClient, "getGroupMember">,
): Promise<{ slice: RockSyncSlice; issues: SyncIssueInput[] }> {
  const groupIds = slice.groups
    .filter((group) => isConnectGroupType(group.GroupTypeId))
    .map((group) => group.Id);
  if (groupIds.length === 0) {
    return { slice, issues: [] };
  }

  const groupIdSet = new Set(groupIds);
  const presentMemberIds = slice.groupMembers
    .filter((member) => groupIdSet.has(member.GroupId ?? 0))
    .map((member) => member.Id);
  const missing = await client.rockGroupMember.findMany({
    where: {
      groupTypeRockId: { in: CONNECT_GROUP_TYPE_IDS },
      groupRockId: { in: groupIds },
      rockId: { notIn: presentMemberIds },
      archived: false,
    },
    select: { rockId: true, groupRockId: true, personRockId: true },
    orderBy: { rockId: "asc" },
    take: MAX_MISSING_MEMBERSHIP_READS + 1,
  });

  if (missing.length > MAX_MISSING_MEMBERSHIP_READS) {
    return {
      slice,
      issues: [
        {
          severity: "ERROR",
          source: ROCK_SYNC_SOURCE,
          recordType: "RockGroupMember",
          code: "MEMBERSHIP_REFRESH_LIMIT",
          message:
            "Missing Connect Group memberships exceeded the bounded refresh limit; local rows were preserved for review.",
        },
      ],
    };
  }

  const refreshed: RockSyncSlice["groupMembers"] = [];
  const issues: SyncIssueInput[] = [];
  for (const known of missing) {
    try {
      const member = await rock.getGroupMember(known.rockId);
      if (
        member.Id !== known.rockId ||
        member.GroupId !== known.groupRockId ||
        member.PersonId !== known.personRockId
      ) {
        throw new Error("Membership identity changed.");
      }
      refreshed.push(member);
    } catch {
      issues.push({
        severity: "ERROR",
        source: ROCK_SYNC_SOURCE,
        recordType: "RockGroupMember",
        rockId: String(known.rockId),
        code: "MEMBERSHIP_REFRESH_UNRESOLVED",
        message:
          "A known membership omitted by the Rock collection could not be verified by ID; its local row was preserved for review.",
      });
    }
  }

  return {
    slice:
      refreshed.length > 0
        ? { ...slice, groupMembers: [...slice.groupMembers, ...refreshed] }
        : slice,
    issues,
  };
}
