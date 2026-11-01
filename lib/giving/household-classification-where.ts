import { HOUSEHOLD_STAGE_PRECEDENCE } from "./household-participation-contract";
import type { Prisma } from "@prisma/client";
import { eligibleAdultMembershipWhere } from "./household-participation";

// These predicates mirror classifyHouseholdAdults for the currently verified
// source contract (Investigating only; no explicit positive field is bound).
export function householdClassificationWhere(
  field: "householdStage" | "householdChristianStatus",
  values: string[],
): Prisma.RockHouseholdWhereInput {
  const some = (ids: number[]): Prisma.RockHouseholdWhereInput => ({
    members: {
      some: {
        ...eligibleAdultMembershipWhere,
        person: {
          ...eligibleAdultMembershipWhere.person,
          connectionStatusValueRockId: { in: ids },
        },
      },
    },
  });
  const none = (ids: number[]): Prisma.RockHouseholdWhereInput => ({
    NOT: some(ids),
  });
  const eligible = {
    active: true,
    archived: false,
    groupTypeRockId: 10,
    members: { some: eligibleAdultMembershipWhere },
  };
  const conditions = values.map((value): Prisma.RockHouseholdWhereInput => {
    if (field === "householdStage") {
      const orderedIds = HOUSEHOLD_STAGE_PRECEDENCE.map(
        (rule) => rule.rockStatusId,
      );
      if (value === "OTHER") return none(orderedIds);
      const index = HOUSEHOLD_STAGE_PRECEDENCE.findIndex(
        (rule) => rule.stage === value,
      );
      if (index >= 0)
        return index === 0
          ? some([orderedIds[index]])
          : {
              AND: [
                none(orderedIds.slice(0, index)),
                some([orderedIds[index]]),
              ],
            };
    } else {
      const unknown: Prisma.RockHouseholdWhereInput = {
        members: {
          some: {
            ...eligibleAdultMembershipWhere,
            person: {
              ...eligibleAdultMembershipWhere.person,
              OR: [
                { connectionStatusValueRockId: null },
                { connectionStatusValueRockId: { not: 65 } },
              ],
            },
          },
        },
      };
      switch (value) {
        case "CHRISTIAN":
          return { rockId: { in: [] } };
        case "NON_CHRISTIAN":
          return { NOT: unknown };
        case "UNKNOWN":
          return unknown;
      }
    }
    return { rockId: { in: [] } };
  });
  return { AND: [eligible, { OR: conditions }] };
}
