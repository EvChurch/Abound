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
      switch (value) {
        case "GROWING":
          return some([1229]);
        case "ATTENDING":
          return { AND: [none([1229]), some([146])] };
        case "JOINING":
          return { AND: [none([1229, 146]), some([1406])] };
        case "OTHER":
          return none([1229, 146, 1406]);
      }
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
