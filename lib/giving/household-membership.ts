import type { Prisma } from "@prisma/client";

/** Current association presence; Rock activity/archive fields remain separate. */
export const currentFamilyMembershipWhere = {
  sourceRemovalVerifiedAt: null,
} satisfies Prisma.RockHouseholdMemberWhereInput;
