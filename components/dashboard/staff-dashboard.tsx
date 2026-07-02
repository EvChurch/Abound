import Link from "next/link";

import { HouseholdDonorChart } from "@/components/dashboard/household-donor-chart";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { DropdownPanel } from "@/components/ui/dropdown-panel";
import { canSeeGivingAmounts, hasPermission } from "@/lib/auth/roles";
import type { LocalAppUser } from "@/lib/auth/types";
import type {
  ConnectionStatusLifecycleSummary,
  DashboardLifecycleKind,
  GivingPerAdult,
  HouseholdDonorTrend,
  LifecycleCounts,
} from "@/lib/giving/metrics";
import { CircleHelp } from "lucide-react";

type StaffDashboardProps = {
  givingPerAdult: GivingPerAdult;
  householdDonorTrend: HouseholdDonorTrend;
  user: LocalAppUser;
};

export function StaffDashboard({
  givingPerAdult,
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
      <AppTopNav
        active="dashboard"
        canManageSettings={hasPermission(user.role, "settings:manage")}
        canManageTools={hasPermission(user.role, "pledges:manage")}
      />
      <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-4 py-5 sm:px-7 sm:py-7">
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
          lifecycleCounts={householdDonorTrend.lifecycleCounts}
          lifecycleSummary={
            householdDonorTrend.growingConnectionStatusLifecycle
          }
          neverGivenConnectionStatusCount={
            householdDonorTrend.neverGivenConnectionStatusCount
          }
        />

        <GivingPerAdultPanel
          canSeeAmounts={canSeeGivingAmounts(user.role)}
          givingPerAdult={givingPerAdult}
        />
      </main>
    </div>
  );
}

type MonthlyPeak = HouseholdDonorTrend["months"][number];

function GivingPerAdultPanel({
  canSeeAmounts,
  givingPerAdult,
}: {
  canSeeAmounts: boolean;
  givingPerAdult: GivingPerAdult;
}) {
  return (
    <section className="grid gap-4 rounded-[10px] border border-app-border bg-app-surface p-5 shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
      <h2 className="text-[20px] font-semibold text-app-foreground">
        Giving per adult
      </h2>

      {canSeeAmounts ? (
        <dl className="grid gap-3 md:grid-cols-4">
          <DashboardMoneyMetric
            detail="Per active adult"
            label="Monthly average"
            value={givingPerAdult.monthlyAverage}
          />
          <DashboardMoneyMetric
            detail="Middle adult value"
            label="Monthly median"
            value={givingPerAdult.monthlyMedian}
          />
          <DashboardMoneyMetric
            detail="Active pledges"
            label="Average pledge"
            value={givingPerAdult.averagePledge}
          />
          <DashboardMoneyMetric
            detail="Active pledges"
            label="Median pledge"
            value={givingPerAdult.medianPledge}
          />
        </dl>
      ) : (
        <div className="rounded-[8px] border border-app-border bg-app-chip p-4">
          <p className="text-[13px] font-semibold text-app-foreground">
            Giving amounts hidden
          </p>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-app-muted">
            This metric includes giving totals, so only Admin and Finance roles
            can view giving per adult and pledge values.
          </p>
        </div>
      )}
    </section>
  );
}

const movementLabels: Record<DashboardLifecycleKind, string> = {
  AT_RISK: "At-risk",
  DROPPED: "Dropped",
  HEALTHY: "Healthy",
  LAPSED: "Lapsed",
  NEW: "New",
  NEVER_GIVEN: "Never given",
  REACTIVATED: "Reactivated",
};

const movementDetails: Record<DashboardLifecycleKind, string> = {
  AT_RISK: "Usually gave regularly, but has not given for 90-180 days.",
  DROPPED: "Usually gave regularly, but has not given for 180-270 days.",
  HEALTHY: "Has given within the last 90 days and has no warning signal.",
  LAPSED: "Has not given for over 270 days.",
  NEW: "First recorded gift was within the last 90 days.",
  NEVER_GIVEN: "No platform-fund giving activity is on record.",
  REACTIVATED: "Gave again after at least 180 quiet days.",
};

const neverGivenConnectionStatuses = ["Joining", "Attending", "Growing"];

function HouseholdMovementPanel({
  lifecycleCounts,
  lifecycleSummary,
  neverGivenConnectionStatusCount,
}: {
  lifecycleCounts: LifecycleCounts;
  lifecycleSummary: ConnectionStatusLifecycleSummary;
  neverGivenConnectionStatusCount: number;
}) {
  const growingLifecycleCounts = lifecycleSummary.lifecycleCounts;
  const cards: MovementCard[] = [
    {
      count: neverGivenConnectionStatusCount,
      detail: movementDetails.NEVER_GIVEN,
      growingCount: growingLifecycleCounts.NEVER_GIVEN,
      href: neverGivenPeopleHref(),
      key: "NEVER_GIVEN",
      label: movementLabels.NEVER_GIVEN,
      tone: "NEVER_GIVEN",
    },
    {
      count: lifecycleCounts.NEW,
      detail: movementDetails.NEW,
      growingCount: growingLifecycleCounts.NEW,
      href: "/people?lifecycle=NEW",
      key: "NEW",
      label: movementLabels.NEW,
      tone: "NEW",
    },
    {
      count: lifecycleCounts.HEALTHY,
      detail: movementDetails.HEALTHY,
      growingCount: growingLifecycleCounts.HEALTHY,
      href: "/people?lifecycle=HEALTHY",
      key: "HEALTHY",
      label: movementLabels.HEALTHY,
      tone: "HEALTHY",
    },
    {
      count: lifecycleCounts.AT_RISK,
      detail: movementDetails.AT_RISK,
      growingCount: growingLifecycleCounts.AT_RISK,
      href: "/people?lifecycle=AT_RISK",
      key: "AT_RISK",
      label: movementLabels.AT_RISK,
      tone: "AT_RISK",
    },
    {
      count: lifecycleCounts.DROPPED,
      detail: movementDetails.DROPPED,
      growingCount: growingLifecycleCounts.DROPPED,
      href: "/people?lifecycle=DROPPED",
      key: "DROPPED",
      label: movementLabels.DROPPED,
      tone: "DROPPED",
    },
    {
      count: lifecycleCounts.LAPSED,
      detail: movementDetails.LAPSED,
      growingCount: growingLifecycleCounts.LAPSED,
      href: "/people?lifecycle=LAPSED",
      key: "LAPSED",
      label: movementLabels.LAPSED,
      tone: "LAPSED",
    },
    {
      count: lifecycleCounts.REACTIVATED,
      detail: movementDetails.REACTIVATED,
      growingCount: growingLifecycleCounts.REACTIVATED,
      href: "/people?lifecycle=REACTIVATED",
      key: "REACTIVATED",
      label: movementLabels.REACTIVATED,
      tone: "REACTIVATED",
    },
  ];
  const totalLifecycleCount = cards.reduce(
    (total, card) => total + card.count,
    0,
  );

  return (
    <section className="grid gap-5 rounded-[10px] border border-app-border bg-app-surface p-5 shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
      <div>
        <h2 className="text-[20px] font-semibold text-app-foreground">
          Giving lifecycle
        </h2>
      </div>

      <div className="grid gap-3 sm:block sm:overflow-hidden sm:rounded-[8px] sm:border sm:border-app-border sm:bg-app-background">
        <div className="hidden grid-cols-[auto_minmax(0,1fr)_5.5rem_5.5rem_1.75rem] items-end gap-3 border-b border-app-border-faint bg-app-chip/60 px-3 py-2 sm:grid">
          <span aria-hidden="true" className="h-2.5 w-2.5" />
          <span aria-hidden="true" />
          <LifecycleColumnHeading label="Total" value={totalLifecycleCount} />
          <LifecycleColumnHeading
            label={lifecycleSummary.statusLabel}
            value={lifecycleSummary.totalPeople}
          />
          <span aria-hidden="true" />
        </div>
        {cards.map((card) => (
          <MovementRow
            key={card.key}
            count={card.count}
            detail={card.detail}
            growingPercentage={percentageOfTotal(
              card.growingCount,
              lifecycleSummary.totalPeople,
            )}
            growingCount={card.growingCount}
            href={card.href}
            label={card.label}
            tone={card.tone}
            totalPercentage={percentageOfTotal(card.count, totalLifecycleCount)}
          />
        ))}
      </div>
    </section>
  );
}

function LifecycleColumnHeading({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <span className="grid gap-1 text-right tabular-nums">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-app-faint">
        {label}
      </span>
      <span className="text-[20px] font-semibold leading-none text-app-foreground">
        {formatNumber(value)}
      </span>
    </span>
  );
}

type MovementCard = {
  count: number;
  detail: string;
  growingCount: number;
  href?: string;
  key: string;
  label: string;
  tone: MovementTone;
};

function MovementRow({
  count,
  detail,
  growingPercentage,
  growingCount,
  href,
  label,
  tone,
  totalPercentage,
}: {
  count: number;
  detail: string;
  growingPercentage: number;
  growingCount: number;
  href?: string;
  label: string;
  tone: MovementTone;
  totalPercentage: number;
}) {
  const content = (
    <>
      <Link
        aria-label={`View ${label.toLowerCase()} people`}
        className="contents focus:outline-none focus:ring-2 focus:ring-inset focus:ring-app-accent/30 sm:grid sm:min-w-0 sm:flex-1 sm:grid-cols-[auto_minmax(0,1fr)_5.5rem_5.5rem] sm:items-center sm:gap-3 sm:py-3"
        href={href ?? "#"}
      >
        <span className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 sm:hidden">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${movementDotTone(tone)}`}
          />
          <span className="block min-w-0 text-[13px] font-semibold leading-5 text-app-foreground">
            {label}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`hidden h-2.5 w-2.5 rounded-full sm:block ${movementDotTone(tone)}`}
        />
        <span className="hidden min-w-0 sm:block">
          <span className="block text-[13px] font-semibold text-app-foreground">
            {label}
          </span>
        </span>
        <span className="col-start-1 row-start-2 grid min-w-0 gap-1 rounded-[6px] bg-app-chip px-3 py-2 text-left tabular-nums sm:col-start-auto sm:row-start-auto sm:bg-transparent sm:p-0 sm:text-right">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-app-faint sm:hidden">
            Total
          </span>
          <span className="text-[20px] font-semibold leading-none text-app-foreground">
            {formatNumber(count)}
          </span>
          <span className="text-[11px] font-semibold leading-none text-app-muted">
            {formatPercent(totalPercentage)}
          </span>
        </span>
        <span className="col-start-2 row-start-2 grid min-w-0 gap-1 rounded-[6px] bg-app-chip px-3 py-2 text-left tabular-nums sm:col-start-auto sm:row-start-auto sm:bg-transparent sm:p-0 sm:text-right">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-app-faint sm:hidden">
            Growing
          </span>
          <span className="text-[20px] font-semibold leading-none text-app-foreground">
            {formatNumber(growingCount)}
          </span>
          <span className="text-[11px] font-semibold leading-none text-app-muted">
            {formatPercent(growingPercentage)}
          </span>
        </span>
      </Link>
      <DropdownPanel
        align="left"
        openOnHover
        panelClassName="rounded-[8px] border border-app-border bg-app-surface p-3 shadow-[0_16px_32px_rgba(35,31,24,0.16)]"
        portal
        side="left"
        trigger={
          <span className="inline-flex items-center justify-center">
            <CircleHelp aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">About {label}</span>
          </span>
        }
        triggerClassName="inline-flex h-7 w-7 items-center justify-center rounded-full text-app-muted transition hover:bg-app-chip hover:text-app-foreground focus-visible:ring-2 focus-visible:ring-app-accent/25"
        widthClassName="w-64"
        wrapperClassName="relative col-start-2 row-start-1 justify-self-end self-center sm:block sm:justify-self-auto sm:self-auto"
      >
        <div className="grid gap-1">
          <p className="text-[12px] font-semibold text-app-foreground">
            {label}
          </p>
          <p className="text-[12px] leading-5 text-app-muted">{detail}</p>
        </div>
      </DropdownPanel>
    </>
  );

  return (
    <div className="grid grid-cols-2 items-center gap-x-3 gap-y-3 rounded-[8px] border border-app-border bg-app-background p-3 shadow-[0_1px_2px_rgba(150,140,120,0.12)] transition hover:bg-app-chip sm:flex sm:min-h-16 sm:items-center sm:gap-3 sm:rounded-none sm:border-0 sm:border-b sm:border-app-border-faint sm:p-0 sm:pl-3 sm:pr-2 sm:shadow-none sm:last:border-b-0">
      {content}
    </div>
  );
}

type MovementTone = DashboardLifecycleKind;

function movementDotTone(kind: MovementTone) {
  const tones = {
    AT_RISK: "bg-amber-500",
    DROPPED: "bg-rose-500",
    HEALTHY: "bg-emerald-500",
    LAPSED: "bg-stone-500",
    NEW: "bg-sky-500",
    NEVER_GIVEN: "bg-zinc-500",
    REACTIVATED: "bg-teal-500",
  } satisfies Record<MovementTone, string>;

  return tones[kind];
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

function DashboardMoneyMetric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_1px_2px_rgba(150,140,120,0.12)]">
      <dt className="text-[12px] font-semibold text-app-muted">{label}</dt>
      <dd className="mt-2 text-[30px] font-semibold leading-none tabular-nums text-app-foreground">
        {formatCurrency(value)}
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(value);
}

function percentageOfTotal(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

function neverGivenPeopleHref() {
  const params = new URLSearchParams();

  for (const connectionStatus of neverGivenConnectionStatuses) {
    params.append("connectionStatus", connectionStatus);
  }

  params.set("lifecycle", "NEVER_GIVEN");

  return `/people?${params.toString()}`;
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value));
}

function formatRole(role: LocalAppUser["role"]) {
  return role.replace("_", " ");
}
