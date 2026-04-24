import Image from "next/image";
import Link from "next/link";

import { DropdownPanel } from "@/components/ui/dropdown-panel";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { prisma } from "@/lib/db/prisma";
import { rockPersonPhotoPath } from "@/lib/rock/photos";

type AppTopNavProps = {
  active: "communications" | "dashboard" | "households" | "people" | "settings";
  canManageSettings?: boolean;
  settingsActiveItem?: "funds" | "jobs" | "sync-status" | "users";
};

const links: Array<{
  active: AppTopNavProps["active"];
  href: string;
  label: string;
}> = [
  { active: "dashboard", href: "/", label: "Dashboard" },
  { active: "people", href: "/people", label: "People" },
  { active: "households", href: "/households", label: "Households" },
  {
    active: "communications",
    href: "/communications",
    label: "Communications",
  },
];

export async function AppTopNav({
  active,
  canManageSettings = false,
  settingsActiveItem,
}: AppTopNavProps) {
  const session = await auth0.getSession();
  const profile = await resolveNavProfile({
    sessionUser: session?.user,
    sessionEmail: session?.user.email,
    sessionName: session?.user.name,
  });

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 h-12 border-b border-app-border bg-[oklch(0.99_0.003_75_/_0.92)] backdrop-blur-md [backdrop-filter:saturate(1.4)_blur(8px)]">
        <div className="mx-auto flex h-full max-w-[1280px] flex-wrap items-center gap-5 px-7">
          <Link
            className="flex items-center gap-[10px] text-[13.5px] font-semibold text-app-foreground"
            href="/"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-app-foreground font-mono text-[11px] font-semibold text-app-background">
              Ab
            </span>
            <span>Abound</span>
          </Link>
          <nav
            aria-label="Primary"
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[12.5px]"
          >
            {links.map((link) => {
              const current = link.active === active;

              return (
                <Link
                  aria-current={current ? "page" : undefined}
                  className={
                    current
                      ? "inline-flex h-8 items-center rounded-[6px] bg-app-chip px-3 font-semibold text-app-foreground"
                      : "inline-flex h-8 items-center rounded-[6px] px-3 font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/25"
                  }
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
            {canManageSettings ? (
              <DropdownPanel
                align="left"
                openOnHover
                panelClassName="grid gap-1 rounded-[8px] border border-app-border bg-app-surface p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
                triggerClassName={
                  active === "settings"
                    ? "inline-flex h-8 items-center gap-1.5 rounded-[6px] bg-app-chip px-3 font-semibold text-app-foreground"
                    : "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-3 font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/25"
                }
                trigger={
                  <>
                    <span>Settings</span>
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5 transition-transform"
                      fill="none"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="m5 7.5 5 5 5-5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.6"
                      />
                    </svg>
                  </>
                }
                widthClassName="min-w-48"
              >
                <div className="grid gap-1">
                  <SettingsLink
                    active={settingsActiveItem === "funds"}
                    href="/settings/funds"
                    label="Funds"
                  />
                  <SettingsLink
                    active={settingsActiveItem === "jobs"}
                    href="/settings/jobs"
                    label="Jobs"
                  />
                  <SettingsLink
                    active={settingsActiveItem === "sync-status"}
                    href="/sync"
                    label="Sync status"
                  />
                  <SettingsLink
                    active={settingsActiveItem === "users"}
                    href="/settings/users"
                    label="Users"
                  />
                </div>
              </DropdownPanel>
            ) : null}
          </nav>
          <DropdownPanel
            align="right"
            panelClassName="grid gap-2 rounded-[8px] border border-app-border bg-app-surface p-2 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
            triggerClassName="inline-flex h-8 items-center gap-2 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[12.5px] font-semibold text-app-foreground transition hover:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/25"
            trigger={
              <>
                <ProfileAvatar
                  name={profile.name}
                  photoUrl={profile.photoUrl}
                  roundedClassName="rounded-full"
                  size={20}
                  textClassName="text-[10px]"
                />
                <span className="max-w-32 truncate">{profile.name}</span>
                <svg
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-app-muted"
                  fill="none"
                  viewBox="0 0 20 20"
                >
                  <path
                    d="m5 7.5 5 5 5-5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.6"
                  />
                </svg>
              </>
            }
            widthClassName="min-w-52"
          >
            <div className="grid gap-2">
              <ProfileSummaryCard
                email={profile.email}
                href={profile.profileHref}
                name={profile.name}
                photoUrl={profile.photoUrl}
              />
              <Link
                className="inline-flex min-h-8 items-center rounded-[6px] px-3 text-[12.5px] font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/25"
                href="/auth/logout"
              >
                Log out
              </Link>
            </div>
          </DropdownPanel>
        </div>
      </div>
      <div aria-hidden="true" className="h-12" />
    </>
  );
}

type NavProfile = {
  email: string | null;
  profileHref: string | null;
  name: string;
  photoUrl: string | null;
};

async function resolveNavProfile({
  sessionUser,
  sessionEmail,
  sessionName,
}: {
  sessionUser: unknown;
  sessionEmail?: string | null;
  sessionName?: string | null;
}): Promise<NavProfile> {
  const fallbackName = profileDisplayName(sessionName, sessionEmail);
  const fallbackEmail = normalizeText(sessionEmail);
  const accessState = await getCurrentAccessState(sessionUser);

  if (accessState.status !== "authorized") {
    return {
      email: fallbackEmail,
      profileHref: null,
      name: fallbackName,
      photoUrl: null,
    };
  }

  const rockId = parseRockPersonId(accessState.user.rockPersonId);
  const profileHref = rockId ? `/people/${rockId}` : null;

  if (rockId === null) {
    return {
      email: fallbackEmail,
      profileHref,
      name: fallbackName,
      photoUrl: null,
    };
  }

  const rockPerson = await prisma.rockPerson.findUnique({
    select: {
      email: true,
      firstName: true,
      lastName: true,
      nickName: true,
      photoRockId: true,
      rockId: true,
    },
    where: {
      rockId,
    },
  });

  if (!rockPerson) {
    return {
      email: fallbackEmail,
      profileHref,
      name: fallbackName,
      photoUrl: null,
    };
  }

  return {
    email: normalizeText(rockPerson.email) ?? fallbackEmail,
    profileHref,
    name: formatRockPersonName(rockPerson),
    photoUrl: rockPersonPhotoPath(rockPerson.photoRockId),
  };
}

function parseRockPersonId(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function profileDisplayName(name?: string | null, email?: string | null) {
  const normalizedName = normalizeText(name);

  if (normalizedName) {
    return normalizedName;
  }

  const normalizedEmail = normalizeText(email);

  if (normalizedEmail) {
    return normalizedEmail;
  }

  return "Profile";
}

function normalizeText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatRockPersonName(person: {
  firstName: string | null;
  lastName: string | null;
  nickName: string | null;
  rockId: number;
}) {
  const combined = [person.nickName || person.firstName, person.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  if (combined.length > 0) {
    return combined;
  }

  return `Person ${person.rockId}`;
}

function ProfileAvatar({
  name,
  photoUrl,
  roundedClassName,
  size,
  textClassName,
}: {
  name: string;
  photoUrl: string | null;
  roundedClassName: string;
  size: number;
  textClassName: string;
}) {
  const initials = initialsForName(name);

  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center overflow-hidden border border-app-border bg-app-chip font-semibold uppercase tracking-[0.04em] text-app-foreground ${roundedClassName} ${textClassName}`}
      style={{ height: size, width: size }}
    >
      {photoUrl ? (
        <Image
          alt=""
          className="h-full w-full object-cover"
          height={size}
          src={photoUrl}
          unoptimized
          width={size}
        />
      ) : (
        initials
      )}
    </span>
  );
}

function ProfileSummaryCard({
  email,
  href,
  name,
  photoUrl,
}: {
  email: string | null;
  href: string | null;
  name: string;
  photoUrl: string | null;
}) {
  const content = (
    <>
      <ProfileAvatar
        name={name}
        photoUrl={photoUrl}
        roundedClassName="rounded-[6px]"
        size={28}
        textClassName="text-[10px]"
      />
      <div className="grid min-w-0 gap-0.5">
        <p className="truncate text-[12.5px] font-semibold text-app-foreground">
          {name}
        </p>
        {email ? (
          <p className="truncate text-[11.5px] text-app-muted">{email}</p>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        className="flex items-center gap-2 rounded-[6px] border border-app-border-faint bg-app-background px-2.5 py-2 transition hover:border-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
        href={href}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-[6px] border border-app-border-faint bg-app-background px-2.5 py-2">
      {content}
    </div>
  );
}

function initialsForName(name: string) {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);

  if (words.length === 0) {
    return "PR";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2);
  }

  return `${words[0][0]}${words[1][0]}`;
}

function SettingsLink({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex min-h-8 items-center rounded-[6px] bg-app-chip px-3 text-[12.5px] font-semibold text-app-foreground"
          : "inline-flex min-h-8 items-center rounded-[6px] px-3 text-[12.5px] font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/25"
      }
      href={href}
    >
      {label}
    </Link>
  );
}
