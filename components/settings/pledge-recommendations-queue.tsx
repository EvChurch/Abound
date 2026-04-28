"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import type { PledgeRecommendationActionResult } from "@/app/tools/pledge-recommendations/actions";
import type { PledgeCandidate } from "@/lib/giving/pledges";

type PledgeRecommendationsQueueProps = {
  candidates: PledgeCandidate[];
  denyAction: (formData: FormData) => Promise<PledgeRecommendationActionResult>;
  acceptAction: (
    formData: FormData,
  ) => Promise<PledgeRecommendationActionResult>;
  result: string | null;
};

const RESULT_COPY: Record<string, string> = {
  accepted: "Pledge recommendation accepted.",
  denied: "Pledge recommendation denied.",
};

export function PledgeRecommendationsQueue({
  candidates,
  denyAction,
  acceptAction,
  result,
}: PledgeRecommendationsQueueProps) {
  const [displayCandidates, setDisplayCandidates] = useState(candidates);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDisplayCandidates(candidates);
  }, [candidates]);

  useEffect(() => {
    const resultMessage = result ? (RESULT_COPY[result] ?? null) : null;

    if (!resultMessage) {
      return;
    }

    toast.success(resultMessage);
  }, [result]);

  async function handleRecommendationAction(
    candidate: PledgeCandidate,
    action: "accept" | "deny",
  ) {
    if (pendingKey) {
      return;
    }

    const key = candidateKey(candidate);
    const previousCandidates = displayCandidates;

    setDisplayCandidates((current) =>
      current.filter((item) => candidateKey(item) !== key),
    );
    setPendingKey(key);

    const formData = new FormData();
    formData.set("personRockId", String(candidate.personRockId));
    formData.set("accountRockId", String(candidate.account.rockId));

    startTransition(async () => {
      try {
        const actionResult =
          action === "accept"
            ? await acceptAction(formData)
            : await denyAction(formData);

        const message = RESULT_COPY[actionResult.result] ?? null;

        if (message) {
          toast.success(message);
        }
      } catch (error) {
        setDisplayCandidates(previousCandidates);
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to process this recommendation right now.",
        );
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <section className="grid gap-6">
      <header className="grid gap-3">
        <p className="font-mono text-[11px] font-semibold uppercase text-app-accent-strong">
          Tools
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-2">
            <h1 className="text-[32px] font-semibold leading-[1.12] tracking-normal text-app-foreground sm:text-[42px]">
              Pledge Recommendations
            </h1>
            <p className="max-w-3xl text-[13px] leading-6 text-app-muted">
              Work through outstanding recommendations with one-click accept and
              deny actions.
            </p>
          </div>
          <span className="rounded-[6px] border border-app-border bg-app-background px-2.5 py-1 text-[12px] font-semibold text-app-muted">
            {displayCandidates.length} outstanding
          </span>
        </div>
      </header>

      {displayCandidates.length === 0 ? (
        <article className="grid gap-2 rounded-[8px] border border-app-border bg-app-surface px-5 py-6 text-center">
          <h2 className="text-[18px] font-semibold text-app-foreground">
            No outstanding pledge recommendations.
          </h2>
          <p className="text-[13px] leading-6 text-app-muted">
            You are all caught up right now. New recommendations will appear
            here when giving patterns qualify.
          </p>
        </article>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false} mode="popLayout">
            {displayCandidates.map((candidate) => (
              <motion.article
                animate={{ opacity: 1, scale: 1 }}
                className="relative grid gap-4 overflow-hidden rounded-[8px] border border-app-border bg-app-surface px-4 py-4 shadow-[0_1px_2px_rgba(150,140,120,0.12)]"
                exit={{ opacity: 0, scale: 0.985 }}
                initial={{ opacity: 0, scale: 0.995 }}
                key={candidateKey(candidate)}
                layout="position"
                transition={{
                  layout: {
                    duration: 0.2,
                    ease: "easeOut",
                  },
                  opacity: { duration: 0.12 },
                  scale: { duration: 0.14 },
                }}
              >
                <div
                  className="pointer-events-none absolute bottom-0 right-0 z-0 w-32 translate-x-1 translate-y-2 opacity-70"
                  style={{
                    WebkitMaskImage:
                      "linear-gradient(to right, transparent 0%, black 40%)",
                    maskImage:
                      "linear-gradient(to right, transparent 0%, black 40%)",
                  }}
                >
                  <GivingTrendBarChart
                    recommendedAmount={candidate.recommendedAmount}
                    series={candidate.givingTrend}
                  />
                </div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <Link
                      className="text-[14px] font-semibold text-app-accent"
                      href={`/people/${candidate.personRockId}`}
                    >
                      {candidate.personDisplayName}
                    </Link>
                    <p className="text-[12px] text-app-muted">
                      Fund: {candidate.account.name}
                    </p>
                  </div>
                  <ConfidenceBadge confidence={candidate.confidence} />
                </div>

                <dl className="relative z-10 grid gap-2 text-[12px] sm:grid-cols-3">
                  <Metric
                    label="Recommended amount"
                    value={formatRecommendedAmount(
                      candidate.recommendedAmount,
                      candidate.recommendedPeriod,
                    )}
                  />
                  <Metric
                    label="Streak"
                    value={formatStreakValue(
                      candidate.recommendedMatchStreakCount,
                      candidate.recommendedPeriod,
                      candidate.recommendedMatchStreakStartedAt,
                    )}
                  />
                  <Metric
                    label="Last gift"
                    value={formatLastGift(candidate.lastGiftAt)}
                  />
                </dl>

                <div className="relative z-10 flex flex-wrap items-center gap-2">
                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-emerald-700 bg-emerald-50 px-3 text-[12px] font-semibold text-emerald-950 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-wait disabled:opacity-60"
                    disabled={isPending}
                    onClick={() =>
                      void handleRecommendationAction(candidate, "accept")
                    }
                    type="button"
                  >
                    Accept
                  </button>

                  <button
                    className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-border bg-app-background px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30 disabled:cursor-wait disabled:opacity-60"
                    disabled={isPending}
                    onClick={() =>
                      void handleRecommendationAction(candidate, "deny")
                    }
                    type="button"
                  >
                    Deny
                  </button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function candidateKey(
  candidate: Pick<PledgeCandidate, "personRockId" | "account">,
) {
  return `${candidate.personRockId}-${candidate.account.rockId}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-app-border bg-app-background px-3 py-2">
      <dt className="font-mono text-[10px] font-semibold uppercase text-app-muted">
        {label}
      </dt>
      <dd className="mt-1 text-[12px] font-semibold text-app-foreground">
        {value}
      </dd>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: PledgeCandidate["confidence"];
}) {
  const normalized = confidence ?? "LOW";
  const className =
    normalized === "HIGH"
      ? "border-emerald-700 bg-emerald-50 text-emerald-950"
      : normalized === "MEDIUM"
        ? "border-amber-700 bg-amber-50 text-amber-950"
        : "border-app-border bg-app-background text-app-muted";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-[6px] border px-2.5 text-[11px] font-semibold uppercase ${className}`}
    >
      {normalized.toLowerCase()} confidence
    </span>
  );
}

function formatMoney(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(parsed);
}

function formatRecommendedAmount(
  amount: string | null,
  period: PledgeCandidate["recommendedPeriod"],
) {
  if (!amount || !period) {
    return "Not available";
  }

  return `${formatMoney(amount)}/${periodSuffix(period)}`;
}

function periodSuffix(period: PledgeCandidate["recommendedPeriod"]) {
  const labels = {
    ANNUALLY: "year",
    FORTNIGHTLY: "fortnight",
    MONTHLY: "month",
    QUARTERLY: "quarter",
    WEEKLY: "week",
  } satisfies Record<NonNullable<PledgeCandidate["recommendedPeriod"]>, string>;

  return labels[period as NonNullable<PledgeCandidate["recommendedPeriod"]>];
}

function formatStreakCount(
  count: number,
  period: PledgeCandidate["recommendedPeriod"],
) {
  if (!period || count <= 0) {
    return "No active streak";
  }

  if (period === "MONTHLY") {
    return formatMonthsAsDuration(count);
  }

  return `${count} ${streakUnitLabel(period, count)}`;
}

function streakUnitLabel(
  period: NonNullable<PledgeCandidate["recommendedPeriod"]>,
  count: number,
) {
  if (period === "MONTHLY") {
    return count === 1 ? "month" : "months";
  }

  if (period === "QUARTERLY") {
    return count === 1 ? "quarter" : "quarters";
  }

  if (period === "ANNUALLY") {
    return count === 1 ? "year" : "years";
  }

  if (period === "WEEKLY") {
    return count === 1 ? "week" : "weeks";
  }

  if (period === "FORTNIGHTLY") {
    return count === 1 ? "fortnight" : "fortnights";
  }

  return count === 1 ? "period" : "periods";
}

function formatStreakSince(value: Date | null) {
  if (!value) {
    return "no active streak";
  }

  const months = monthDistance(value, new Date());

  if (months <= 0) {
    return "since this month";
  }

  if (months === 1) {
    return "since 1 month ago";
  }

  return `since ${months} months ago`;
}

function formatStreakValue(
  count: number,
  period: PledgeCandidate["recommendedPeriod"],
  startedAt: Date | null,
) {
  const streak = formatStreakCount(count, period);

  if (count <= 0 || !period) {
    return streak;
  }

  if (period === "MONTHLY") {
    return streak;
  }

  const monthEquivalent = formatMonthEquivalent(count, period);

  if (monthEquivalent) {
    return `${streak} (or ${monthEquivalent})`;
  }

  if (!startedAt || !shouldShowRelativeStreak(period)) {
    return streak;
  }

  return `${streak} (${formatStreakSince(startedAt)})`;
}

function shouldShowRelativeStreak(
  period: PledgeCandidate["recommendedPeriod"],
) {
  return period === "WEEKLY" || period === "FORTNIGHTLY";
}

function formatMonthEquivalent(
  count: number,
  period: NonNullable<PledgeCandidate["recommendedPeriod"]>,
) {
  const monthCount = monthEquivalentForStreak(count, period);

  if (monthCount === null || monthCount < 1) {
    return null;
  }

  return formatMonthsAsDuration(Math.floor(monthCount));
}

function monthEquivalentForStreak(
  count: number,
  period: NonNullable<PledgeCandidate["recommendedPeriod"]>,
) {
  if (period === "WEEKLY") {
    return count / 4;
  }

  if (period === "FORTNIGHTLY") {
    return count / 2;
  }

  if (period === "QUARTERLY") {
    return count * 3;
  }

  if (period === "ANNUALLY") {
    return count * 12;
  }

  return null;
}

function formatMonthsAsDuration(months: number) {
  if (months <= 0) {
    return "0 months";
  }

  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const parts: string[] = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  }

  if (remainingMonths > 0) {
    parts.push(
      `${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}`,
    );
  }

  if (parts.length === 0) {
    return "0 months";
  }

  return parts.join(" and ");
}

function formatLastGift(value: Date | null) {
  if (!value) {
    return "No recent gift";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(value);
}

function monthDistance(start: Date, end: Date) {
  const yearDelta = end.getUTCFullYear() - start.getUTCFullYear();
  const monthDelta = end.getUTCMonth() - start.getUTCMonth();

  return Math.max(0, yearDelta * 12 + monthDelta);
}

function GivingTrendBarChart({
  recommendedAmount,
  series,
}: {
  recommendedAmount: string | null;
  series: PledgeCandidate["givingTrend"];
}) {
  if (series.length === 0) {
    return null;
  }

  const width = 128;
  const height = 56;
  const chartPaddingTop = 4;
  const chartPaddingBottom = 4;
  const barGap = 1.5;
  const values = series.map((point) => Number(point.total));
  const normalizedRecommendedAmount = Number(recommendedAmount);
  const maxValue = Math.max(
    ...values,
    Number.isFinite(normalizedRecommendedAmount)
      ? normalizedRecommendedAmount
      : 0,
    1,
  );
  const chartHeight = height - chartPaddingTop - chartPaddingBottom;
  const barWidth = Math.max(
    2,
    (width - barGap * (series.length - 1)) / series.length,
  );
  const yForValue = (value: number) =>
    height - chartPaddingBottom - (value / maxValue) * chartHeight;
  const recommendedLineY = Number.isFinite(normalizedRecommendedAmount)
    ? yForValue(normalizedRecommendedAmount)
    : null;

  return (
    <svg
      aria-hidden="true"
      className="h-auto w-full"
      fill="none"
      viewBox={`0 0 ${width} ${height}`}
    >
      {recommendedLineY !== null ? (
        <line
          stroke="rgba(176, 89, 47, 0.78)"
          strokeDasharray="4 3"
          strokeWidth="1.5"
          x1="0"
          x2={width}
          y1={recommendedLineY}
          y2={recommendedLineY}
        />
      ) : null}
      {values.map((value, index) => {
        const safeValue = Number.isFinite(value) ? Math.max(value, 0) : 0;
        const barHeight = (safeValue / maxValue) * chartHeight;
        const x = index * (barWidth + barGap);
        const y = height - chartPaddingBottom - barHeight;

        return (
          <rect
            fill="rgba(110, 120, 140, 0.22)"
            height={barHeight}
            key={`${series[index]?.periodStart ?? index}-${value}`}
            rx="1.5"
            width={barWidth}
            x={x}
            y={y}
          />
        );
      })}
    </svg>
  );
}
