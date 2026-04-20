import { GraphQLError } from "graphql";
import type {
  GiftReliabilityKind,
  Prisma,
  PrismaClient,
  StaffTaskPriority,
  StaffTaskStatus,
} from "@prisma/client";

import {
  canSeeGivingAmounts,
  canSeeIndividualGivingAggregates,
  hasPermission,
} from "@/lib/auth/roles";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import {
  getHouseholdGivingSummary,
  getPersonGivingSummary,
  type GivingSummary,
} from "@/lib/giving/metrics";
import {
  getPersonPledgeEditor,
  type PersonPledgeEditor,
} from "@/lib/giving/pledges";
import { rockPersonPhotoPath } from "@/lib/rock/photos";

const PROFILE_TASK_LIMIT = 8;

export type ProfileCampus = {
  rockId: number;
  name: string;
  shortCode: string | null;
};

export type ProfileHouseholdSummary = {
  rockId: number;
  name: string;
  active: boolean;
  archived: boolean;
  campus: ProfileCampus | null;
  lastSyncedAt: Date;
};

export type ProfilePersonSummary = {
  rockId: number;
  displayName: string;
  firstName: string | null;
  nickName: string | null;
  lastName: string | null;
  email: string | null;
  emailActive: boolean | null;
  deceased: boolean;
  photoUrl: string | null;
  primaryCampus: ProfileCampus | null;
  primaryHousehold: ProfileHouseholdSummary | null;
};

export type HouseholdMembershipProfile = {
  rockId: number;
  groupRole: string | null;
  status: string | null;
  archived: boolean;
  household: ProfileHouseholdSummary;
  person?: ProfilePersonSummary;
};

export type ProfileTask = {
  id: string;
  title: string;
  status: StaffTaskStatus;
  priority: StaffTaskPriority;
  assignedToName: string | null;
  assignedToEmail: string | null;
  personRockId: number | null;
  householdRockId: number | null;
  dueAt: Date | null;
  createdAt: Date;
};

export type ProfileGivingSummary = GivingSummary & {
  reliabilityKinds: GiftReliabilityKind[];
  source: "HOUSEHOLD" | "PERSON";
};

export type RockPersonProfile = ProfilePersonSummary & {
  givingId: string | null;
  givingLeaderRockId: number | null;
  primaryAliasRockId: number | null;
  recordStatus: string | null;
  givingHousehold: ProfileHouseholdSummary | null;
  householdMemberships: HouseholdMembershipProfile[];
  staffTasks: ProfileTask[];
  givingSummary: ProfileGivingSummary | null;
  pledgeEditor: PersonPledgeEditor | null;
  amountsHidden: boolean;
  lastSyncedAt: Date;
};

export type RockHouseholdProfile = ProfileHouseholdSummary & {
  members: HouseholdMembershipProfile[];
  givingPeople: ProfilePersonSummary[];
  staffTasks: ProfileTask[];
  givingSummary: ProfileGivingSummary | null;
  amountsHidden: boolean;
  lastSyncedAt: Date;
};

type ProfileClient = Pick<
  PrismaClient,
  | "givingFact"
  | "givingPledge"
  | "rockFinancialAccount"
  | "rockHousehold"
  | "rockPerson"
  | "staffTask"
>;

type CampusRow = {
  name: string;
  rockId: number;
  shortCode: string | null;
};

type HouseholdSummaryRow = {
  active: boolean;
  archived: boolean;
  campus: CampusRow | null;
  lastSyncedAt: Date;
  name: string;
  rockId: number;
};

type PersonSummaryRow = {
  deceased: boolean;
  email: string | null;
  emailActive: boolean | null;
  firstName: string | null;
  lastName: string | null;
  nickName: string | null;
  photoRockId: number | null;
  primaryCampus: CampusRow | null;
  primaryHousehold?: HouseholdSummaryRow | null;
  rockId: number;
};

const personProfileSelect = {
  deceased: true,
  email: true,
  emailActive: true,
  firstName: true,
  givingGroupRockId: true,
  givingHousehold: {
    select: householdSummarySelect(),
  },
  givingId: true,
  givingLeaderRockId: true,
  householdMembers: {
    orderBy: [{ archived: "asc" }, { rockId: "asc" }],
    select: {
      archived: true,
      groupMemberStatus: true,
      groupRole: {
        select: {
          name: true,
        },
      },
      household: {
        select: householdSummarySelect(),
      },
      rockId: true,
    },
  },
  lastSyncedAt: true,
  lastSyncRunId: true,
  lastName: true,
  nickName: true,
  photoRockId: true,
  primaryAliasRockId: true,
  primaryCampus: {
    select: campusSelect(),
  },
  primaryFamilyRockId: true,
  primaryHousehold: {
    select: householdSummarySelect(),
  },
  recordStatus: {
    select: {
      value: true,
    },
  },
  rockId: true,
} satisfies Prisma.RockPersonSelect;

type PersonProfileRow = Prisma.RockPersonGetPayload<{
  select: typeof personProfileSelect;
}>;

const householdProfileSelect = {
  ...householdSummarySelect(),
  givingPeople: {
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { rockId: "asc" }],
    select: personSummarySelect(),
  },
  members: {
    orderBy: [{ archived: "asc" }, { rockId: "asc" }],
    select: {
      archived: true,
      groupMemberStatus: true,
      groupRole: {
        select: {
          name: true,
        },
      },
      person: {
        select: personSummarySelect(),
      },
      rockId: true,
    },
  },
} satisfies Prisma.RockHouseholdSelect;

export async function getRockPersonProfile(
  input: { rockId: number },
  actor: LocalAppUser,
  client: ProfileClient = prisma,
): Promise<RockPersonProfile | null> {
  assertCanReadProfiles(actor);
  assertPositiveRockId(input.rockId, "Rock person ID");

  const person = await client.rockPerson.findUnique({
    select: personProfileSelect,
    where: {
      rockId: input.rockId,
    },
  });

  if (!person) {
    return null;
  }

  const [staffTasks, givingSummary, pledgeEditor] = await Promise.all([
    findProfileTasks({ personRockId: input.rockId }, client),
    getVisiblePersonGivingSummary(person, actor, client),
    getPersonPledgeEditor(input.rockId, actor, client as PrismaClient),
  ]);

  return {
    ...mapPersonSummary(person),
    givingHousehold: person.givingHousehold
      ? mapHouseholdSummary(person.givingHousehold)
      : null,
    givingId: person.givingId,
    givingLeaderRockId: person.givingLeaderRockId,
    givingSummary,
    pledgeEditor,
    householdMemberships: person.householdMembers.map((membership) => ({
      archived: membership.archived,
      groupRole: membership.groupRole?.name ?? null,
      household: mapHouseholdSummary(membership.household),
      rockId: membership.rockId,
      status: membershipStatusLabel(membership.groupMemberStatus),
    })),
    amountsHidden: !canSeeGivingAmounts(actor.role),
    lastSyncedAt: person.lastSyncedAt,
    primaryAliasRockId: person.primaryAliasRockId,
    recordStatus: person.recordStatus?.value ?? null,
    staffTasks,
  };
}

async function getVisiblePersonGivingSummary(
  person: PersonProfileRow,
  actor: LocalAppUser,
  client: ProfileClient,
) {
  if (!canSeeIndividualGivingAggregates(actor.role)) {
    return null;
  }

  const personSummary = await getPersonGivingSummary(
    person.rockId,
    client as PrismaClient,
  );

  if (
    personSummary.monthsWithGiving > 0 ||
    !person.givingHousehold ||
    !hasAdultHouseholdMembership(person.householdMembers)
  ) {
    return withGivingSummarySource(personSummary, "PERSON");
  }

  const householdSummary = await getHouseholdGivingSummary(
    person.givingHousehold.rockId,
    client as PrismaClient,
  );

  return householdSummary.monthsWithGiving > 0
    ? withGivingSummarySource(householdSummary, "HOUSEHOLD")
    : withGivingSummarySource(personSummary, "PERSON");
}

function withGivingSummarySource(
  summary: GivingSummary,
  source: ProfileGivingSummary["source"],
): ProfileGivingSummary {
  return {
    ...summary,
    source,
  };
}

function hasAdultHouseholdMembership(
  memberships: Array<{ groupRole: { name: string } | null }>,
) {
  return memberships.some((membership) => {
    return householdRoleRank(membership.groupRole?.name ?? null) === 0;
  });
}

export async function getRockHouseholdProfile(
  input: { rockId: number },
  actor: LocalAppUser,
  client: ProfileClient = prisma,
): Promise<RockHouseholdProfile | null> {
  assertCanReadProfiles(actor);
  assertPositiveRockId(input.rockId, "Rock household ID");

  const household = await client.rockHousehold.findUnique({
    select: householdProfileSelect,
    where: {
      rockId: input.rockId,
    },
  });

  if (!household) {
    return null;
  }

  const [staffTasks, givingSummary] = await Promise.all([
    findProfileTasks({ householdRockId: input.rockId }, client),
    canSeeGivingAmounts(actor.role)
      ? getHouseholdGivingSummary(input.rockId, client as PrismaClient).then(
          (summary) => withGivingSummarySource(summary, "HOUSEHOLD"),
        )
      : null,
  ]);

  return {
    ...mapHouseholdSummary(household),
    amountsHidden: !canSeeGivingAmounts(actor.role),
    givingPeople: household.givingPeople.map(mapPersonSummary),
    givingSummary,
    members: household.members
      .map((membership) => ({
        archived: membership.archived,
        groupRole: membership.groupRole?.name ?? null,
        person: mapPersonSummary(membership.person),
        rockId: membership.rockId,
        status: membershipStatusLabel(membership.groupMemberStatus),
        household: mapHouseholdSummary(household),
      }))
      .sort(compareHouseholdMembershipProfiles),
    staffTasks,
  };
}

function assertCanReadProfiles(actor: LocalAppUser) {
  if (
    !hasPermission(actor.role, "people:read_limited") &&
    !hasPermission(actor.role, "people:read_care_context")
  ) {
    throw new GraphQLError(
      "You do not have permission to view Rock profiles.",
      {
        extensions: {
          code: "FORBIDDEN",
        },
      },
    );
  }
}

function assertPositiveRockId(value: number, label: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new GraphQLError(`${label} must be a positive Rock id.`, {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }
}

async function findProfileTasks(
  where: { personRockId?: number; householdRockId?: number },
  client: ProfileClient,
) {
  return (
    await client.staffTask.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      select: {
        assignedTo: {
          select: {
            email: true,
            name: true,
          },
        },
        createdAt: true,
        dueAt: true,
        householdRockId: true,
        id: true,
        personRockId: true,
        priority: true,
        status: true,
        title: true,
      },
      take: PROFILE_TASK_LIMIT,
      where,
    })
  ).map((task) => ({
    assignedToEmail: task.assignedTo?.email ?? null,
    assignedToName: task.assignedTo?.name ?? null,
    createdAt: task.createdAt,
    dueAt: task.dueAt,
    householdRockId: task.householdRockId,
    id: task.id,
    personRockId: task.personRockId,
    priority: task.priority,
    status: task.status,
    title: task.title,
  }));
}

function mapPersonSummary(person: PersonSummaryRow) {
  return {
    deceased: person.deceased,
    displayName: displayName(person),
    email: person.email,
    emailActive: person.emailActive,
    firstName: person.firstName,
    lastName: person.lastName,
    nickName: person.nickName,
    photoUrl: rockPersonPhotoPath(person.photoRockId),
    primaryCampus: person.primaryCampus
      ? mapCampus(person.primaryCampus)
      : null,
    primaryHousehold: person.primaryHousehold
      ? mapHouseholdSummary(person.primaryHousehold)
      : null,
    rockId: person.rockId,
  };
}

function mapHouseholdSummary(household: HouseholdSummaryRow) {
  return {
    active: household.active,
    archived: household.archived,
    campus: household.campus ? mapCampus(household.campus) : null,
    lastSyncedAt: household.lastSyncedAt,
    name: household.name,
    rockId: household.rockId,
  };
}

function mapCampus(campus: CampusRow) {
  return {
    name: campus.name,
    rockId: campus.rockId,
    shortCode: campus.shortCode,
  };
}

function displayName(person: {
  firstName: string | null;
  lastName: string | null;
  nickName: string | null;
}) {
  return (
    [person.nickName || person.firstName, person.lastName]
      .filter(Boolean)
      .join(" ") || "Unnamed Rock person"
  );
}

function membershipStatusLabel(status: number | null) {
  if (status === 0) return "Inactive";
  if (status === 1) return "Active";
  if (status === 2) return "Pending";
  return null;
}

function compareHouseholdMembershipProfiles(
  left: HouseholdMembershipProfile,
  right: HouseholdMembershipProfile,
) {
  return (
    householdRoleRank(left.groupRole) - householdRoleRank(right.groupRole) ||
    membershipDisplayName(left).localeCompare(
      membershipDisplayName(right),
      "en-US",
      {
        sensitivity: "base",
      },
    ) ||
    left.rockId - right.rockId
  );
}

function membershipDisplayName(membership: HouseholdMembershipProfile) {
  return membership.person?.displayName ?? "";
}

function householdRoleRank(role: string | null) {
  const normalized = role?.trim().toLowerCase();

  if (normalized === "adult") {
    return 0;
  }

  if (normalized === "child") {
    return 1;
  }

  return 2;
}

function campusSelect() {
  return {
    name: true,
    rockId: true,
    shortCode: true,
  } as const;
}

function householdSummarySelect() {
  return {
    active: true,
    archived: true,
    campus: {
      select: campusSelect(),
    },
    lastSyncedAt: true,
    name: true,
    rockId: true,
  } as const;
}

function personSummarySelect() {
  return {
    deceased: true,
    email: true,
    emailActive: true,
    firstName: true,
    lastName: true,
    nickName: true,
    photoRockId: true,
    primaryCampus: {
      select: campusSelect(),
    },
    primaryHousehold: {
      select: householdSummarySelect(),
    },
    rockId: true,
  } as const;
}
