import type { GiftReliabilityKind, GivingPledgePeriod } from "@prisma/client";
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

export type GivingLifecycleActivePledge = {
  amount: unknown;
  period: GivingPledgePeriod;
};

export type GivingLifecycleOptions = {
  activePledges?: GivingLifecycleActivePledge[];
  atRiskAmountDropRatio?: number;
  atRiskBaselineDropRatio?: number;
  atRiskRecentGivingDays?: number;
  confirmedDroppedWindowDays?: number;
  currentWindowDays?: number;
  dormantWindowDays?: number;
  droppedConsistencyLookbackDays?: number;
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
  atRiskBaselineDropRatio: 0.75,
  atRiskRecentGivingDays: 90,
  confirmedDroppedWindowDays: 90,
  currentWindowDays: 90,
  dormantWindowDays: 180,
  droppedConsistencyLookbackDays: 365,
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
  const confirmedDroppedWindowStart = subtractDays(
    droppedWindowStart,
    merged.confirmedDroppedWindowDays,
  );
  const droppedConsistencyStart = subtractDays(
    droppedWindowStart,
    merged.droppedConsistencyLookbackDays,
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
  const activePledgeMonthlyTotal = monthlyPledgeTotal(
    merged.activePledges ?? [],
  );
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

  if (
    lastGiftAt < droppedWindowStart &&
    lastGiftAt >= confirmedDroppedWindowStart &&
    hasRecurringOrConsistentPatternBefore(
      orderedFacts,
      droppedConsistencyStart,
      droppedWindowStart,
    )
  ) {
    return {
      financeDetail,
      kind: "DROPPED",
      summary: "Previously at-risk giving now appears dropped.",
    };
  }

  if (
    hasRecurringOrConsistentPattern(orderedFacts, priorWindowStart) &&
    ((lastGiftAt < recentGivingStart && lastGiftAt >= droppedWindowStart) ||
      (materiallyBelowPreviousPeriod(
        currentWindowTotal,
        priorWindowTotal,
        merged.atRiskAmountDropRatio,
      ) &&
        materiallyBelowTypicalBaseline(
          currentFacts,
          orderedFacts,
          activePledgeMonthlyTotal,
          merged.atRiskBaselineDropRatio,
        )))
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

function hasRecurringOrConsistentPatternBefore(
  facts: Array<GivingLifecycleFact & { giftAt: Date }>,
  since: Date,
  before: Date,
) {
  return hasRecurringOrConsistentPattern(
    facts.filter((fact) => fact.giftAt < before),
    since,
  );
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

function materiallyBelowTypicalBaseline(
  currentFacts: GivingLifecycleFact[],
  facts: Array<GivingLifecycleFact & { giftAt: Date }>,
  activePledgeMonthlyTotal: bigint | null,
  thresholdRatio: number,
) {
  const currentMonthlyAverage = monthlyAverage(currentFacts);
  const typicalMonthTotal =
    activePledgeMonthlyTotal && activePledgeMonthlyTotal > 0n
      ? activePledgeMonthlyTotal
      : typicalMonthlyTotal(facts);

  if (!currentMonthlyAverage || !typicalMonthTotal) {
    return true;
  }

  const thresholdBasisPoints = BigInt(Math.round(thresholdRatio * 10000));

  return (
    currentMonthlyAverage * 10000n < typicalMonthTotal * thresholdBasisPoints
  );
}

function monthlyAverage(facts: GivingLifecycleFact[]) {
  const monthlyTotals = monthlyTotalsForFacts(facts);

  if (monthlyTotals.length === 0) {
    return null;
  }

  return sumBigInts(monthlyTotals) / BigInt(monthlyTotals.length);
}

function typicalMonthlyTotal(
  facts: Array<GivingLifecycleFact & { giftAt: Date }>,
) {
  const monthlyTotals = monthlyTotalsForFacts(facts).filter(
    (total) => total > 0n,
  );

  if (monthlyTotals.length < 3) {
    return null;
  }

  const sortedTotals = [...monthlyTotals].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
  const midpoint = Math.floor(sortedTotals.length / 2);

  if (sortedTotals.length % 2 === 1) {
    return sortedTotals[midpoint];
  }

  return (sortedTotals[midpoint - 1]! + sortedTotals[midpoint]!) / 2n;
}

function monthlyTotalsForFacts(facts: GivingLifecycleFact[]) {
  const totals = new Map<string, bigint>();

  for (const fact of facts) {
    const month = monthKey(giftDate(fact));
    totals.set(month, (totals.get(month) ?? 0n) + decimalToCents(fact.amount));
  }

  return Array.from(totals.values());
}

function monthlyPledgeTotal(pledges: GivingLifecycleActivePledge[]) {
  if (pledges.length === 0) {
    return null;
  }

  return sumBigInts(
    pledges.map((pledge) =>
      pledgeAmountToMonthlyCents(decimalToCents(pledge.amount), pledge.period),
    ),
  );
}

function pledgeAmountToMonthlyCents(
  amountCents: bigint,
  period: GivingPledgePeriod,
) {
  switch (period) {
    case "WEEKLY":
      return (amountCents * 52n) / 12n;
    case "FORTNIGHTLY":
      return (amountCents * 26n) / 12n;
    case "MONTHLY":
      return amountCents;
    case "QUARTERLY":
      return amountCents / 3n;
    case "ANNUALLY":
      return amountCents / 12n;
  }
}

function sumBigInts(values: bigint[]) {
  return values.reduce((total, value) => total + value, 0n);
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
