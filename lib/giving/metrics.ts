import type { GiftReliabilityKind, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type GivingSummary = {
  totalGiven: string;
  firstGiftAt: Date | null;
  lastGiftAt: Date | null;
  lastGiftAmount: string | null;
  lastTwelveMonthsTotal: string;
  monthlyGiving: MonthlyGiving[];
  monthsWithGiving: number;
  reliabilityKinds: GiftReliabilityKind[];
  sourceExplanation: string;
};

export type MonthlyGiving = {
  giftCount: number;
  month: string;
  previousGiftCount: number;
  previousMonth: string;
  previousTotalGiven: string;
  totalGiven: string;
};

type GivingFactForSummary = {
  amount: unknown;
  occurredAt: Date | null;
  effectiveMonth: Date;
  reliabilityKind: GiftReliabilityKind;
};

const SOURCE_EXPLANATION =
  "Derived from local GivingFact rows synced from Rock.";

export async function getPersonGivingSummary(
  personRockId: number,
  client: PrismaClient = prisma,
) {
  return summarizeGivingFacts(
    await client.givingFact.findMany({
      orderBy: [
        { occurredAt: "asc" },
        { effectiveMonth: "asc" },
        { id: "asc" },
      ],
      select: givingFactSummarySelect,
      where: {
        personRockId,
      },
    }),
  );
}

export async function getHouseholdGivingSummary(
  householdRockId: number,
  client: PrismaClient = prisma,
) {
  return summarizeGivingFacts(
    await client.givingFact.findMany({
      orderBy: [
        { occurredAt: "asc" },
        { effectiveMonth: "asc" },
        { id: "asc" },
      ],
      select: givingFactSummarySelect,
      where: {
        householdRockId,
      },
    }),
  );
}

export function summarizeGivingFacts(
  facts: GivingFactForSummary[],
  referenceDate = new Date(),
): GivingSummary {
  let totalCents = 0n;
  let lastTwelveMonthsTotalCents = 0n;
  let lastFact: GivingFactForSummary | null = null;
  const months = new Set<string>();
  const monthlyTotals = new Map<
    string,
    { giftCount: number; totalCents: bigint }
  >();
  const reliabilityKinds = new Set<GiftReliabilityKind>();
  const recentMonthKeys = lastTwelveMonthKeys(referenceDate);
  const recentMonthKeySet = new Set(recentMonthKeys);
  const previousMonthByRecentMonth = new Map(
    recentMonthKeys.map((key) => [key, offsetMonthKey(key, -12)]),
  );
  const recentMonthByPreviousMonth = new Map(
    Array.from(previousMonthByRecentMonth.entries()).map(
      ([recent, previous]) => [previous, recent],
    ),
  );

  for (const fact of facts) {
    const amountCents = decimalToCents(fact.amount);
    const factMonthKey = monthKey(fact.effectiveMonth);

    totalCents += amountCents;
    months.add(factMonthKey);
    reliabilityKinds.add(fact.reliabilityKind);

    if (recentMonthKeySet.has(factMonthKey)) {
      const month = monthlyTotals.get(factMonthKey) ?? {
        giftCount: 0,
        totalCents: 0n,
      };

      month.giftCount += 1;
      month.totalCents += amountCents;
      monthlyTotals.set(factMonthKey, month);
      lastTwelveMonthsTotalCents += amountCents;
    }

    const recentMonthForPreviousFact =
      recentMonthByPreviousMonth.get(factMonthKey);

    if (recentMonthForPreviousFact) {
      const previousMonthKey =
        previousMonthByRecentMonth.get(recentMonthForPreviousFact) ??
        factMonthKey;
      const previousMonth = monthlyTotals.get(previousMonthKey) ?? {
        giftCount: 0,
        totalCents: 0n,
      };

      previousMonth.giftCount += 1;
      previousMonth.totalCents += amountCents;
      monthlyTotals.set(previousMonthKey, previousMonth);
    }

    if (!lastFact || giftDate(fact).getTime() >= giftDate(lastFact).getTime()) {
      lastFact = fact;
    }
  }

  return {
    totalGiven: centsToDecimalString(totalCents),
    firstGiftAt: facts[0] ? giftDate(facts[0]) : null,
    lastGiftAmount: lastFact
      ? centsToDecimalString(decimalToCents(lastFact.amount))
      : null,
    lastGiftAt: lastFact ? giftDate(lastFact) : null,
    lastTwelveMonthsTotal: centsToDecimalString(lastTwelveMonthsTotalCents),
    monthlyGiving: recentMonthKeys.map((key) => {
      const month = monthlyTotals.get(key);
      const previousMonthKey = previousMonthByRecentMonth.get(key) ?? key;
      const previousMonth = monthlyTotals.get(previousMonthKey);

      return {
        giftCount: month?.giftCount ?? 0,
        month: key,
        previousGiftCount: previousMonth?.giftCount ?? 0,
        previousMonth: previousMonthKey,
        previousTotalGiven: centsToDecimalString(
          previousMonth?.totalCents ?? 0n,
        ),
        totalGiven: centsToDecimalString(month?.totalCents ?? 0n),
      };
    }),
    monthsWithGiving: months.size,
    reliabilityKinds: Array.from(reliabilityKinds).sort(),
    sourceExplanation: SOURCE_EXPLANATION,
  };
}

const givingFactSummarySelect = {
  amount: true,
  effectiveMonth: true,
  id: true,
  occurredAt: true,
  reliabilityKind: true,
} as const;

function giftDate(fact: GivingFactForSummary) {
  return fact.occurredAt ?? fact.effectiveMonth;
}

function monthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

function lastTwelveMonthKeys(referenceDate: Date) {
  const start = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth() - 11,
      1,
    ),
  );

  return Array.from({ length: 12 }, (_, index) => {
    return monthKey(
      new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
      ),
    );
  });
}

function offsetMonthKey(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);

  return monthKey(new Date(Date.UTC(year, month - 1 + offset, 1)));
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
