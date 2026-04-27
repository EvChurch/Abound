import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HouseholdProfile } from "@/components/people/household-profile";
import { PersonProfile } from "@/components/people/person-profile";
import type {
  RockHouseholdProfile,
  RockPersonProfile,
} from "@/lib/people/profiles";

const navSpy = vi.hoisted(() => vi.fn(() => <nav aria-label="Primary" />));

vi.mock("@/components/navigation/app-top-nav", () => ({
  AppTopNav: navSpy,
}));

function personProfile(
  overrides: Partial<RockPersonProfile> = {},
): RockPersonProfile {
  return {
    amountsHidden: false,
    connectionStatus: "Member",
    deceased: false,
    displayName: "Jane Donor",
    email: "jane@example.com",
    emailActive: true,
    firstName: "Jane",
    givingHousehold: null,
    givingId: "G-910001",
    givingLeaderRockId: null,
    pledgeEditor: null,
    givingSummary: null,
    householdMemberships: [],
    lastName: "Donor",
    lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
    lifecycle: [],
    nickName: "Jane",
    photoUrl: null,
    primaryAliasRockId: 1001,
    primaryCampus: null,
    primaryHousehold: null,
    recordStatus: "Active",
    rockId: 910001,
    staffTasks: [],
    ...overrides,
  };
}

function householdProfile(
  overrides: Partial<RockHouseholdProfile> = {},
): RockHouseholdProfile {
  return {
    active: true,
    amountsHidden: false,
    archived: false,
    campus: null,
    givingPeople: [],
    givingSummary: null,
    lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
    members: [],
    name: "Donor Family",
    rockId: 920001,
    staffTasks: [],
    ...overrides,
  };
}

describe("RecordShell navigation permissions", () => {
  it("passes top-nav management permissions through person record pages", () => {
    render(
      <PersonProfile
        canManageSettings
        canManageTools
        profile={personProfile()}
      />,
    );

    expect(navSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        active: "people",
        canManageSettings: true,
        canManageTools: true,
      }),
      undefined,
    );
  });

  it("passes top-nav management permissions through household record pages", () => {
    render(
      <HouseholdProfile
        canManageSettings
        canManageTools
        profile={householdProfile()}
      />,
    );

    expect(navSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        active: "households",
        canManageSettings: true,
        canManageTools: true,
      }),
      undefined,
    );
  });
});
