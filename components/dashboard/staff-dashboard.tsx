import Link from "next/link";

import { HouseholdDonorChart } from "@/components/dashboard/household-donor-chart";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { canSeeGivingAmounts, hasPermission } from "@/lib/auth/roles";
import type { LocalAppUser } from "@/lib/auth/types";
import type {
  DashboardLifecycleKind,
  GivingPerAdult,
  HouseholdDonorTrend,
  LifecycleCounts,
} from "@/lib/giving/metrics";

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
      <main className="mx-auto grid w-full max-w-[1280px] gap-6 px-7 py-7">
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
  NEW: "New",
  REACTIVATED: "Reactivated",
};

const movementDetails: Record<DashboardLifecycleKind, string> = {
  AT_RISK: "Usually gave regularly, but has not given for 90-180 days.",
  DROPPED: "Usually gave regularly, but has not given for 180-270 days.",
  HEALTHY: "Has given within the last 90 days and has no warning signal.",
  NEW: "First recorded gift was within the last 90 days.",
  REACTIVATED: "Gave again after at least 180 quiet days.",
};

function HouseholdMovementPanel({
  lifecycleCounts,
}: {
  lifecycleCounts: LifecycleCounts;
}) {
  const cards: MovementCard[] = [
    {
      count: lifecycleCounts.HEALTHY,
      detail: movementDetails.HEALTHY,
      href: "/people?lifecycle=HEALTHY",
      key: "HEALTHY",
      label: movementLabels.HEALTHY,
      tone: "HEALTHY",
    },
    {
      count: lifecycleCounts.DROPPED,
      detail: movementDetails.DROPPED,
      href: "/people?lifecycle=DROPPED",
      key: "DROPPED",
      label: movementLabels.DROPPED,
      tone: "DROPPED",
    },
    {
      count: lifecycleCounts.AT_RISK,
      detail: movementDetails.AT_RISK,
      href: "/people?lifecycle=AT_RISK",
      key: "AT_RISK",
      label: movementLabels.AT_RISK,
      tone: "AT_RISK",
    },
    {
      count: lifecycleCounts.REACTIVATED,
      detail: movementDetails.REACTIVATED,
      href: "/people?lifecycle=REACTIVATED",
      key: "REACTIVATED",
      label: movementLabels.REACTIVATED,
      tone: "REACTIVATED",
    },
    {
      count: lifecycleCounts.NEW,
      detail: movementDetails.NEW,
      href: "/people?lifecycle=NEW",
      key: "NEW",
      label: movementLabels.NEW,
      tone: "NEW",
    },
  ];

  return (
    <section className="grid gap-5 rounded-[10px] border border-app-border bg-app-surface p-5 shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
      <h2 className="text-[20px] font-semibold text-app-foreground">
        Giving lifecycle
      </h2>

      <dl className="grid gap-3 md:grid-cols-5">
        {cards.map((card) => (
          <MovementMetric
            key={card.key}
            count={card.count}
            detail={card.detail}
            href={card.href}
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
  href?: string;
  key: string;
  label: string;
  tone: MovementTone;
};

function MovementMetric({
  count,
  detail,
  href,
  label,
  tone,
}: {
  count: number;
  detail: string;
  href?: string;
  label: string;
  tone: MovementTone;
}) {
  return (
    <div
      className={`group relative rounded-[8px] border p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(38,30,20,0.12)] focus-within:ring-2 focus-within:ring-app-accent/25 focus-within:ring-offset-2 ${movementTone(tone)}`}
    >
      {href ? (
        <Link
          aria-label={`View ${label.toLowerCase()} people`}
          className="absolute inset-0 z-10 rounded-[8px]"
          href={href}
        />
      ) : null}
      <dt className="text-[12px] font-semibold">{label}</dt>
      <dd className="mt-2 text-[28px] font-semibold leading-none tabular-nums">
        {formatNumber(count)}
      </dd>
      <dd className="mt-2 text-[12px] leading-5 opacity-80">{detail}</dd>
    </div>
  );
}

type MovementTone = DashboardLifecycleKind;

function movementTone(kind: MovementTone) {
  const tones = {
    AT_RISK: "border-amber-700 bg-amber-50 text-amber-950",
    DROPPED: "border-rose-700 bg-rose-50 text-rose-950",
    HEALTHY: "border-emerald-700 bg-emerald-50 text-emerald-950",
    NEW: "border-sky-700 bg-sky-50 text-sky-950",
    REACTIVATED: "border-emerald-700 bg-emerald-50 text-emerald-950",
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
