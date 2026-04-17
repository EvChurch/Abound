export const CONNECT_GROUP_TYPE_ID = 25;
export const FAMILY_GROUP_TYPE_ID = 10;

export const GROUP_MEMBER_STATUS = {
  INACTIVE: 0,
  ACTIVE: 1,
  PENDING: 2,
} as const;

export type GiftReliabilityKind =
  | "ONE_OFF"
  | "SCHEDULED_RECURRING"
  | "INFERRED_RECURRING"
  | "PLEDGE";

export type GiftReliabilityInput = {
  scheduledTransactionRockId?: number | null;
  inferredRecurring?: boolean;
  pledgeBacked?: boolean;
};

export type GroupMembershipState = {
  groupTypeId: number;
  groupActive: boolean;
  groupArchived: boolean;
  memberArchived: boolean;
  groupMemberStatus: number;
};

export type FamilyGivingState = {
  primaryFamilyRockId?: number | null;
  givingGroupRockId?: number | null;
  givingId?: string | null;
};

export function classifyGiftReliability(
  input: GiftReliabilityInput,
): GiftReliabilityKind {
  if (input.scheduledTransactionRockId) {
    return "SCHEDULED_RECURRING";
  }

  if (input.pledgeBacked) {
    return "PLEDGE";
  }

  if (input.inferredRecurring) {
    return "INFERRED_RECURRING";
  }

  return "ONE_OFF";
}

export function isActiveConnectGroupMembership(state: GroupMembershipState) {
  return (
    state.groupTypeId === CONNECT_GROUP_TYPE_ID &&
    state.groupActive &&
    !state.groupArchived &&
    !state.memberArchived &&
    state.groupMemberStatus === GROUP_MEMBER_STATUS.ACTIVE
  );
}

export function resolveGivingHouseholdRockId(state: FamilyGivingState) {
  return state.givingGroupRockId ?? state.primaryFamilyRockId ?? null;
}

export function assertFamilyGivingState(state: FamilyGivingState) {
  if (!state.primaryFamilyRockId && !state.givingGroupRockId) {
    throw new Error(
      "Family/giving rollups require PrimaryFamilyId or GivingGroupId from Rock.",
    );
  }
}
