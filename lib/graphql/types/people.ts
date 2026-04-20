import { GraphQLError } from "graphql";

import { builder } from "@/lib/graphql/builder";
import { requireStaffUser } from "@/lib/graphql/context";
import {
  getRockHouseholdProfile,
  getRockPersonProfile,
  type HouseholdMembershipProfile,
  type ProfileCampus,
  type ProfileGivingSummary,
  type ProfileHouseholdSummary,
  type ProfilePersonSummary,
  type ProfileTask,
  type RockHouseholdProfile,
  type RockPersonProfile,
} from "@/lib/people/profiles";
import type { MonthlyGiving } from "@/lib/giving/metrics";

const profileCampusType = builder
  .objectRef<ProfileCampus>("ProfileCampus")
  .implement({
    fields: (t) => ({
      name: t.exposeString("name"),
      rockId: t.exposeInt("rockId"),
      shortCode: t.exposeString("shortCode", { nullable: true }),
    }),
  });

const profileHouseholdSummaryType = builder
  .objectRef<ProfileHouseholdSummary>("ProfileHouseholdSummary")
  .implement({
    fields: (t) => ({
      active: t.exposeBoolean("active"),
      archived: t.exposeBoolean("archived"),
      campus: t.field({
        nullable: true,
        type: profileCampusType,
        resolve: (household) => household.campus,
      }),
      lastSyncedAt: t.string({
        resolve: (household) => household.lastSyncedAt.toISOString(),
      }),
      name: t.exposeString("name"),
      rockId: t.exposeInt("rockId"),
    }),
  });

const profilePersonSummaryType = builder
  .objectRef<ProfilePersonSummary>("ProfilePersonSummary")
  .implement({
    fields: (t) => ({
      deceased: t.exposeBoolean("deceased"),
      displayName: t.exposeString("displayName"),
      email: t.exposeString("email", { nullable: true }),
      emailActive: t.exposeBoolean("emailActive", { nullable: true }),
      firstName: t.exposeString("firstName", { nullable: true }),
      lastName: t.exposeString("lastName", { nullable: true }),
      nickName: t.exposeString("nickName", { nullable: true }),
      photoUrl: t.exposeString("photoUrl", { nullable: true }),
      primaryCampus: t.field({
        nullable: true,
        type: profileCampusType,
        resolve: (person) => person.primaryCampus,
      }),
      primaryHousehold: t.field({
        nullable: true,
        type: profileHouseholdSummaryType,
        resolve: (person) => person.primaryHousehold,
      }),
      rockId: t.exposeInt("rockId"),
    }),
  });

const profileTaskType = builder
  .objectRef<ProfileTask>("ProfileTask")
  .implement({
    fields: (t) => ({
      assignedToEmail: t.exposeString("assignedToEmail", { nullable: true }),
      assignedToName: t.exposeString("assignedToName", { nullable: true }),
      createdAt: t.string({
        resolve: (task) => task.createdAt.toISOString(),
      }),
      dueAt: t.string({
        nullable: true,
        resolve: (task) => task.dueAt?.toISOString() ?? null,
      }),
      householdRockId: t.exposeInt("householdRockId", { nullable: true }),
      id: t.exposeString("id"),
      personRockId: t.exposeInt("personRockId", { nullable: true }),
      priority: t.exposeString("priority"),
      status: t.exposeString("status"),
      title: t.exposeString("title"),
    }),
  });

const monthlyGivingType = builder
  .objectRef<MonthlyGiving>("MonthlyGiving")
  .implement({
    fields: (t) => ({
      giftCount: t.exposeInt("giftCount"),
      month: t.exposeString("month"),
      previousGiftCount: t.exposeInt("previousGiftCount"),
      previousMonth: t.exposeString("previousMonth"),
      previousTotalGiven: t.exposeString("previousTotalGiven"),
      totalGiven: t.exposeString("totalGiven"),
    }),
  });

const profileGivingSummaryType = builder
  .objectRef<ProfileGivingSummary>("ProfileGivingSummary")
  .implement({
    fields: (t) => ({
      firstGiftAt: t.string({
        nullable: true,
        resolve: (summary) => summary.firstGiftAt?.toISOString() ?? null,
      }),
      lastGiftAmount: t.exposeString("lastGiftAmount", { nullable: true }),
      lastGiftAt: t.string({
        nullable: true,
        resolve: (summary) => summary.lastGiftAt?.toISOString() ?? null,
      }),
      lastTwelveMonthsTotal: t.exposeString("lastTwelveMonthsTotal"),
      monthlyGiving: t.field({
        type: [monthlyGivingType],
        resolve: (summary) => summary.monthlyGiving,
      }),
      monthsWithGiving: t.exposeInt("monthsWithGiving"),
      reliabilityKinds: t.stringList({
        resolve: (summary) => summary.reliabilityKinds,
      }),
      sourceExplanation: t.exposeString("sourceExplanation"),
      totalGiven: t.exposeString("totalGiven"),
    }),
  });

const householdMembershipType = builder
  .objectRef<HouseholdMembershipProfile>("HouseholdMembershipProfile")
  .implement({
    fields: (t) => ({
      archived: t.exposeBoolean("archived"),
      groupRole: t.exposeString("groupRole", { nullable: true }),
      household: t.field({
        type: profileHouseholdSummaryType,
        resolve: (membership) => membership.household,
      }),
      person: t.field({
        nullable: true,
        type: profilePersonSummaryType,
        resolve: (membership) => membership.person ?? null,
      }),
      rockId: t.exposeInt("rockId"),
      status: t.exposeString("status", { nullable: true }),
    }),
  });

const rockPersonProfileType = builder
  .objectRef<RockPersonProfile>("RockPersonProfile")
  .implement({
    fields: (t) => ({
      amountsHidden: t.exposeBoolean("amountsHidden"),
      deceased: t.exposeBoolean("deceased"),
      displayName: t.exposeString("displayName"),
      email: t.exposeString("email", { nullable: true }),
      emailActive: t.exposeBoolean("emailActive", { nullable: true }),
      firstName: t.exposeString("firstName", { nullable: true }),
      givingHousehold: t.field({
        nullable: true,
        type: profileHouseholdSummaryType,
        resolve: (person) => person.givingHousehold,
      }),
      givingId: t.exposeString("givingId", { nullable: true }),
      givingLeaderRockId: t.exposeInt("givingLeaderRockId", { nullable: true }),
      givingSummary: t.field({
        nullable: true,
        type: profileGivingSummaryType,
        resolve: (person) => person.givingSummary,
      }),
      householdMemberships: t.field({
        type: [householdMembershipType],
        resolve: (person) => person.householdMemberships,
      }),
      lastSyncedAt: t.string({
        resolve: (person) => person.lastSyncedAt.toISOString(),
      }),
      lastName: t.exposeString("lastName", { nullable: true }),
      nickName: t.exposeString("nickName", { nullable: true }),
      photoUrl: t.exposeString("photoUrl", { nullable: true }),
      primaryAliasRockId: t.exposeInt("primaryAliasRockId", { nullable: true }),
      primaryCampus: t.field({
        nullable: true,
        type: profileCampusType,
        resolve: (person) => person.primaryCampus,
      }),
      primaryHousehold: t.field({
        nullable: true,
        type: profileHouseholdSummaryType,
        resolve: (person) => person.primaryHousehold,
      }),
      recordStatus: t.exposeString("recordStatus", { nullable: true }),
      rockId: t.exposeInt("rockId"),
      staffTasks: t.field({
        type: [profileTaskType],
        resolve: (person) => person.staffTasks,
      }),
    }),
  });

const rockHouseholdProfileType = builder
  .objectRef<RockHouseholdProfile>("RockHouseholdProfile")
  .implement({
    fields: (t) => ({
      active: t.exposeBoolean("active"),
      amountsHidden: t.exposeBoolean("amountsHidden"),
      archived: t.exposeBoolean("archived"),
      campus: t.field({
        nullable: true,
        type: profileCampusType,
        resolve: (household) => household.campus,
      }),
      givingPeople: t.field({
        type: [profilePersonSummaryType],
        resolve: (household) => household.givingPeople,
      }),
      givingSummary: t.field({
        nullable: true,
        type: profileGivingSummaryType,
        resolve: (household) => household.givingSummary,
      }),
      lastSyncedAt: t.string({
        resolve: (household) => household.lastSyncedAt.toISOString(),
      }),
      members: t.field({
        type: [householdMembershipType],
        resolve: (household) => household.members,
      }),
      name: t.exposeString("name"),
      rockId: t.exposeInt("rockId"),
      staffTasks: t.field({
        type: [profileTaskType],
        resolve: (household) => household.staffTasks,
      }),
    }),
  });

export function registerPeopleTypes() {
  builder.queryField("rockPerson", (t) =>
    t.field({
      args: {
        rockId: t.arg.int({ required: true }),
      },
      nullable: true,
      type: rockPersonProfileType,
      resolve: async (_root, args, context) => {
        const actor = requireStaffUser(context);
        const profile = await getRockPersonProfile(
          { rockId: args.rockId },
          actor,
        );

        if (!profile) {
          throwNotFound("Rock person");
        }

        return profile;
      },
    }),
  );

  builder.queryField("rockHousehold", (t) =>
    t.field({
      args: {
        rockId: t.arg.int({ required: true }),
      },
      nullable: true,
      type: rockHouseholdProfileType,
      resolve: async (_root, args, context) => {
        const actor = requireStaffUser(context);
        const profile = await getRockHouseholdProfile(
          { rockId: args.rockId },
          actor,
        );

        if (!profile) {
          throwNotFound("Rock household");
        }

        return profile;
      },
    }),
  );
}

function throwNotFound(label: string): never {
  throw new GraphQLError(`${label} was not found.`, {
    extensions: {
      code: "NOT_FOUND",
    },
  });
}
