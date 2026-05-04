import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  getGivingPerAdult,
  getHouseholdDonorTrend,
  summarizeGivingPerAdult,
  summarizeGivingFacts,
  summarizeHouseholdDonorTrend,
} from "@/lib/giving/metrics";

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
          accountRockId: 1,
          amount: "25.00",
          effectiveMonth: new Date("2025-01-01T00:00:00.000Z"),
          occurredAt: new Date("2025-01-14T00:00:00.000Z"),
          reliabilityKind: "ONE_OFF",
        },
        {
          accountRockId: 1,
          amount: "100.25",
          effectiveMonth: new Date("2026-01-01T00:00:00.000Z"),
          occurredAt: new Date("2026-01-14T00:00:00.000Z"),
          reliabilityKind: "ONE_OFF",
        },
        {
          accountRockId: 2,
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
      accountSummaries: [
        expect.objectContaining({
          accountName: "Account 1",
          accountRockId: 1,
          totalGiven: "125.25",
        }),
        expect.objectContaining({
          accountName: "Account 2",
          accountRockId: 2,
          totalGiven: "50.00",
        }),
      ],
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
      accountSummaries: [],
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

  it("summarizes giving per adult from giving households and active pledges", () => {
    const summary = summarizeGivingPerAdult(
      [
        { amount: "1200.00", householdRockId: 10 },
        { amount: "600.00", householdRockId: 10 },
        { amount: "600.00", householdRockId: 20 },
        { amount: "99.00", householdRockId: null },
      ],
      [
        {
          archived: false,
          groupRole: { name: "Adult" },
          householdRockId: 10,
          personRockId: 101,
        },
        {
          archived: false,
          groupRole: { name: "Adult" },
          householdRockId: 10,
          personRockId: 102,
        },
        {
          archived: false,
          groupRole: { name: "Adult" },
          householdRockId: 10,
          personRockId: 102,
        },
        {
          archived: false,
          groupRole: { name: "Child" },
          householdRockId: 10,
          personRockId: 103,
        },
        {
          archived: true,
          groupRole: { name: "Adult" },
          householdRockId: 20,
          personRockId: 104,
        },
        {
          archived: false,
          groupRole: { name: "Adult" },
          householdRockId: 20,
          personRockId: 105,
        },
      ],
      [
        { amount: "120.00", period: "MONTHLY", personRockId: 101 },
        { amount: "1200.00", period: "ANNUALLY", personRockId: 102 },
        { amount: "240.00", period: "QUARTERLY", personRockId: 105 },
      ],
      ["2025-04", "2026-03"],
    );

    expect(summary).toEqual({
      adultCount: 3,
      averagePledge: "100.00",
      medianPledge: "100.00",
      monthlyAverage: "66.67",
      monthlyMedian: "75.00",
      pledgedAdultCount: 3,
      sourceExplanation:
        "Total platform-fund giving for the last 12 completed months divided by active Adult household members in households that gave during that window.",
      totalGiven: "2400.00",
      windowEndedMonth: "2026-03",
      windowStartedMonth: "2025-04",
    });
  });

  it("loads giving per adult through the enabled fund boundary", async () => {
    const client = {
      givingFact: {
        findMany: vi.fn(async () => [
          { amount: "1200.00", householdRockId: 10 },
          { amount: "600.00", householdRockId: 20 },
        ]),
      },
      givingPledge: {
        findMany: vi.fn(async () => [
          { amount: "120.00", period: "MONTHLY", personRockId: 101 },
          { amount: "1200.00", period: "ANNUALLY", personRockId: 102 },
        ]),
      },
      platformFundSetting: {
        findMany: vi.fn(async () => [{ accountRockId: 1, enabled: true }]),
      },
      rockHouseholdMember: {
        findMany: vi.fn(async () => [
          {
            archived: false,
            groupRole: { name: "Adult" },
            householdRockId: 10,
            personRockId: 101,
          },
          {
            archived: false,
            groupRole: { name: "Adult" },
            householdRockId: 10,
            personRockId: 102,
          },
          {
            archived: false,
            groupRole: { name: "Adult" },
            householdRockId: 20,
            personRockId: 103,
          },
        ]),
      },
    } as unknown as PrismaClient;

    const summary = await getGivingPerAdult(
      new Date("2026-04-20T00:00:00.000Z"),
      client,
    );

    expect(client.givingFact.findMany).toHaveBeenCalledWith({
      select: {
        amount: true,
        householdRockId: true,
      },
      where: {
        accountRockId: {
          in: [1],
        },
        effectiveMonth: {
          gte: new Date("2025-04-01T00:00:00.000Z"),
          lt: new Date("2026-04-01T00:00:00.000Z"),
        },
        householdRockId: {
          not: null,
        },
      },
    });
    expect(client.givingPledge.findMany).toHaveBeenCalledWith({
      select: {
        amount: true,
        period: true,
        personRockId: true,
      },
      where: {
        accountRockId: {
          in: [1],
        },
        status: "ACTIVE",
      },
    });
    expect(client.rockHouseholdMember.findMany).toHaveBeenCalledWith({
      select: {
        archived: true,
        groupRole: {
          select: {
            name: true,
          },
        },
        householdRockId: true,
        personRockId: true,
      },
      where: {
        archived: false,
        groupRole: {
          name: {
            equals: "Adult",
            mode: "insensitive",
          },
        },
        household: {
          active: true,
          archived: false,
        },
        householdRockId: {
          in: [10, 20],
        },
      },
    });
    expect(summary).toMatchObject({
      adultCount: 3,
      averagePledge: "110.00",
      medianPledge: "110.00",
      monthlyAverage: "50.00",
      monthlyMedian: "50.00",
      pledgedAdultCount: 2,
      totalGiven: "1800.00",
      windowEndedMonth: "2026-03",
      windowStartedMonth: "2025-04",
    });
    expect(summary.sourceExplanation).toContain(
      "Admin-configured platform fund set.",
    );
  });

  it("counts distinct household donors for each of the last 24 months", () => {
    const trend = summarizeHouseholdDonorTrend(
      [
        {
          campusRockId: 1,
          effectiveMonth: new Date("2024-05-01T00:00:00.000Z"),
          householdRockId: 10,
        },
        {
          campusRockId: 1,
          effectiveMonth: new Date("2026-02-01T00:00:00.000Z"),
          household: {
            campusRockId: 1,
            name: "Parker Household",
          },
          householdRockId: 10,
        },
        {
          campusRockId: 2,
          effectiveMonth: new Date("2025-04-01T00:00:00.000Z"),
          household: {
            campusRockId: 2,
            name: "Ng Household",
          },
          householdRockId: 20,
        },
        {
          campusRockId: 2,
          effectiveMonth: new Date("2026-02-01T00:00:00.000Z"),
          household: {
            campusRockId: 2,
            name: "Ng Household",
          },
          householdRockId: 20,
        },
        {
          campusRockId: 1,
          effectiveMonth: new Date("2026-03-01T00:00:00.000Z"),
          household: {
            campusRockId: 1,
            name: "Parker Household",
          },
          householdRockId: 10,
        },
        {
          campusRockId: 1,
          effectiveMonth: new Date("2026-03-01T00:00:00.000Z"),
          household: {
            campusRockId: 1,
            name: "Rivera Household",
          },
          householdRockId: 30,
        },
        {
          campusRockId: null,
          household: {
            campusRockId: 3,
            name: "Tan Household",
          },
          effectiveMonth: new Date("2025-04-01T00:00:00.000Z"),
          householdRockId: 40,
        },
        {
          campusRockId: null,
          household: {
            campusRockId: 3,
            name: "Tan Household",
          },
          effectiveMonth: new Date("2026-03-01T00:00:00.000Z"),
          householdRockId: 40,
        },
        {
          campusRockId: null,
          effectiveMonth: new Date("2026-04-01T00:00:00.000Z"),
          householdRockId: 30,
        },
        {
          campusRockId: null,
          effectiveMonth: new Date("2026-04-01T00:00:00.000Z"),
          householdRockId: null,
        },
      ],
      new Date("2026-04-20T00:00:00.000Z"),
      new Map([
        [1, { name: "Central", shortCode: "CEN" }],
        [2, { name: "North", shortCode: "NTH" }],
        [3, { name: "East", shortCode: "EST" }],
      ]),
    );

    expect(trend.months).toHaveLength(24);
    expect(trend.months[0]).toEqual({
      householdDonorCount: 0,
      month: "2024-04",
    });
    expect(trend.months[1]).toEqual({
      householdDonorCount: 1,
      month: "2024-05",
    });
    expect(trend.months[11]).toEqual({
      householdDonorCount: 0,
      month: "2025-03",
    });
    expect(trend.months[12]).toEqual({
      householdDonorCount: 2,
      month: "2025-04",
    });
    expect(trend.months[23]).toEqual({
      householdDonorCount: 3,
      month: "2026-03",
    });
    expect(trend.campusSeries).toHaveLength(3);
    expect(trend.campusSeries[0]).toMatchObject({
      atRiskHouseholdDonors: 0,
      campusName: "Central",
      campusRockId: 1,
      campusShortCode: "CEN",
      totalHouseholdDonors: 2,
    });
    expect(trend.campusSeries[0]?.months[0]).toEqual({
      householdDonorCount: 0,
      month: "2024-04",
    });
    expect(trend.campusSeries[0]?.months[1]).toEqual({
      householdDonorCount: 1,
      month: "2024-05",
    });
    expect(trend.campusSeries).toContainEqual(
      expect.objectContaining({
        atRiskHouseholdDonors: 1,
        campusName: "North",
        campusRockId: 2,
        campusShortCode: "NTH",
        totalHouseholdDonors: 1,
      }),
    );
    expect(trend.campusSeries).toContainEqual(
      expect.objectContaining({
        atRiskHouseholdDonors: 0,
        campusName: "East",
        campusRockId: 3,
        campusShortCode: "EST",
        totalHouseholdDonors: 1,
      }),
    );
    expect(
      trend.campusSeries.some(
        (series) => series.campusName === "Unassigned campus",
      ),
    ).toBe(false);
    expect(trend.atRiskHouseholdDonors).toBe(1);
    expect(trend.lifecycleCounts).toEqual({
      AT_RISK: 0,
      DROPPED: 0,
      HEALTHY: 0,
      NEW: 0,
      REACTIVATED: 0,
    });
    expect(trend.totalHouseholdDonors).toBe(4);
    expect(trend.movement).toMatchObject({
      counts: {
        DROPPED: 1,
        NEW: 1,
        REACTIVATED: 1,
        RETAINED: 1,
      },
      latestMonth: "2026-03",
      previousMonth: "2026-02",
    });
    expect(trend.movement.campusSummaries).toContainEqual(
      expect.objectContaining({
        campusName: "Central",
        counts: {
          DROPPED: 0,
          NEW: 1,
          REACTIVATED: 0,
          RETAINED: 1,
        },
      }),
    );
    expect(trend.movement.households).toEqual([
      expect.objectContaining({
        householdName: "Ng Household",
        lastActiveMonth: "2026-02",
        movementKind: "DROPPED",
      }),
      expect.objectContaining({
        householdName: "Tan Household",
        lastActiveMonth: "2025-04",
        movementKind: "REACTIVATED",
      }),
      expect.objectContaining({
        householdName: "Rivera Household",
        lastActiveMonth: null,
        movementKind: "NEW",
      }),
      expect.objectContaining({
        householdName: "Parker Household",
        lastActiveMonth: "2026-02",
        movementKind: "RETAINED",
      }),
    ]);
    expect(trend.sourceExplanation).toBe(
      "Each household is counted once per month, grouped by campus.",
    );
  });

  it("loads dashboard lifecycle counts from distinct person snapshots", async () => {
    const client = {
      givingFact: {
        findMany: vi.fn(async () => []),
      },
      givingLifecycleSnapshot: {
        findMany: vi.fn(async () => [
          { lifecycle: "NEW", personRockId: 101 },
          { lifecycle: "NEW", personRockId: 101 },
          { lifecycle: "NEW", personRockId: 102 },
          { lifecycle: "DROPPED", personRockId: 103 },
          { lifecycle: "AT_RISK", personRockId: null },
        ]),
      },
      platformFundSetting: {
        findMany: vi.fn(async () => [{ accountRockId: 1, enabled: true }]),
      },
    } as unknown as PrismaClient;

    const trend = await getHouseholdDonorTrend(
      new Date("2026-04-20T00:00:00.000Z"),
      client,
    );

    expect(client.givingLifecycleSnapshot.findMany).toHaveBeenCalledWith({
      select: {
        lifecycle: true,
        personRockId: true,
      },
      where: {
        personRockId: {
          not: null,
        },
        resource: "PERSON",
      },
    });
    expect(trend.lifecycleCounts).toEqual({
      AT_RISK: 0,
      DROPPED: 1,
      HEALTHY: 0,
      NEW: 2,
      REACTIVATED: 0,
    });
  });
});
