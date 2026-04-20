import { describe, expect, it } from "vitest";

import { summarizeGivingFacts } from "@/lib/giving/metrics";

function expectedMonth(
  month: string,
  {
    giftCount = 0,
    previousGiftCount = 0,
    previousTotalGiven = "0.00",
    totalGiven = "0.00",
  }: {
    giftCount?: number;
    previousGiftCount?: number;
    previousTotalGiven?: string;
    totalGiven?: string;
  } = {},
) {
  return {
    giftCount,
    month,
    previousGiftCount,
    previousMonth: offsetMonth(month, -12),
    previousTotalGiven,
    totalGiven,
  };
}

function offsetMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}

describe("giving metrics", () => {
  it("summarizes GivingFact rows without exposing transaction details", () => {
    const summary = summarizeGivingFacts(
      [
        {
          amount: "25.00",
          effectiveMonth: new Date("2025-01-01T00:00:00.000Z"),
          occurredAt: new Date("2025-01-14T00:00:00.000Z"),
          reliabilityKind: "ONE_OFF",
        },
        {
          amount: "100.25",
          effectiveMonth: new Date("2026-01-01T00:00:00.000Z"),
          occurredAt: new Date("2026-01-14T00:00:00.000Z"),
          reliabilityKind: "ONE_OFF",
        },
        {
          amount: "50.00",
          effectiveMonth: new Date("2026-02-01T00:00:00.000Z"),
          occurredAt: null,
          reliabilityKind: "SCHEDULED_RECURRING",
        },
      ],
      new Date("2026-04-19T00:00:00.000Z"),
    );

    expect(summary).toEqual({
      firstGiftAt: new Date("2025-01-14T00:00:00.000Z"),
      lastGiftAmount: "50.00",
      lastGiftAt: new Date("2026-02-01T00:00:00.000Z"),
      lastTwelveMonthsTotal: "150.25",
      monthlyGiving: [
        expectedMonth("2025-05"),
        expectedMonth("2025-06"),
        expectedMonth("2025-07"),
        expectedMonth("2025-08"),
        expectedMonth("2025-09"),
        expectedMonth("2025-10"),
        expectedMonth("2025-11"),
        expectedMonth("2025-12"),
        expectedMonth("2026-01", {
          giftCount: 1,
          previousGiftCount: 1,
          previousTotalGiven: "25.00",
          totalGiven: "100.25",
        }),
        expectedMonth("2026-02", {
          giftCount: 1,
          totalGiven: "50.00",
        }),
        expectedMonth("2026-03"),
        expectedMonth("2026-04"),
      ],
      monthsWithGiving: 3,
      reliabilityKinds: ["ONE_OFF", "SCHEDULED_RECURRING"],
      sourceExplanation: "Derived from local GivingFact rows synced from Rock.",
      totalGiven: "175.25",
    });
  });

  it("returns an empty allowed summary for records without giving facts", () => {
    expect(
      summarizeGivingFacts([], new Date("2026-04-19T00:00:00.000Z")),
    ).toEqual({
      firstGiftAt: null,
      lastGiftAmount: null,
      lastGiftAt: null,
      lastTwelveMonthsTotal: "0.00",
      monthlyGiving: [
        expectedMonth("2025-05"),
        expectedMonth("2025-06"),
        expectedMonth("2025-07"),
        expectedMonth("2025-08"),
        expectedMonth("2025-09"),
        expectedMonth("2025-10"),
        expectedMonth("2025-11"),
        expectedMonth("2025-12"),
        expectedMonth("2026-01"),
        expectedMonth("2026-02"),
        expectedMonth("2026-03"),
        expectedMonth("2026-04"),
      ],
      monthsWithGiving: 0,
      reliabilityKinds: [],
      sourceExplanation: "Derived from local GivingFact rows synced from Rock.",
      totalGiven: "0.00",
    });
  });
});
