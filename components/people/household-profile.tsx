import Link from "next/link";

import { GivingSummarySection } from "@/components/people/giving-summary-panel";
import type {
  ProfilePersonSummary,
  ProfileTask,
  RockHouseholdProfile,
} from "@/lib/people/profiles";
import {
  DefinitionGrid,
  HouseholdHeader,
  MemberTable,
  MiniHouseholdAvatar,
  PermissionsPanel,
  ProfileRail,
  QuickFacts,
  RecordShell,
  Section,
  TasksTable,
  membershipToPersonRow,
  personSummaryToMemberRow,
  serializeNullableGivingSummary,
} from "@/components/people/person-profile";

type HouseholdProfileProps = {
  currentPersonRockId?: number;
  profile: RockHouseholdProfile;
};

export function HouseholdProfile({
  currentPersonRockId,
  profile,
}: HouseholdProfileProps) {
  const role = profile.amountsHidden ? "Pastoral Care" : "Admin";
  const memberRows = profile.members.map(membershipToPersonRow);
  const givingRows = profile.givingPeople.map(personSummaryToMemberRow);
  const householdPersonIds = new Set(
    profile.members
      .map((membership) => membership.person?.rockId)
      .filter((rockId): rockId is number => Boolean(rockId)),
  );
  const givingDiffers =
    profile.givingPeople.length > 0 &&
    profile.givingPeople.some(
      (person) => !householdPersonIds.has(person.rockId),
    );
  const contextualPerson = findContextualPerson(profile, currentPersonRockId);
  const firstPerson =
    contextualPerson ?? profile.members[0]?.person ?? profile.givingPeople[0];
  const householdAvatarPeople = householdPeopleForAvatar(profile);

  return (
    <RecordShell
      activeView="household"
      header={
        <HouseholdHeader
          archived={profile.archived}
          avatarPeople={householdAvatarPeople}
          campusName={profile.campus?.name ?? null}
          name={profile.name}
        />
      }
      householdHref={`/households/${profile.rockId}`}
      householdName={profile.name}
      personHref={firstPerson ? `/people/${firstPerson.rockId}` : undefined}
      personName={firstPerson?.displayName}
      stickySummary={
        <HouseholdStickySummary
          avatarPeople={householdAvatarPeople}
          name={profile.name}
        />
      }
      title={profile.name}
    >
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Section title="Household details">
            <DefinitionGrid
              columns={3}
              items={[
                ["Household name", profile.name],
                ["Campus", profile.campus?.name],
                ["Group type", "Family"],
                ["Active", profile.archived ? "No (archived)" : "Yes"],
              ]}
            />
          </Section>

          <Section
            subtitle={`${profile.members.length} synced member${
              profile.members.length === 1 ? "" : "s"
            }.`}
            title="Members"
          >
            <MemberTable members={memberRows} showEmail />
          </Section>

          <Section
            aside={givingDiffers ? <WarningBadge /> : null}
            subtitle="People whose giving is assigned to this household."
            title="Giving group members"
          >
            {givingDiffers ? (
              <div className="mb-3 rounded-[4px] border border-[oklch(0.88_0.05_70)] bg-[oklch(0.97_0.03_75)] px-3 py-2 text-[12.5px] text-[oklch(0.45_0.09_55)]">
                Giving group differs from household membership. These roll up to
                this household in Rock giving reports.
              </div>
            ) : null}
            <MemberTable members={givingRows} />
          </Section>

          <Section
            aside={<OpenTasks tasks={profile.staffTasks} />}
            title="Tasks"
          >
            <TasksTable
              emptyMessage="No tasks are linked to this household."
              onOpenPerson={(task) => linkedPerson(profile, task)}
              showLinkedPerson
              tasks={profile.staffTasks}
            />
          </Section>

          <GivingSummarySection
            emptyRecordLabel="household"
            hidden={profile.amountsHidden}
            showHouseholdSourceNote={false}
            summary={serializeNullableGivingSummary(profile.givingSummary)}
            title="Household giving summary"
          />
        </div>

        <ProfileRail offset="belowStickySummary">
          <QuickFacts
            items={[
              ["Campus", profile.campus?.name],
              ["Members", String(profile.members.length)],
              [
                "Status",
                profile.archived ? (
                  <span key="archived">Archived</span>
                ) : (
                  <span key="active">Active</span>
                ),
              ],
            ]}
            title="Quick facts"
          />
          <QuickFacts
            items={profile.members.slice(0, 6).map((membership) => [
              membership.groupRole ?? "Unknown",
              membership.person ? (
                <Link
                  className="border-b border-transparent text-app-accent hover:border-current"
                  href={`/people/${membership.person.rockId}`}
                  key={membership.person.rockId}
                >
                  {membership.person.displayName}
                </Link>
              ) : (
                "Unknown person"
              ),
            ])}
            title="Members"
          />
          <PermissionsPanel lastSyncedAt={profile.lastSyncedAt} role={role} />
        </ProfileRail>
      </div>
    </RecordShell>
  );
}

function HouseholdStickySummary({
  avatarPeople,
  name,
}: {
  avatarPeople: ProfilePersonSummary[];
  name: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <MiniHouseholdAvatar name={name} people={avatarPeople} />
      <div className="flex min-w-0 flex-1 items-center">
        <span className="truncate text-[13.5px] font-semibold text-app-foreground">
          {name}
        </span>
      </div>
    </div>
  );
}

function OpenTasks({ tasks }: { tasks: ProfileTask[] }) {
  return (
    <span className="inline-flex whitespace-nowrap rounded-[4px] border border-app-border bg-app-chip px-2 py-0.5 text-[11.5px] font-medium leading-[1.5] tracking-[0.1px] text-app-muted">
      {tasks.filter((task) => task.status.toLowerCase() !== "done").length} open
    </span>
  );
}

function WarningBadge() {
  return (
    <span className="inline-flex whitespace-nowrap rounded-[4px] border border-[oklch(0.87_0.06_70)] bg-[oklch(0.96_0.05_75)] px-2 py-0.5 text-[11.5px] font-medium leading-[1.5] tracking-[0.1px] text-[oklch(0.42_0.09_55)]">
      Differs from household
    </span>
  );
}

function linkedPerson(profile: RockHouseholdProfile, task: ProfileTask) {
  if (!task.personRockId) {
    return null;
  }

  const person =
    profile.members.find(
      (membership) => membership.person?.rockId === task.personRockId,
    )?.person ??
    profile.givingPeople.find((givingPerson) => {
      return givingPerson.rockId === task.personRockId;
    });

  return person?.displayName ?? "Linked person";
}

function findContextualPerson(
  profile: RockHouseholdProfile,
  personRockId: number | undefined,
) {
  if (!personRockId) {
    return null;
  }

  return (
    profile.members.find(
      (membership) => membership.person?.rockId === personRockId,
    )?.person ??
    profile.givingPeople.find((person) => person.rockId === personRockId) ??
    null
  );
}

function householdPeopleForAvatar(profile: RockHouseholdProfile) {
  const people = new Map<number, ProfilePersonSummary>();

  for (const membership of profile.members) {
    if (membership.person) {
      people.set(membership.person.rockId, membership.person);
    }
  }

  for (const person of profile.givingPeople) {
    if (!people.has(person.rockId)) {
      people.set(person.rockId, person);
    }
  }

  return Array.from(people.values());
}
