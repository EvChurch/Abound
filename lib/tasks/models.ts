export type StaffTaskAnchor = {
  personRockId?: number | null;
  householdRockId?: number | null;
};

export function assertValidStaffTaskAnchor(anchor: StaffTaskAnchor) {
  if (!anchor.personRockId && !anchor.householdRockId) {
    throw new Error("Staff tasks must attach to a synced person or household.");
  }

  if (anchor.personRockId && anchor.personRockId <= 0) {
    throw new Error("Staff task personRockId must be a positive Rock id.");
  }

  if (anchor.householdRockId && anchor.householdRockId <= 0) {
    throw new Error("Staff task householdRockId must be a positive Rock id.");
  }
}
