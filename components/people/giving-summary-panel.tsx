"use client";

import { useMemo, useState } from "react";

import { CustomSelect } from "@/components/ui/custom-select";
import type { ProfileGivingSummary } from "@/lib/people/profiles";

type SerializedMonthlyGiving = ProfileGivingSummary["monthlyGiving"][number];

type SerializedGivingSummaryBase = {
  firstGiftAt: string | null;
  lastGiftAmount: string | null;
  lastGiftAt: string | null;
  lastTwelveMonthsTotal: string;
  monthlyGiving: SerializedMonthlyGiving[];
  monthsWithGiving: number;
  reliabilityKinds: string[];
  sourceExplanation: string;
  totalGiven: string;
};

export type SerializedGivingAccountSummary = SerializedGivingSummaryBase & {
  accountName: string;
  accountRockId: number | null;
};

export type SerializedGivingSummary = SerializedGivingSummaryBase & {
  accountSummaries: SerializedGivingAccountSummary[];
  source: ProfileGivingSummary["source"];
};

type GivingSummarySectionProps = {
  emptyRecordLabel: "household" | "person";
  hidden: boolean;
  showHouseholdSourceNote: boolean;
  summary: SerializedGivingSummary | null;
  title: string;
};

const ALL_ACCOUNTS = "all";

export function GivingSummarySection({
  emptyRecordLabel,
  hidden,
  showHouseholdSourceNote,
  summary,
  title,
}: GivingSummarySectionProps) {
  const [selectedAccount, setSelectedAccount] = useState(ALL_ACCOUNTS);
  const canFilter = Boolean(summary && summary.accountSummaries.length > 1);

  return (
    <section className="overflow-visible rounded-[8px] border border-app-border bg-app-surface">
      <header className="flex min-h-[57px] items-center justify-between gap-4 border-b border-app-border-faint px-5 py-3">
        <div className="min-w-0 py-1">
          <h3 className="m-0 text-[13px] font-semibold tracking-[0.1px] text-app-foreground">
            {title}
          </h3>
        </div>
        {canFilter ? (
          <label className="flex min-h-8 items-center border-l border-app-border-faint pl-4">
            <span className="sr-only">Account</span>
            <CustomSelect
              ariaLabel="Account"
              className="inline-flex h-8 min-w-[160px] items-center justify-between gap-2 rounded-[4px] border border-transparent bg-transparent px-2 text-[12.5px] font-medium text-app-muted outline-none transition hover:bg-app-soft hover:text-app-foreground focus-visible:ring-2 focus-visible:ring-app-accent/25"
              onValueChange={(nextValue) => setSelectedAccount(nextValue)}
              options={[
                { label: "All accounts", value: ALL_ACCOUNTS },
                ...(summary?.accountSummaries.map((accountSummary) => ({
                  label: accountSummary.accountName,
                  value: accountKey(accountSummary.accountRockId),
                })) ?? []),
              ]}
              value={selectedAccount}
            />
          </label>
        ) : null}
      </header>
      <div className="overflow-visible p-5">
        <GivingSummaryPanel
          emptyRecordLabel={emptyRecordLabel}
          hidden={hidden}
          selectedAccount={selectedAccount}
          showHouseholdSourceNote={showHouseholdSourceNote}
          summary={summary}
        />
      </div>
    </section>
  );
}

function GivingSummaryPanel({
  emptyRecordLabel,
  hidden,
  selectedAccount,
  showHouseholdSourceNote,
  summary,
}: {
  emptyRecordLabel: "household" | "person";
  hidden: boolean;
  selectedAccount: string;
  showHouseholdSourceNote: boolean;
  summary: SerializedGivingSummary | null;
}) {
  const visibleSummary = useMemo(() => {
    if (!summary) {
      return null;
    }

    if (selectedAccount === ALL_ACCOUNTS) {
      return summary;
    }

    return (
      summary.accountSummaries.find((accountSummary) => {
        return accountKey(accountSummary.accountRockId) === selectedAccount;
      }) ?? summary
    );
  }, [selectedAccount, summary]);

  if (hidden) {
    return <GivingHiddenState />;
  }

  if (!visibleSummary || visibleSummary.monthsWithGiving === 0) {
    return (
      <p className="text-[13px] text-app-faint">
        No gifts are linked to this {emptyRecordLabel}.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {showHouseholdSourceNote && summary?.source === "HOUSEHOLD" ? (
        <div className="rounded-[6px] border border-app-border-faint bg-app-soft px-4 py-3 text-[12.5px] leading-[1.55] text-app-muted">
          Showing giving from this person&apos;s assigned giving household.
        </div>
      ) : null}

      <div className="grid items-end gap-6 md:grid-cols-4">
        <GivingStat
          big
          label="Last 12 months"
          value={formatCurrency(visibleSummary.lastTwelveMonthsTotal)}
        />
        <GivingStat
          label="Last gift"
          value={
            visibleSummary.lastGiftAmount
              ? formatCurrency(visibleSummary.lastGiftAmount)
              : "-"
          }
        />
        <GivingStat
          label="Last gift date"
          value={
            visibleSummary.lastGiftAt
              ? formatDate(new Date(visibleSummary.lastGiftAt))
              : "-"
          }
        />
        <GivingStat
          label="Active months"
          value={String(monthsWithRecentGiving(visibleSummary.monthlyGiving))}
        />
      </div>

      <MonthlyGivingChart months={visibleSummary.monthlyGiving} />
    </div>
  );
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
      <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.2px] text-app-faint">
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

function MonthlyGivingChart({ months }: { months: SerializedMonthlyGiving[] }) {
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
  month: SerializedMonthlyGiving;
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
      <div className="truncate text-[10.5px] text-app-faint">
        {formatMonthShort(month.month)}
      </div>
    </div>
  );
}

function accountKey(accountRockId: number | null) {
  return accountRockId === null ? "unknown" : String(accountRockId);
}

function barHeight(value: number, max: number) {
  if (max <= 0 || value <= 0) {
    return 0;
  }

  return Math.max(4, Math.round((value / max) * 100));
}

function niceChartMax(value: number) {
  if (value <= 0) {
    return 100;
  }

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}

function monthsWithRecentGiving(months: SerializedMonthlyGiving[]) {
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
  const [year, month] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, 1));
}
