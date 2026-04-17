import { describe, expect, it } from "vitest";

import {
  canManageCareWorkflows,
  canSeeGivingAmounts,
  canSeeIndividualGivingAggregates,
  hasPermission,
} from "@/lib/auth/roles";

describe("role permissions", () => {
  it("gives admins full access", () => {
    expect(canSeeGivingAmounts("ADMIN")).toBe(true);
    expect(canSeeIndividualGivingAggregates("ADMIN")).toBe(true);
    expect(canManageCareWorkflows("ADMIN")).toBe(true);
    expect(hasPermission("ADMIN", "settings:manage")).toBe(true);
  });

  it("lets finance see giving amounts with limited people access", () => {
    expect(canSeeGivingAmounts("FINANCE")).toBe(true);
    expect(canSeeIndividualGivingAggregates("FINANCE")).toBe(true);
    expect(hasPermission("FINANCE", "people:read_limited")).toBe(true);
    expect(canManageCareWorkflows("FINANCE")).toBe(false);
  });

  it("blocks pastoral care from individual giving amounts and aggregates", () => {
    expect(canSeeGivingAmounts("PASTORAL_CARE")).toBe(false);
    expect(canSeeIndividualGivingAggregates("PASTORAL_CARE")).toBe(false);
    expect(canManageCareWorkflows("PASTORAL_CARE")).toBe(true);
  });
});
