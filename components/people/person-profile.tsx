import Link from "next/link";

import Image from "next/image";

import type {
  HouseholdMembershipProfile,
  ProfileGivingSummary,
  ProfileHouseholdSummary,
  ProfilePersonSummary,
  ProfileTask,
  RockPersonProfile,
} from "@/lib/people/profiles";
import { DelayedStickySummary } from "@/components/people/delayed-sticky-summary";

type PersonProfileProps = {
  profile: RockPersonProfile;
};

type RecordShellProps = {
  activeView: "person" | "household";
  children: React.ReactNode;
  header: React.ReactNode;
  householdHref?: string;
  householdName?: string;
  personHref?: string;
  personName?: string;
  stickySummary?: React.ReactNode;
  title: string;
};

type MemberRow = {
  archived?: boolean;
  deceased?: boolean;
  displayName: string;
  email?: string | null;
  emailActive?: boolean | null;
  href: string;
  role: string;
  rockId: number;
  status: string;
};

export function PersonProfile({ profile }: PersonProfileProps) {
  const role = roleName(profile.amountsHidden);
  const primaryHousehold = profile.primaryHousehold;
  const givingHouseholdDiffers =
    profile.givingHousehold &&
    primaryHousehold &&
    profile.givingHousehold.rockId !== primaryHousehold.rockId;

  return (
    <RecordShell
      activeView="person"
      header={<PersonHeader profile={profile} />}
      householdHref={
        primaryHousehold
          ? householdHrefForPerson(primaryHousehold.rockId, profile.rockId)
          : undefined
      }
      householdName={primaryHousehold?.name}
      stickySummary={<PersonStickySummary profile={profile} />}
      title={profile.displayName}
    >
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Section title="Identity details">
            <IdentityDetails profile={profile} />
          </Section>

          <Section title="Household & giving context">
            <HouseholdContextCard
              givingDiffers={Boolean(givingHouseholdDiffers)}
              givingHousehold={profile.givingHousehold}
              personRockId={profile.rockId}
              primaryHousehold={primaryHousehold}
            />
          </Section>

          <Section
            subtitle={householdMembershipSubtitle(profile.householdMemberships)}
            title="Household members"
          >
            <HouseholdMembershipList
              memberships={profile.householdMemberships}
              personRockId={profile.rockId}
            />
          </Section>

          <Section
            aside={
              <Badge tone="neutral">
                {openTaskCount(profile.staffTasks)} open
              </Badge>
            }
            title="Tasks"
          >
            <TasksTable
              emptyMessage="No tasks are linked to this person."
              tasks={profile.staffTasks}
            />
          </Section>

          <Section allowOverflow title="Giving summary">
            <GivingPanel
              hidden={profile.amountsHidden}
              summary={profile.givingSummary}
            />
          </Section>
        </div>

        <ProfileRail offset="belowStickySummary">
          <QuickFacts
            items={[
              [
                "Giving ID",
                profile.givingId ? (
                  <Mono key="giving">{profile.givingId}</Mono>
                ) : null,
              ],
              ["Campus", profile.primaryCampus?.name],
              [
                "Household",
                primaryHousehold ? (
                  <RecordLink
                    href={householdHrefForPerson(
                      primaryHousehold.rockId,
                      profile.rockId,
                    )}
                    key="household"
                  >
                    {primaryHousehold.name}
                  </RecordLink>
                ) : null,
              ],
              ["Role", profile.householdMemberships[0]?.groupRole],
              [
                "Email",
                <Badge
                  key="email"
                  subtle
                  tone={profile.emailActive === false ? "warn" : "active"}
                >
                  {profile.emailActive === false ? null : <StatusDot />}
                  {profile.emailActive === false ? "Inactive" : "Active"}
                </Badge>,
              ],
            ]}
            title="Quick facts"
          />
          <PermissionsPanel role={role} />
        </ProfileRail>
      </div>
    </RecordShell>
  );
}

export function RecordShell({
  activeView,
  children,
  header,
  householdHref,
  householdName,
  personHref,
  personName,
  stickySummary,
  title,
}: RecordShellProps) {
  return (
    <main className="min-h-screen bg-app-background text-app-foreground">
      <TopBar
        activeView={activeView}
        householdHref={householdHref}
        householdName={householdName}
        personHref={personHref}
        personName={personName}
        title={title}
      />

      {stickySummary ? (
        <DelayedStickySummary observeId="record-main-header">
          {stickySummary}
        </DelayedStickySummary>
      ) : null}

      <div className="mx-auto max-w-[1280px] px-7 pb-20 pt-7">
        <div className="mb-6" id="record-main-header">
          {header}
        </div>

        <ViewTabs
          activeView={activeView}
          householdHref={householdHref}
          personHref={personHref}
        />

        {children}
      </div>
    </main>
  );
}

function PersonStickySummary({ profile }: { profile: RockPersonProfile }) {
  const primaryHousehold = profile.primaryHousehold;

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <MiniPersonAvatar profile={profile} />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-app-faint">
        <span className="truncate text-[13.5px] font-semibold text-app-foreground">
          {profile.displayName}
        </span>
        <span>{profile.householdMemberships[0]?.groupRole ?? "Unknown"}</span>
        {primaryHousehold ? (
          <>
            <Separator />
            <RecordLink
              href={householdHrefForPerson(
                primaryHousehold.rockId,
                profile.rockId,
              )}
            >
              {primaryHousehold.name}
            </RecordLink>
          </>
        ) : null}
        <Separator />
        <time
          dateTime={profile.lastSyncedAt.toISOString()}
          title={formatDateTime(profile.lastSyncedAt)}
        >
          Synced {formatTimeSince(profile.lastSyncedAt)}
        </time>
      </div>
    </div>
  );
}

function MiniPersonAvatar({ profile }: { profile: RockPersonProfile }) {
  const initials = personInitials(profile);

  return (
    <div
      aria-hidden
      className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-app-border-strong bg-app-soft font-mono text-[10px] font-semibold text-app-muted"
    >
      {profile.photoUrl ? (
        <Image
          alt=""
          className="h-full w-full object-cover"
          height={28}
          src={profile.photoUrl}
          unoptimized
          width={28}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function TopBar({
  activeView,
  householdHref,
  householdName,
  personHref,
  personName,
  title,
}: {
  activeView: "person" | "household";
  householdHref?: string;
  householdName?: string;
  personHref?: string;
  personName?: string;
  title: string;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-app-border bg-[oklch(0.99_0.003_75_/_0.92)] backdrop-blur-md [backdrop-filter:saturate(1.4)_blur(8px)]">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-5 px-7 py-[10px]">
        <Link
          className="flex items-center gap-[10px] text-[13.5px] font-semibold text-app-foreground"
          href="/"
        >
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-app-foreground font-mono text-[11px] font-semibold text-app-background">
            Ab
          </span>
          <span>Abound</span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-2 text-[12.5px] text-app-faint">
          <Link
            className="text-app-muted hover:text-app-foreground"
            href="/people"
          >
            People
          </Link>
          <span>/</span>
          {activeView === "household" && personHref ? (
            <>
              <Link
                className="truncate text-app-muted hover:text-app-foreground"
                href={personHref}
              >
                {personName}
              </Link>
              <span>/</span>
            </>
          ) : null}
          {activeView === "person" || !householdHref ? (
            <span className="truncate text-app-muted">{title}</span>
          ) : (
            <Link
              className="truncate text-app-muted hover:text-app-foreground"
              href={householdHref}
            >
              {householdName}
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}

function PersonHeader({ profile }: { profile: RockPersonProfile }) {
  const primaryHousehold = profile.primaryHousehold;

  return (
    <div className="flex items-start gap-4">
      <PersonAvatar profile={profile} />
      <div className="min-w-0">
        <div className="mb-[10px] flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase text-app-faint">
            Person
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-[14px] gap-y-2">
          <h1 className="m-0 text-[28px] font-semibold leading-[1.15] tracking-[-0.3px] text-app-foreground">
            {profile.displayName}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-px">
            <Badge
              tone={profile.recordStatus === "Active" ? "active" : "inactive"}
            >
              <StatusDot
                tone={profile.recordStatus === "Active" ? "ok" : "off"}
              />
              {profile.recordStatus ?? "Unknown"}
            </Badge>
            {profile.deceased ? <Badge tone="archive">Deceased</Badge> : null}
            {profile.primaryCampus ? (
              <Badge tone="neutral">{profile.primaryCampus.name}</Badge>
            ) : null}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-[14px] gap-y-1 text-[12.5px] text-app-faint">
          <span>
            Role: {profile.householdMemberships[0]?.groupRole ?? "Unknown"}
          </span>
          {primaryHousehold ? (
            <>
              <Separator />
              <span>
                Household:{" "}
                <RecordLink
                  href={householdHrefForPerson(
                    primaryHousehold.rockId,
                    profile.rockId,
                  )}
                >
                  {primaryHousehold.name}
                </RecordLink>
              </span>
            </>
          ) : null}
          <Separator />
          <time
            dateTime={profile.lastSyncedAt.toISOString()}
            title={formatDateTime(profile.lastSyncedAt)}
          >
            Synced {formatTimeSince(profile.lastSyncedAt)}
          </time>
        </div>
      </div>
    </div>
  );
}

function PersonAvatar({ profile }: { profile: RockPersonProfile }) {
  const initials = personInitials(profile);

  return (
    <div
      aria-label={`${profile.displayName} profile picture`}
      className="mt-[18px] flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-app-border-strong bg-app-soft font-mono text-[15px] font-semibold text-app-muted shadow-[0_1px_2px_oklch(0.8_0.01_70_/_0.25)]"
      role="img"
    >
      {profile.photoUrl ? (
        <Image
          alt=""
          className="h-full w-full object-cover"
          height={56}
          src={profile.photoUrl}
          unoptimized
          width={56}
        />
      ) : (
        initials
      )}
    </div>
  );
}

export function HouseholdHeader({
  archived,
  avatarPeople = [],
  campusName,
  lastSyncedAt,
  name,
}: {
  archived: boolean;
  avatarPeople?: ProfilePersonSummary[];
  campusName: string | null;
  lastSyncedAt: Date;
  name: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <HouseholdAvatar name={name} people={avatarPeople} />
      <div className="min-w-0">
        <div className="mb-[10px] flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase text-app-faint">
            Household
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-[14px] gap-y-2">
          <h1 className="m-0 text-[28px] font-semibold leading-[1.15] tracking-[-0.3px] text-app-foreground">
            {name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-px">
            <Badge tone={archived ? "archive" : "active"}>
              <StatusDot tone={archived ? "off" : "ok"} />
              {archived ? "Archived in Rock" : "Active"}
            </Badge>
            {campusName ? <Badge tone="neutral">{campusName}</Badge> : null}
            <Badge tone="neutral">Family</Badge>
          </div>
        </div>
        <div className="mt-[10px] flex flex-wrap items-center gap-x-[14px] gap-y-1 text-[12.5px] text-app-faint">
          <time
            dateTime={lastSyncedAt.toISOString()}
            title={formatDateTime(lastSyncedAt)}
          >
            Synced {formatTimeSince(lastSyncedAt)}
          </time>
        </div>
      </div>
    </div>
  );
}

function HouseholdAvatar({
  name,
  people,
}: {
  name: string;
  people: ProfilePersonSummary[];
}) {
  const tiles = people.slice(0, 4);
  const gridClass =
    tiles.length <= 1
      ? "grid-cols-1"
      : tiles.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 grid-rows-2";

  return (
    <div
      aria-label={`${name} household members`}
      className={`mt-[18px] grid h-14 w-14 shrink-0 overflow-hidden rounded-[8px] border border-app-border-strong bg-app-soft shadow-[0_1px_2px_oklch(0.8_0.01_70_/_0.25)] ${gridClass}`}
      role="img"
    >
      {tiles.length > 0 ? (
        tiles.map((person) => (
          <HouseholdAvatarTile key={person.rockId} person={person} />
        ))
      ) : (
        <div className="flex h-full w-full items-center justify-center font-mono text-[15px] font-semibold text-app-muted">
          {householdInitials(name)}
        </div>
      )}
    </div>
  );
}

function HouseholdAvatarTile({ person }: { person: ProfilePersonSummary }) {
  return (
    <div className="flex min-h-0 min-w-0 items-center justify-center border-[0.5px] border-app-surface bg-app-chip font-mono text-[10px] font-semibold text-app-muted">
      {person.photoUrl ? (
        <Image
          alt=""
          className="h-full w-full object-cover"
          height={28}
          src={person.photoUrl}
          unoptimized
          width={28}
        />
      ) : (
        personInitials(person)
      )}
    </div>
  );
}

function ViewTabs({
  activeView,
  householdHref,
  personHref,
}: {
  activeView: "person" | "household";
  householdHref?: string;
  personHref?: string;
}) {
  return (
    <div className="mb-5 flex gap-1 border-b border-app-border">
      <Tab active={activeView === "person"} href={personHref}>
        Person
      </Tab>
      <Tab active={activeView === "household"} href={householdHref}>
        Household
      </Tab>
    </div>
  );
}

function Tab({
  active,
  children,
  href,
}: {
  active: boolean;
  children: React.ReactNode;
  href?: string;
}) {
  const className =
    "mb-[-1px] border-b-2 px-[14px] py-2 text-[13px] font-medium " +
    (active
      ? "border-app-accent text-app-foreground"
      : "border-transparent text-app-faint hover:text-app-foreground");

  if (href && !active) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }

  return <span className={className}>{children}</span>;
}

function Section({
  allowOverflow = false,
  aside,
  children,
  dense = false,
  subtitle,
  title,
}: {
  allowOverflow?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
  dense?: boolean;
  subtitle?: string;
  title: string;
}) {
  return (
    <section
      className={`rounded-[8px] border border-app-border bg-app-surface ${
        allowOverflow ? "overflow-visible" : "overflow-hidden"
      }`}
    >
      <header
        className={`flex items-start justify-between gap-4 border-b border-app-border-faint ${
          dense ? "px-[18px] py-3" : "px-5 pb-[14px] pt-4"
        }`}
      >
        <div className="min-w-0">
          <h3 className="m-0 text-[13px] font-semibold tracking-[0.1px] text-app-foreground">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-[12.5px] text-app-faint">{subtitle}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </header>
      <div
        className={`${
          dense ? "px-[18px] py-[14px]" : "px-5 py-[18px]"
        } ${allowOverflow ? "overflow-visible" : ""}`}
      >
        {children}
      </div>
    </section>
  );
}

function HouseholdContextCard({
  givingDiffers,
  givingHousehold,
  personRockId,
  primaryHousehold,
}: {
  givingDiffers: boolean;
  givingHousehold: ProfileHouseholdSummary | null;
  personRockId: number;
  primaryHousehold: ProfileHouseholdSummary | null;
}) {
  if (!primaryHousehold) {
    return (
      <EmptyState>
        No synced household found for this person.
        <br />
        <span className="text-[12.5px]">
          Rock may not have a primary family for this person, or the latest sync
          may not include it yet.
        </span>
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div>
        <Label>Primary Household</Label>
        <RecordLink
          href={householdHrefForPerson(primaryHousehold.rockId, personRockId)}
        >
          {primaryHousehold.name}
        </RecordLink>
      </div>
      <div>
        <Label>Giving Household</Label>
        {givingHousehold ? (
          <>
            <RecordLink
              href={householdHrefForPerson(
                givingHousehold.rockId,
                personRockId,
              )}
            >
              {givingHousehold.name}
            </RecordLink>
          </>
        ) : (
          <p className="text-[12.5px] text-app-faint">
            No giving household found.
          </p>
        )}
        {givingDiffers ? (
          <div className="mt-[10px] rounded-[4px] border border-[oklch(0.88_0.05_70)] bg-[oklch(0.97_0.03_75)] px-[10px] py-2 text-[12px] text-[oklch(0.45_0.09_55)]">
            Giving household differs from primary household.
            <br />
            <span className="text-app-faint">
              Giving follows the synced giving household assignment.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HouseholdMembershipList({
  memberships,
  personRockId,
}: {
  memberships: HouseholdMembershipProfile[];
  personRockId: number;
}) {
  if (!memberships.length) {
    return (
      <p className="text-[13px] text-app-faint">
        No household memberships were synced.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[6px] border border-app-border-faint bg-app-surface">
      {memberships.map((membership, index) => (
        <Link
          className={`block px-4 py-3 text-[13px] transition-colors hover:bg-app-soft ${
            index === memberships.length - 1
              ? ""
              : "border-b border-app-border-faint"
          }`}
          href={householdHrefForPerson(
            membership.household.rockId,
            personRockId,
          )}
          key={membership.rockId}
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="truncate font-medium text-app-accent">
                {membership.household.name}
              </span>
              {membership.archived ? (
                <Badge subtle tone="archive">
                  Archived
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-[12.5px] text-app-faint">
              {membership.groupRole ?? "Unknown role"} -{" "}
              {membership.status ?? "Unknown status"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function IdentityDetails({ profile }: { profile: RockPersonProfile }) {
  return (
    <DefinitionGrid
      columns={2}
      items={[
        ["First name", profile.firstName],
        ["Nickname", profile.nickName],
        ["Last name", profile.lastName],
        [
          "Email",
          <div
            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 leading-[1.4]"
            key="email"
          >
            <span className="min-w-0 max-w-full truncate">
              {profile.email ?? "-"}
            </span>
            {profile.emailActive === false ? (
              <Badge subtle tone="warn">
                Inactive
              </Badge>
            ) : null}
          </div>,
        ],
        [
          "Giving ID",
          profile.givingId ? (
            <Mono key="giving">{profile.givingId}</Mono>
          ) : null,
        ],
        ["Record status", profile.recordStatus],
        [
          "Household member status",
          profile.householdMemberships[0]
            ? `${profile.householdMemberships[0].status ?? "Unknown"}${
                profile.householdMemberships[0].archived ? " (archived)" : ""
              }`
            : null,
        ],
      ]}
    />
  );
}

function DefinitionGrid({
  columns,
  items,
}: {
  columns: 2 | 3;
  items: Array<[string, React.ReactNode]>;
}) {
  return (
    <dl
      className={`m-0 grid gap-x-8 gap-y-[14px] ${
        columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
      }`}
    >
      {items.map(([key, value]) => (
        <div className="min-w-0" key={key}>
          <dt className="mb-1 text-[11px] font-medium uppercase tracking-[0.2px] text-app-faint">
            {key}
          </dt>
          <dd className="m-0 min-w-0 text-[13.5px] text-app-foreground tabular-nums">
            {value ?? <span className="text-app-border-strong">-</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MemberTable({
  members,
  showEmail = false,
}: {
  members: MemberRow[];
  showEmail?: boolean;
}) {
  if (!members.length) {
    return (
      <p className="text-[13px] text-app-faint">
        No synced members were found for this household.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[6px] border border-app-border-faint">
      <div className="border-b border-app-border-faint bg-app-soft px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2px] text-app-faint">
        Members
      </div>
      {members.map((member, index) => (
        <MemberTableRow
          key={`${member.href}-${member.rockId}`}
          member={member}
          showEmail={showEmail}
          trailingBorder={index !== members.length - 1}
        />
      ))}
    </div>
  );
}

function MemberTableRow({
  member,
  showEmail,
  trailingBorder,
}: {
  member: MemberRow;
  showEmail: boolean;
  trailingBorder: boolean;
}) {
  return (
    <Link
      className={`grid gap-3 px-4 py-3 text-[13px] transition-colors hover:bg-app-soft md:grid-cols-[minmax(0,1fr)_auto] md:items-center ${
        trailingBorder ? "border-b border-app-border-faint" : ""
      }`}
      href={member.href}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-medium text-app-accent">
            {member.displayName}
          </span>
          {member.deceased ? (
            <Badge subtle tone="archive">
              Deceased
            </Badge>
          ) : null}
          {member.archived ? (
            <Badge subtle tone="archive">
              Archived
            </Badge>
          ) : null}
        </div>
        {showEmail ? (
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[12.5px] text-app-faint">
            <span className="min-w-0 truncate">
              {member.email ?? "No email"}
            </span>
            {member.emailActive === false ? (
              <Badge subtle tone="warn">
                Inactive
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end">
        <Badge subtle tone="neutral">
          {member.role}
        </Badge>
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-app-muted">
          <StatusDot tone={member.status === "Active" ? "ok" : "off"} />
          {member.status}
        </span>
      </div>
    </Link>
  );
}

function TasksTable({
  emptyMessage,
  onOpenPerson,
  showLinkedPerson = false,
  tasks,
}: {
  emptyMessage: string;
  onOpenPerson?: (task: ProfileTask) => React.ReactNode;
  showLinkedPerson?: boolean;
  tasks: ProfileTask[];
}) {
  if (!tasks.length) {
    return <p className="text-[13px] text-app-faint">{emptyMessage}</p>;
  }

  const open = tasks.filter((task) => !isDoneTask(task));
  const closed = tasks.filter(isDoneTask);
  const cols = showLinkedPerson
    ? "20px_minmax(220px,2.5fr)_90px_90px_110px_120px_100px"
    : "20px_minmax(220px,2.5fr)_90px_90px_120px_100px";

  return (
    <div className="overflow-x-auto rounded-[6px] border border-app-border-faint">
      <div className={`min-w-[760px] [--cols:${cols}]`}>
        <TaskHeader showLinkedPerson={showLinkedPerson} />
        {open.map((task) => (
          <TaskRow
            key={task.id}
            linkedPerson={onOpenPerson?.(task)}
            showLinkedPerson={showLinkedPerson}
            task={task}
          />
        ))}
        {closed.length > 0 ? (
          <div className="border-y border-app-border-faint bg-app-soft px-3 py-[7px] text-[11px] uppercase tracking-[0.3px] text-app-faint">
            Completed
          </div>
        ) : null}
        {closed.map((task) => (
          <TaskRow
            key={task.id}
            linkedPerson={onOpenPerson?.(task)}
            showLinkedPerson={showLinkedPerson}
            task={task}
          />
        ))}
      </div>
    </div>
  );
}

function TaskHeader({ showLinkedPerson }: { showLinkedPerson: boolean }) {
  return (
    <div className="grid grid-cols-[var(--cols)] gap-3 border-b border-app-border-faint bg-app-soft px-3 py-2 text-[11px] font-medium uppercase tracking-[0.2px] text-app-faint">
      <div />
      <div>Title</div>
      <div>Status</div>
      <div>Priority</div>
      {showLinkedPerson ? <div>Linked person</div> : null}
      <div>Due</div>
      <div className="text-right">Assignee</div>
    </div>
  );
}

function TaskRow({
  linkedPerson,
  showLinkedPerson,
  task,
}: {
  linkedPerson?: React.ReactNode;
  showLinkedPerson: boolean;
  task: ProfileTask;
}) {
  const done = isDoneTask(task);

  return (
    <div className="grid grid-cols-[var(--cols)] items-center gap-3 border-b border-app-border-faint px-3 py-[9px] text-[13px] last:border-b-0 hover:bg-app-soft">
      <span
        className={`flex h-[14px] w-[14px] items-center justify-center rounded-[3px] border-[1.5px] text-[10px] leading-none ${
          done
            ? "border-app-accent bg-app-accent text-white"
            : "border-app-border-strong"
        }`}
      >
        {done ? "✓" : null}
      </span>
      <div
        className={`min-w-0 truncate ${
          done
            ? "text-app-faint line-through"
            : "text-app-foreground no-underline"
        }`}
      >
        <Mono dim>{task.id}</Mono> &nbsp; {task.title}
      </div>
      <Badge subtle tone={done ? "inactive" : "accent"}>
        {formatEnum(task.status)}
      </Badge>
      <Badge subtle tone={task.priority === "HIGH" ? "high" : "neutral"}>
        {formatEnum(task.priority)}
      </Badge>
      {showLinkedPerson ? (
        <div className="min-w-0 truncate text-[12.5px] text-app-muted">
          {linkedPerson ?? <span className="text-app-border-strong">-</span>}
        </div>
      ) : null}
      <div className="text-[12.5px] text-app-muted tabular-nums">
        {task.dueAt ? formatDate(task.dueAt) : "No due date"}
      </div>
      <div className="text-right text-[12.5px] text-app-faint">
        {task.assignedToName ?? task.assignedToEmail ?? "Unassigned"}
      </div>
    </div>
  );
}

function GivingPanel({
  hidden,
  summary,
}: {
  hidden: boolean;
  summary: ProfileGivingSummary | null;
}) {
  if (hidden) {
    return <GivingHiddenState />;
  }

  if (!summary || summary.monthsWithGiving === 0) {
    return (
      <p className="text-[13px] text-app-faint">
        No gifts are linked to this record.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid items-end gap-6 md:grid-cols-4">
        <GivingStat
          big
          label="Last 12 months"
          value={formatCurrency(summary.lastTwelveMonthsTotal)}
        />
        <GivingStat
          label="Last gift"
          value={
            summary.lastGiftAmount
              ? formatCurrency(summary.lastGiftAmount)
              : "-"
          }
        />
        <GivingStat
          label="Last gift date"
          value={summary.lastGiftAt ? formatDate(summary.lastGiftAt) : "-"}
        />
        <GivingStat
          label="Active months"
          value={String(monthsWithRecentGiving(summary.monthlyGiving))}
        />
      </div>
      <MonthlyGivingChart months={summary.monthlyGiving} />
    </div>
  );
}

function MonthlyGivingChart({
  months,
}: {
  months: ProfileGivingSummary["monthlyGiving"];
}) {
  const rawMaxMonthAmount = Math.max(
    ...months.flatMap((month) => [
      Number(month.totalGiven),
      Number(month.previousTotalGiven),
    ]),
    0,
  );
  const maxMonthAmount = niceChartMax(rawMaxMonthAmount);
  const yAxisTicks = [
    { label: formatCompactCurrency(maxMonthAmount), position: "top" },
    { label: formatCompactCurrency(maxMonthAmount / 2), position: "middle" },
    { label: formatCompactCurrency(0), position: "bottom" },
  ] as const;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-end gap-4">
        <div className="flex items-center gap-4 text-[12px] text-app-faint">
          <ChartKey color="current" label="Current 12 months" />
          <ChartKey color="previous" label="Previous 12 months" />
        </div>
      </div>
      <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-2">
        <div className="relative h-[156px] text-right text-[11px] text-app-faint tabular-nums">
          {yAxisTicks.map((tick) => (
            <ChartAxisTick
              key={tick.position}
              label={tick.label}
              position={tick.position}
            />
          ))}
        </div>
        <div className="relative h-[180px] overflow-visible">
          <ChartGridLine position="top" />
          <ChartGridLine position="middle" />
          <ChartGridLine position="bottom" />
          <div className="relative z-10 grid h-full grid-cols-12 items-start gap-2">
            {months.map((month) => (
              <MonthlyGivingBar
                key={month.month}
                maxMonthAmount={maxMonthAmount}
                month={month}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartAxisTick({
  label,
  position,
}: {
  label: string;
  position: "bottom" | "middle" | "top";
}) {
  const positionClass = chartScalePositionClass(position);

  return (
    <div
      className={`absolute right-0 ${positionClass} ${
        position === "bottom" ? "translate-y-1/2" : "-translate-y-1/2"
      } leading-none`}
    >
      {label}
    </div>
  );
}

function ChartGridLine({
  position,
}: {
  position: "bottom" | "middle" | "top";
}) {
  const positionClass = chartScalePositionClass(position);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 ${positionClass} border-t border-app-border-faint`}
    />
  );
}

function chartScalePositionClass(position: "bottom" | "middle" | "top") {
  return {
    bottom: "top-[156px]",
    middle: "top-[78px]",
    top: "top-0",
  }[position];
}

function ChartKey({
  color,
  label,
}: {
  color: "current" | "previous";
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className={
          color === "current"
            ? "h-2.5 w-2.5 rounded-[2px] bg-app-accent"
            : "h-2.5 w-2.5 rounded-[2px] bg-app-border-strong"
        }
      />
      {label}
    </span>
  );
}

function MonthlyGivingBar({
  maxMonthAmount,
  month,
}: {
  maxMonthAmount: number;
  month: ProfileGivingSummary["monthlyGiving"][number];
}) {
  const amount = Number(month.totalGiven);
  const previousAmount = Number(month.previousTotalGiven);
  const currentHeight = barHeight(amount, maxMonthAmount);
  const previousHeight = barHeight(previousAmount, maxMonthAmount);
  const currentLabel = `${formatMonthLabel(month.month)}: ${formatCurrency(
    month.totalGiven,
  )}`;
  const previousLabel = `${formatMonthLabel(
    month.previousMonth,
  )}: ${formatCurrency(month.previousTotalGiven)}`;

  return (
    <div
      aria-label={`${formatMonthLabel(
        month.month,
      )} giving comparison. Current: ${formatCurrency(
        month.totalGiven,
      )} across ${month.giftCount} gift${
        month.giftCount === 1 ? "" : "s"
      }. Previous: ${formatCurrency(month.previousTotalGiven)} across ${
        month.previousGiftCount
      } gift${month.previousGiftCount === 1 ? "" : "s"}.`}
      className="group relative flex h-full min-w-0 flex-col items-center gap-2 outline-none"
      role="img"
      tabIndex={0}
    >
      <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[180px] -translate-x-1/2 rounded-[6px] border border-app-border bg-app-surface px-3 py-2 text-left opacity-0 shadow-[0_8px_24px_oklch(0.25_0.01_60_/_0.12)] transition-opacity group-focus:opacity-100 group-hover:opacity-100">
        <div className="mb-1 text-[11px] font-semibold text-app-foreground">
          {formatMonthLabel(month.month)}
        </div>
        <div className="flex items-center justify-between gap-4 text-[11.5px] text-app-muted">
          <span>Current</span>
          <span className="font-medium text-app-foreground tabular-nums">
            {formatCurrency(month.totalGiven)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11.5px] text-app-faint">
          <span>Previous</span>
          <span className="font-medium tabular-nums">
            {formatCurrency(month.previousTotalGiven)}
          </span>
        </div>
      </div>
      <div className="flex h-[156px] w-full items-end justify-center gap-1 border-b border-app-border">
        <div
          aria-hidden
          className="relative w-[42%] rounded-t-[4px] bg-app-border-faint transition-colors group-hover:bg-app-border"
          style={{ height: `${previousHeight}%` }}
          title={previousLabel}
        >
          {previousAmount > 0 ? (
            <div className="absolute inset-0 rounded-t-[4px] bg-app-border-strong" />
          ) : null}
        </div>
        <div
          aria-hidden
          className="relative w-[42%] rounded-t-[4px] bg-app-accent/15 transition-colors group-hover:bg-app-accent/25"
          style={{ height: `${currentHeight}%` }}
          title={currentLabel}
        >
          {amount > 0 ? (
            <div className="absolute inset-0 rounded-t-[4px] bg-app-accent" />
          ) : null}
        </div>
      </div>
      <div className="text-[11px] font-medium text-app-faint tabular-nums">
        {formatMonthShort(month.month)}
      </div>
    </div>
  );
}

function barHeight(amount: number, maxMonthAmount: number) {
  if (amount <= 0 || maxMonthAmount <= 0) {
    return 0;
  }

  return Math.max((amount / maxMonthAmount) * 100, 3);
}

function niceChartMax(value: number) {
  if (value <= 0) {
    return 0;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const rounded =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return rounded * magnitude;
}

function GivingHiddenState() {
  return (
    <div className="flex items-start gap-[14px] rounded-[6px] border border-dashed border-app-border-strong bg-app-soft px-[18px] py-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] border border-app-border bg-app-surface text-app-faint">
        <svg
          fill="none"
          height="14"
          stroke="currentColor"
          strokeWidth="1.7"
          viewBox="0 0 24 24"
          width="14"
        >
          <rect height="10" rx="2" width="16" x="4" y="10" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <div>
        <h4 className="mb-[3px] text-[13.5px] font-semibold text-app-foreground">
          Giving amounts hidden
        </h4>
        <p className="max-w-[560px] text-[12.5px] leading-[1.55] text-app-faint">
          Your role can view care and household context, but not giving amounts
          or individual giving aggregates.
        </p>
      </div>
    </div>
  );
}

function GivingStat({
  big = false,
  label,
  value,
}: {
  big?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.3px] text-app-faint">
        {label}
      </div>
      <div
        className={
          big
            ? "text-[22px] font-semibold tracking-[-0.2px] text-app-foreground tabular-nums"
            : "text-[14px] font-medium text-app-foreground tabular-nums"
        }
      >
        {value}
      </div>
    </div>
  );
}

function ProfileRail({
  children,
  offset = "default",
}: {
  children: React.ReactNode;
  offset?: "default" | "belowStickySummary";
}) {
  const stickyClass = offset === "belowStickySummary" ? "top-[100px]" : "top-6";

  return (
    <aside className={`sticky ${stickyClass} flex flex-col gap-4 self-start`}>
      {children}
    </aside>
  );
}

function QuickFacts({
  items,
  title,
}: {
  items: Array<[string, React.ReactNode]>;
  title: string;
}) {
  return (
    <div className="rounded-[8px] border border-app-border bg-app-surface px-5 py-[18px]">
      <Label className="mb-[10px]">{title}</Label>
      <dl className="m-0 flex flex-col gap-[10px]">
        {items.map(([key, value]) => (
          <div className="flex justify-between gap-3" key={key}>
            <dt className="text-[12.5px] text-app-faint">{key}</dt>
            <dd className="m-0 text-right text-[12.5px] text-app-foreground">
              {value ?? <span className="text-app-border-strong">-</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function PermissionsPanel({ role }: { role: string }) {
  return (
    <div className="rounded-[8px] border border-app-border bg-app-surface px-5 py-[18px]">
      <Label className="mb-[10px]">Permissions</Label>
      <p className="text-[12.5px] leading-[1.55] text-app-muted">
        You are viewing as{" "}
        <strong className="font-medium text-app-foreground">{role}</strong>.
      </p>
      <p className="mt-1.5 text-[12px] leading-[1.55] text-app-faint">
        {role === "Pastoral Care"
          ? "Can see identity, household, and care tasks. Giving amounts intentionally hidden."
          : "Can see identity, household, tasks, and giving aggregates."}
      </p>
    </div>
  );
}

function Badge({
  children,
  subtle = false,
  tone = "neutral",
}: {
  children: React.ReactNode;
  subtle?: boolean;
  tone?:
    | "accent"
    | "active"
    | "archive"
    | "high"
    | "inactive"
    | "neutral"
    | "warn";
}) {
  const tones = {
    accent:
      "border-[oklch(0.87_0.04_255)] bg-[oklch(0.96_0.02_255)] text-[oklch(0.42_0.09_255)]",
    active:
      "border-[oklch(0.88_0.04_150)] bg-[oklch(0.96_0.03_150)] text-[oklch(0.38_0.08_150)]",
    archive:
      "border-[oklch(0.85_0.015_60)] bg-[oklch(0.94_0.01_60)] text-[oklch(0.42_0.02_60)]",
    high: "border-[oklch(0.87_0.05_30)] bg-[oklch(0.96_0.04_30)] text-[oklch(0.44_0.10_30)]",
    inactive: "border-app-border bg-app-chip text-app-faint",
    neutral: "border-app-border bg-app-chip text-app-muted",
    warn: "border-[oklch(0.87_0.06_70)] bg-[oklch(0.96_0.05_75)] text-[oklch(0.42_0.09_55)]",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border text-[11.5px] font-medium leading-[1.5] tracking-[0.1px] ${
        subtle ? "px-1.5 py-px" : "px-2 py-0.5"
      } ${tones}`}
    >
      {children}
    </span>
  );
}

function StatusDot({
  tone = "ok",
}: {
  tone?: "danger" | "off" | "ok" | "warn";
}) {
  const color = {
    danger: "bg-[oklch(0.58_0.15_25)]",
    off: "bg-[oklch(0.75_0.01_60)]",
    ok: "bg-[oklch(0.62_0.13_150)]",
    warn: "bg-[oklch(0.68_0.14_60)]",
  }[tone];

  return (
    <span
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${color}`}
    />
  );
}

function Mono({
  children,
  dim = false,
}: {
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <span
      className={`font-mono text-[0.92em] tracking-[-0.1px] ${
        dim ? "text-app-faint" : "text-inherit"
      }`}
    >
      {children}
    </span>
  );
}

function Label({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-[11px] font-medium uppercase tracking-[0.3px] text-app-faint ${className}`}
    >
      {children}
    </div>
  );
}

function RecordLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className="border-b border-transparent text-app-accent hover:border-current"
      href={href}
    >
      {children}
    </Link>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[6px] border border-dashed border-app-border-strong bg-app-soft p-[18px] text-[13px] text-app-faint">
      {children}
    </div>
  );
}

function Separator() {
  return <span className="text-app-border-strong">.</span>;
}

function roleName(amountsHidden: boolean) {
  return amountsHidden ? "Pastoral Care" : "Admin";
}

function householdHrefForPerson(householdRockId: number, personRockId: number) {
  return `/households/${householdRockId}?person=${personRockId}`;
}

function householdMembershipSubtitle(
  memberships: HouseholdMembershipProfile[],
) {
  if (memberships.length === 0) {
    return "No synced household membership.";
  }
  if (memberships.length === 1) {
    return "Primary household membership.";
  }

  return `${memberships.length} synced household memberships.`;
}

function personInitials(profile: {
  displayName: string;
  firstName: string | null;
  lastName: string | null;
}) {
  const initials = [profile.firstName, profile.lastName]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join("");

  if (initials) {
    return initials.slice(0, 2).toUpperCase();
  }

  return profile.displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function householdInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function openTaskCount(tasks: ProfileTask[]) {
  return tasks.filter((task) => !isDoneTask(task)).length;
}

function isDoneTask(task: ProfileTask) {
  return task.status.toLowerCase() === "done";
}

export function personSummaryToMemberRow(
  person: ProfilePersonSummary,
): MemberRow {
  return {
    archived: false,
    deceased: person.deceased,
    displayName: person.displayName,
    email: person.email,
    emailActive: person.emailActive,
    href: `/people/${person.rockId}`,
    role: "Member",
    rockId: person.rockId,
    status: "Active",
  };
}

export function membershipToPersonRow(
  membership: HouseholdMembershipProfile,
): MemberRow {
  const person = membership.person;

  return {
    archived: membership.archived,
    deceased: person?.deceased,
    displayName: person?.displayName ?? "Unknown person",
    email: person?.email,
    emailActive: person?.emailActive,
    href: person
      ? `/people/${person.rockId}`
      : `/households/${membership.household.rockId}`,
    role: membership.groupRole ?? "Unknown",
    rockId: person?.rockId ?? membership.rockId,
    status: membership.status ?? "Unknown",
  };
}

export {
  DefinitionGrid,
  GivingPanel,
  PermissionsPanel,
  ProfileRail,
  QuickFacts,
  Section,
  TasksTable,
};

export function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

function formatTimeSince(value: Date, now = new Date()) {
  const diffMs = Math.max(0, now.getTime() - value.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) {
    const minutes = Math.floor(diffMs / minute);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(diffMs / day);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value);
}

function formatMonthLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(monthStringToDate(value));
}

function formatMonthShort(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  }).format(monthStringToDate(value));
}

function monthStringToDate(value: string) {
  return new Date(`${value}-01T00:00:00.000Z`);
}

function monthsWithRecentGiving(months: ProfileGivingSummary["monthlyGiving"]) {
  return months.filter((month) => Number(month.totalGiven) > 0).length;
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(Number(value));
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    compactDisplay: "short",
    currency: "USD",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: "compact",
    style: "currency",
  }).format(value);
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}
