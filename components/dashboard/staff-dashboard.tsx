import Link from "next/link";

import { HouseholdDonorChart } from "@/components/dashboard/household-donor-chart";
import type { LocalAppUser } from "@/lib/auth/types";
import type {
  HouseholdDonorTrend,
  HouseholdMovementKind,
  HouseholdMovementSummary,
} from "@/lib/giving/metrics";

type StaffDashboardProps = {
  householdDonorTrend: HouseholdDonorTrend;
  user: LocalAppUser;
};

export function StaffDashboard({
  householdDonorTrend,
  user,
}: StaffDashboardProps) {
  const months = householdDonorTrend.months;
  const latestCompletedMonth = months.at(-1);
  const previousCompletedMonth = months.at(-2);
  const peakMonth = months.reduce<MonthlyPeak | null>((peak, month) => {
    if (!peak || month.householdDonorCount > peak.householdDonorCount) {
      return month;
    }

    return peak;
  }, null);
  const latestDelta =
    (latestCompletedMonth?.householdDonorCount ?? 0) -
    (previousCompletedMonth?.householdDonorCount ?? 0);

  return (
    <div className="min-h-screen bg-app-background">
      <DashboardNav />
      <main className="grid w-full gap-6 px-7 py-7">
        <section className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid max-w-4xl gap-2">
              <h1 className="text-[32px] font-semibold leading-[1.12] tracking-normal text-app-foreground sm:text-[42px]">
                Dashboard
              </h1>
              <p className="max-w-3xl text-[13px] leading-6 text-app-muted">
                {formatNumber(latestCompletedMonth?.householdDonorCount ?? 0)}{" "}
                households gave in{" "}
                {latestCompletedMonth
                  ? formatMonthLabel(latestCompletedMonth.month)
                  : "the latest completed month"}
                ; {formatNumber(householdDonorTrend.atRiskHouseholdDonors)}{" "}
                households are at risk after recent activity.
              </p>
            </div>
          </div>

          <dl className="grid gap-3 md:grid-cols-3">
            <DashboardMetric
              label="Current households"
              value={latestCompletedMonth?.householdDonorCount ?? 0}
              detail={
                latestCompletedMonth
                  ? formatMonthLabel(latestCompletedMonth.month)
                  : "No complete month"
              }
            />
            <DashboardMetric
              label="At-risk households"
              value={householdDonorTrend.atRiskHouseholdDonors}
              detail="Active recently, not latest"
            />
            <DashboardMetric
              label="Peak month"
              value={peakMonth?.householdDonorCount ?? 0}
              detail={
                peakMonth ? formatMonthLabel(peakMonth.month) : "No month"
              }
            />
          </dl>
        </section>

        <section className="grid gap-4 rounded-[10px] border border-app-border bg-app-surface p-5 shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <h2 className="text-[20px] font-semibold text-app-foreground">
                Household donors by campus
              </h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-6 text-app-muted">
                Each stacked line shows one campus&apos;s contribution to the
                monthly household donor total. A household is counted once per
                campus month, even when multiple giving facts exist for that
                household.
              </p>
            </div>
            <TrendDelta value={latestDelta} />
          </div>

          <HouseholdDonorChart trend={householdDonorTrend} />

          <div className="grid gap-2 border-t border-app-border-faint pt-4 text-[12px] leading-5 text-app-muted sm:grid-cols-[1fr_auto] sm:items-center">
            <p>{householdDonorTrend.sourceExplanation}</p>
            <p className="font-mono uppercase text-app-faint">
              Role: {formatRole(user.role)}
            </p>
          </div>
        </section>

        <HouseholdMovementPanel
          atRiskHouseholds={householdDonorTrend.atRiskHouseholdDonors}
          movement={householdDonorTrend.movement}
        />
      </main>
    </div>
  );
}

type MonthlyPeak = HouseholdDonorTrend["months"][number];

const movementLabels: Record<HouseholdMovementKind, string> = {
  DROPPED: "Dropped",
  NEW: "New",
  REACTIVATED: "Reactivated",
  RETAINED: "Retained",
};

const movementDetails: Record<HouseholdMovementKind, string> = {
  DROPPED: "Gave in prior month, missing in latest",
  NEW: "First month in this window",
  REACTIVATED: "Returned after an inactive month",
  RETAINED: "Gave in both months",
};

function HouseholdMovementPanel({
  atRiskHouseholds,
  movement,
}: {
  atRiskHouseholds: number;
  movement: HouseholdMovementSummary;
}) {
  const cards: MovementCard[] = [
    {
      count: movement.counts.DROPPED,
      detail: movementDetails.DROPPED,
      key: "DROPPED",
      label: movementLabels.DROPPED,
      tone: "DROPPED",
    },
    {
      count: atRiskHouseholds,
      detail: "Active recently, not latest",
      key: "AT_RISK",
      label: "At-risk",
      tone: "AT_RISK",
    },
    {
      count: movement.counts.REACTIVATED,
      detail: movementDetails.REACTIVATED,
      key: "REACTIVATED",
      label: movementLabels.REACTIVATED,
      tone: "REACTIVATED",
    },
    {
      count: movement.counts.NEW,
      detail: movementDetails.NEW,
      key: "NEW",
      label: movementLabels.NEW,
      tone: "NEW",
    },
  ];

  return (
    <section className="grid gap-5 rounded-[10px] border border-app-border bg-app-surface p-5 shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <h2 className="text-[20px] font-semibold text-app-foreground">
            Household movement
          </h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-app-muted">
            Compares {formatMovementMonth(movement.latestMonth)} with{" "}
            {formatMovementMonth(movement.previousMonth)} and highlights the
            households most likely to need attention.
          </p>
        </div>
        <div className="rounded-[7px] border border-app-border bg-app-chip px-3 py-2 text-[12px] font-semibold text-app-muted">
          Latest complete month
        </div>
      </div>

      <dl className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => (
          <MovementMetric
            key={card.key}
            count={card.count}
            detail={card.detail}
            label={card.label}
            tone={card.tone}
          />
        ))}
      </dl>
    </section>
  );
}

type MovementCard = {
  count: number;
  detail: string;
  key: string;
  label: string;
  tone: MovementTone;
};

function MovementMetric({
  count,
  detail,
  label,
  tone,
}: {
  count: number;
  detail: string;
  label: string;
  tone: MovementTone;
}) {
  return (
    <div className={`rounded-[8px] border p-4 ${movementTone(tone)}`}>
      <dt className="text-[12px] font-semibold">{label}</dt>
      <dd className="mt-2 text-[28px] font-semibold leading-none tabular-nums">
        {formatNumber(count)}
      </dd>
      <dd className="mt-2 text-[12px] leading-5 opacity-80">{detail}</dd>
    </div>
  );
}

type MovementTone = HouseholdMovementKind | "AT_RISK";

function movementTone(kind: MovementTone) {
  const tones = {
    AT_RISK: "border-amber-700 bg-amber-50 text-amber-950",
    DROPPED: "border-rose-700 bg-rose-50 text-rose-950",
    NEW: "border-sky-700 bg-sky-50 text-sky-950",
    REACTIVATED: "border-emerald-700 bg-emerald-50 text-emerald-950",
    RETAINED: "border-app-border bg-app-chip text-app-foreground",
  } satisfies Record<MovementTone, string>;

  return tones[kind];
}

function DashboardNav() {
  const links = [
    { href: "/", label: "Dashboard", active: true },
    { href: "/people", label: "People", active: false },
    { href: "/households", label: "Households", active: false },
    { href: "/sync", label: "Sync", active: false },
  ];

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
        <nav
          aria-label="Primary"
          className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[12.5px]"
        >
          {links.map((link) => (
            <Link
              aria-current={link.active ? "page" : undefined}
              className={
                link.active
                  ? "rounded-[6px] bg-app-chip px-3 py-1.5 font-semibold text-app-foreground"
                  : "rounded-[6px] px-3 py-1.5 font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/25"
              }
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

function DashboardMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_1px_2px_rgba(150,140,120,0.12)]">
      <dt className="text-[12px] font-semibold text-app-muted">{label}</dt>
      <dd className="mt-2 text-[30px] font-semibold leading-none tabular-nums text-app-foreground">
        {formatNumber(value)}
      </dd>
      <dd className="mt-2 text-[12px] leading-5 text-app-faint">{detail}</dd>
    </div>
  );
}

function TrendDelta({ value }: { value: number }) {
  const tone =
    value > 0
      ? "border-emerald-700 bg-emerald-50 text-emerald-900"
      : value < 0
        ? "border-amber-700 bg-amber-50 text-amber-900"
        : "border-app-border bg-app-chip text-app-muted";
  const label =
    value > 0
      ? `+${formatNumber(value)}`
      : value < 0
        ? formatNumber(value)
        : "0";

  return (
    <div
      className={`inline-flex min-h-9 w-fit items-center gap-2 rounded-[6px] border px-3 text-[13px] font-semibold ${tone}`}
    >
      <span>{label}</span>
      <span className="text-[12px] font-medium">vs prior complete month</span>
    </div>
  );
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatMovementMonth(value: string | null) {
  return value ? formatMonthLabel(value) : "the selected month";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRole(role: LocalAppUser["role"]) {
  return role.replace("_", " ");
}
