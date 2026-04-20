import type { GiftReliabilityKind } from "@prisma/client";
import type { AppRole } from "@/lib/auth/roles";
import { canSeeGivingAmounts } from "@/lib/auth/roles";

export const GIVING_LIFECYCLE_KINDS = [
  "NEW",
  "REACTIVATED",
  "AT_RISK",
  "DROPPED",
] as const;

export type GivingLifecycleKind = (typeof GIVING_LIFECYCLE_KINDS)[number];

export type GivingLifecycleFact = {
  amount: unknown;
  effectiveMonth: Date;
  occurredAt: Date | null;
  reliabilityKind: GiftReliabilityKind;
};

export type GivingLifecycleOptions = {
  atRiskAmountDropRatio?: number;
  atRiskRecentGivingDays?: number;
  currentWindowDays?: number;
  dormantWindowDays?: number;
  droppedWindowDays?: number;
  priorWindowDays?: number;
  referenceDate?: Date;
};

export type GivingLifecycleResult = {
  financeDetail: {
    currentWindowTotal: string;
    firstGiftAt: Date;
    lastGiftAt: Date;
    priorWindowTotal: string;
  } | null;
  kind: GivingLifecycleKind | null;
  summary: string | null;
};

const DEFAULT_OPTIONS = {
  atRiskAmountDropRatio: 0.5,
  atRiskRecentGivingDays: 90,
  currentWindowDays: 90,
  dormantWindowDays: 180,
  droppedWindowDays: 180,
  priorWindowDays: 90,
} as const;

export function classifyGivingLifecycle(
  facts: GivingLifecycleFact[],
  options: GivingLifecycleOptions = {},
): GivingLifecycleResult {
  const merged = {
    ...DEFAULT_OPTIONS,
    ...options,
    referenceDate: options.referenceDate ?? new Date(),
  };
  const orderedFacts = facts
    .map((fact) => ({
      ...fact,
      giftAt: giftDate(fact),
    }))
    .filter((fact) => fact.giftAt <= merged.referenceDate)
    .sort((left, right) => left.giftAt.getTime() - right.giftAt.getTime());

  if (orderedFacts.length === 0) {
    return emptyLifecycleResult();
  }

  const currentWindowStart = subtractDays(
    merged.referenceDate,
    merged.currentWindowDays,
  );
  const priorWindowStart = subtractDays(
    currentWindowStart,
    merged.priorWindowDays,
  );
  const dormantWindowStart = subtractDays(
    currentWindowStart,
    merged.dormantWindowDays,
  );
  const droppedWindowStart = subtractDays(
    merged.referenceDate,
    merged.droppedWindowDays,
  );
  const recentGivingStart = subtractDays(
    merged.referenceDate,
    merged.atRiskRecentGivingDays,
  );
  const firstGiftAt = orderedFacts[0].giftAt;
  const lastGiftAt = orderedFacts.at(-1)?.giftAt ?? firstGiftAt;
  const currentFacts = orderedFacts.filter(
    (fact) => fact.giftAt >= currentWindowStart,
  );
  const priorFacts = orderedFacts.filter(
    (fact) =>
      fact.giftAt >= priorWindowStart && fact.giftAt < currentWindowStart,
  );
  const dormantFacts = orderedFacts.filter(
    (fact) =>
      fact.giftAt >= dormantWindowStart && fact.giftAt < currentWindowStart,
  );
  const hadGivingBeforeCurrent = orderedFacts.some(
    (fact) => fact.giftAt < currentWindowStart,
  );
  const hadGivingBeforeDormant = orderedFacts.some(
    (fact) => fact.giftAt < dormantWindowStart,
  );
  const currentWindowTotal = sumFactAmounts(currentFacts);
  const priorWindowTotal = sumFactAmounts(priorFacts);
  const financeDetail = {
    currentWindowTotal: centsToDecimalString(currentWindowTotal),
    firstGiftAt,
    lastGiftAt,
    priorWindowTotal: centsToDecimalString(priorWindowTotal),
  };

  if (currentFacts.length > 0 && !hadGivingBeforeCurrent) {
    return {
      financeDetail,
      kind: "NEW",
      summary: "First giving activity appears in the current window.",
    };
  }

  if (
    currentFacts.length > 0 &&
    hadGivingBeforeDormant &&
    dormantFacts.length === 0
  ) {
    return {
      financeDetail,
      kind: "REACTIVATED",
      summary: "Giving activity resumed after a dormant period.",
    };
  }

  if (lastGiftAt < droppedWindowStart) {
    return {
      financeDetail,
      kind: "DROPPED",
      summary: "Previously active giving has stopped beyond the drop window.",
    };
  }

  if (
    hasRecurringOrConsistentPattern(orderedFacts, priorWindowStart) &&
    (lastGiftAt < recentGivingStart ||
      materiallyBelowPreviousPeriod(
        currentWindowTotal,
        priorWindowTotal,
        merged.atRiskAmountDropRatio,
      ))
  ) {
    return {
      financeDetail,
      kind: "AT_RISK",
      summary: "Previously consistent giving appears interrupted or reduced.",
    };
  }

  return {
    financeDetail,
    kind: null,
    summary: null,
  };
}

export function lifecycleExplanationForRole(
  result: GivingLifecycleResult,
  role: AppRole,
) {
  if (!result.kind || !result.summary) {
    return null;
  }

  if (!canSeeGivingAmounts(role) || !result.financeDetail) {
    return result.summary;
  }

  return `${result.summary} Current window total: ${result.financeDetail.currentWindowTotal}; prior window total: ${result.financeDetail.priorWindowTotal}; last gift: ${result.financeDetail.lastGiftAt.toISOString().slice(0, 10)}.`;
}

function emptyLifecycleResult(): GivingLifecycleResult {
  return {
    financeDetail: null,
    kind: null,
    summary: null,
  };
}

function hasRecurringOrConsistentPattern(
  facts: Array<GivingLifecycleFact & { giftAt: Date }>,
  since: Date,
) {
  if (
    facts.some(
      (fact) =>
        fact.reliabilityKind === "SCHEDULED_RECURRING" ||
        fact.reliabilityKind === "INFERRED_RECURRING" ||
        fact.reliabilityKind === "PLEDGE",
    )
  ) {
    return true;
  }

  const activeMonths = new Set(
    facts
      .filter((fact) => fact.giftAt >= since)
      .map((fact) => monthKey(fact.giftAt)),
  );

  return activeMonths.size >= 3;
}

function materiallyBelowPreviousPeriod(
  currentWindowTotal: bigint,
  priorWindowTotal: bigint,
  thresholdRatio: number,
) {
  if (priorWindowTotal <= 0n) {
    return false;
  }

  const thresholdBasisPoints = BigInt(Math.round(thresholdRatio * 10000));

  return currentWindowTotal * 10000n < priorWindowTotal * thresholdBasisPoints;
}

function giftDate(fact: GivingLifecycleFact) {
  return fact.occurredAt ?? fact.effectiveMonth;
}

function subtractDays(date: Date, days: number) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function monthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function sumFactAmounts(facts: GivingLifecycleFact[]) {
  return facts.reduce((total, fact) => total + decimalToCents(fact.amount), 0n);
}

function decimalToCents(value: unknown) {
  const [whole = "0", fractional = ""] = String(value).split(".");
  const sign = whole.startsWith("-") ? -1n : 1n;
  const normalizedWhole = whole.replace("-", "") || "0";
  const normalizedFractional = `${fractional}00`.slice(0, 2);

  return (
    sign *
    (BigInt(normalizedWhole) * 100n + BigInt(normalizedFractional || "0"))
  );
}

function centsToDecimalString(cents: bigint) {
  const sign = cents < 0n ? "-" : "";
  const absolute = cents < 0n ? -cents : cents;
  const whole = absolute / 100n;
  const fractional = String(absolute % 100n).padStart(2, "0");

  return `${sign}${whole}.${fractional}`;
}
