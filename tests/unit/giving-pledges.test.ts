import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  buildPledgeAnalysisRows,
  createDraftGivingPledgeFromRecommendation,
  quickCreateGivingPledge,
  rejectGivingPledgeRecommendation,
  updateGivingPledge,
} from "@/lib/giving/pledges";

const financeUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|finance",
  email: "finance@example.com",
  id: "user_1",
  name: "Finance",
  rockPersonId: null,
  role: "FINANCE",
};

const pastoralCareUser: LocalAppUser = {
  ...financeUser,
  id: "user_2",
  role: "PASTORAL_CARE",
};

const generalFund = {
  active: true,
  name: "General Fund",
  rockId: 101,
};

const missionsFund = {
  active: true,
  name: "Missions",
  rockId: 102,
};

function monthlyFacts(accountRockId: number, months: string[]) {
  return months.map((month, index) => ({
    accountRockId,
    amount: index % 2 === 0 ? "250.00" : "300.00",
    effectiveMonth: new Date(`${month}-01T00:00:00.000Z`),
    occurredAt: new Date(`${month}-10T00:00:00.000Z`),
  }));
}

function serviceClient(overrides: Partial<PrismaClient> = {}) {
  const facts = monthlyFacts(101, [
    "2025-05",
    "2025-06",
    "2025-07",
    "2025-08",
    "2025-09",
    "2025-10",
    "2025-11",
    "2025-12",
    "2026-01",
  ]);
  const create = vi.fn(async ({ data, include }) => ({
    ...data,
    account: include?.account
      ? { name: "General Fund", rockId: 101 }
      : undefined,
    createdAt: new Date("2026-04-20T10:00:00.000Z"),
    endDate: null,
    id: "pledge_1",
    updatedAt: new Date("2026-04-20T10:00:00.000Z"),
  }));

  return {
    givingFact: {
      findMany: vi.fn(async () => facts),
    },
    givingPledge: {
      create,
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      update: vi.fn(),
    },
    givingPledgeRecommendationDecision: {
      findMany: vi.fn(async () => []),
      upsert: vi.fn(async ({ create }) => ({
        ...create,
        createdAt: new Date("2026-04-20T10:00:00.000Z"),
        decidedAt: new Date("2026-04-20T10:00:00.000Z"),
        id: "decision_1",
        updatedAt: new Date("2026-04-20T10:00:00.000Z"),
      })),
    },
    rockFinancialAccount: {
      findMany: vi.fn(async () => [generalFund, missionsFund]),
      findUnique: vi.fn(async () => generalFund),
    },
    rockPerson: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => ({ rockId: 910001 })),
    },
    ...overrides,
  } as unknown as PrismaClient;
}

describe("giving pledge analysis", () => {
  it("recommends a monthly pledge per fund for consistent giving", () => {
    const rows = buildPledgeAnalysisRows({
      facts: monthlyFacts(101, [
        "2025-05",
        "2025-06",
        "2025-07",
        "2025-08",
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
      ]),
      funds: [generalFund],
      pledges: [],
      referenceDate: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(rows[0]).toMatchObject({
      account: generalFund,
      basisMonths: 8,
      recommendedAmount: "275.00",
      recommendedPeriod: "MONTHLY",
      status: "RECOMMENDED",
    });
  });

  it("does not treat an empty current month as a missing active month", () => {
    const rows = buildPledgeAnalysisRows({
      facts: monthlyFacts(101, [
        "2025-04",
        "2025-05",
        "2025-06",
        "2025-07",
        "2025-08",
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
        "2026-03",
      ]),
      funds: [generalFund],
      pledges: [],
      referenceDate: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(rows[0]).toMatchObject({
      basisMonths: 12,
      status: "RECOMMENDED",
    });
  });

  it("marks a rejected recommendation as not currently recommended", () => {
    const rows = buildPledgeAnalysisRows({
      decisions: [
        {
          accountRockId: 101,
          basisMonthsAtDecision: 8,
          confidenceAtDecision: "MEDIUM",
          createdAt: new Date("2026-04-20T00:00:00.000Z"),
          decidedAt: new Date("2026-04-20T00:00:00.000Z"),
          decidedByUserId: "user_1",
          id: "decision_1",
          lastGiftAtDecision: new Date("2025-12-10T00:00:00.000Z"),
          lastTwelveMonthsTotalAtDecision: "2200.00",
          personRockId: 910001,
          reason: "Staff judgement",
          recommendedAmountAtDecision: "275.00",
          recommendedPeriodAtDecision: "MONTHLY",
          status: "REJECTED",
          updatedAt: new Date("2026-04-20T00:00:00.000Z"),
        },
      ],
      facts: monthlyFacts(101, [
        "2025-05",
        "2025-06",
        "2025-07",
        "2025-08",
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
      ]),
      funds: [generalFund],
      pledges: [],
      referenceDate: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(rows[0]).toMatchObject({
      recommendedAmount: null,
      recommendedPeriod: null,
      status: "REJECTED",
    });
  });

  it("resurfaces a rejected recommendation when confidence increases", () => {
    const rows = buildPledgeAnalysisRows({
      decisions: [
        {
          accountRockId: 101,
          basisMonthsAtDecision: 8,
          confidenceAtDecision: "MEDIUM",
          createdAt: new Date("2026-04-20T00:00:00.000Z"),
          decidedAt: new Date("2026-04-20T00:00:00.000Z"),
          decidedByUserId: "user_1",
          id: "decision_1",
          lastGiftAtDecision: new Date("2025-12-10T00:00:00.000Z"),
          lastTwelveMonthsTotalAtDecision: "2200.00",
          personRockId: 910001,
          reason: null,
          recommendedAmountAtDecision: "275.00",
          recommendedPeriodAtDecision: "MONTHLY",
          status: "REJECTED",
          updatedAt: new Date("2026-04-20T00:00:00.000Z"),
        },
      ],
      facts: monthlyFacts(101, [
        "2025-05",
        "2025-06",
        "2025-07",
        "2025-08",
        "2025-09",
        "2025-10",
        "2025-11",
        "2025-12",
        "2026-01",
        "2026-02",
      ]),
      funds: [generalFund],
      pledges: [],
      referenceDate: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(rows[0]).toMatchObject({
      confidence: "HIGH",
      status: "RECOMMENDED",
    });
  });

  it("treats funds independently and avoids sparse recommendations", () => {
    const rows = buildPledgeAnalysisRows({
      facts: [
        ...monthlyFacts(101, [
          "2025-05",
          "2025-06",
          "2025-07",
          "2025-08",
          "2025-09",
          "2025-10",
          "2025-11",
          "2025-12",
        ]),
        ...monthlyFacts(102, ["2026-01", "2026-03"]),
      ],
      funds: [generalFund, missionsFund],
      pledges: [],
      referenceDate: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(rows.find((row) => row.account.rockId === 101)?.status).toBe(
      "RECOMMENDED",
    );
    expect(rows.find((row) => row.account.rockId === 102)?.status).toBe(
      "INSUFFICIENT_HISTORY",
    );
  });

  it("hides active funds without recent giving or pledge work", () => {
    const rows = buildPledgeAnalysisRows({
      facts: monthlyFacts(101, ["2026-01"]),
      funds: [generalFund, missionsFund],
      pledges: [],
      referenceDate: new Date("2026-04-20T00:00:00.000Z"),
    });

    expect(rows.map((row) => row.account.rockId)).toEqual([101]);
    expect(rows[0]?.status).toBe("INSUFFICIENT_HISTORY");
  });

  it("returns active and draft states when pledge records already exist", () => {
    const now = new Date("2026-04-20T00:00:00.000Z");
    const rows = buildPledgeAnalysisRows({
      facts: monthlyFacts(101, ["2026-01"]),
      funds: [generalFund, missionsFund],
      pledges: [
        {
          account: { name: "General Fund", rockId: 101 },
          accountRockId: 101,
          amount: "250.00",
          createdAt: now,
          endDate: null,
          id: "pledge_active",
          period: "MONTHLY",
          personRockId: 910001,
          source: "PATTERN_RECOMMENDED",
          startDate: now,
          status: "ACTIVE",
          updatedAt: now,
        },
        {
          account: { name: "Missions", rockId: 102 },
          accountRockId: 102,
          amount: "100.00",
          createdAt: now,
          endDate: null,
          id: "pledge_draft",
          period: "MONTHLY",
          personRockId: 910001,
          source: "PATTERN_RECOMMENDED",
          startDate: now,
          status: "DRAFT",
          updatedAt: now,
        },
      ],
      referenceDate: now,
    });

    expect(rows.find((row) => row.account.rockId === 101)?.status).toBe(
      "ACTIVE_PLEDGE_EXISTS",
    );
    expect(rows.find((row) => row.account.rockId === 102)?.status).toBe(
      "DRAFT_EXISTS",
    );
  });

  it("quick creates an active pledge from a recommendation", async () => {
    const client = serviceClient();

    await expect(
      quickCreateGivingPledge(
        { accountRockId: 101, personRockId: 910001 },
        financeUser,
        client,
      ),
    ).resolves.toMatchObject({
      amount: "250.00",
      period: "MONTHLY",
      status: "ACTIVE",
    });

    expect(client.givingPledge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "PATTERN_RECOMMENDED",
          status: "ACTIVE",
        }),
      }),
    );
  });

  it("creates persisted drafts from recommendations", async () => {
    const client = serviceClient();

    await expect(
      createDraftGivingPledgeFromRecommendation(
        { accountRockId: 101, personRockId: 910001 },
        financeUser,
        client,
      ),
    ).resolves.toMatchObject({
      status: "DRAFT",
    });
  });

  it("persists rejected recommendations from the current recommendation snapshot", async () => {
    const client = serviceClient();

    await expect(
      rejectGivingPledgeRecommendation(
        {
          accountRockId: 101,
          personRockId: 910001,
          reason: "Not appropriate now",
        },
        financeUser,
        client,
      ),
    ).resolves.toMatchObject({
      accountRockId: 101,
      basisMonthsAtDecision: 9,
      reason: "Not appropriate now",
      status: "REJECTED",
    });

    expect(client.givingPledgeRecommendationDecision.upsert).toHaveBeenCalled();
  });

  it("blocks pastoral care from pledge mutation", async () => {
    await expect(
      quickCreateGivingPledge(
        { accountRockId: 101, personRockId: 910001 },
        pastoralCareUser,
        serviceClient(),
      ),
    ).rejects.toMatchObject({
      extensions: {
        code: "FORBIDDEN",
      },
    });
  });

  it("rejects conflicting active pledges for the same person and fund", async () => {
    const client = serviceClient();

    vi.mocked(client.givingPledge.findFirst).mockResolvedValueOnce({
      id: "existing",
    } as never);

    await expect(
      quickCreateGivingPledge(
        { accountRockId: 101, personRockId: 910001 },
        financeUser,
        client,
      ),
    ).rejects.toMatchObject({
      message: "An active pledge already exists for this person and fund.",
    });
  });

  it("validates draft activation against active pledge conflicts", async () => {
    const now = new Date("2026-04-20T00:00:00.000Z");
    const client = serviceClient();

    vi.mocked(client.givingPledge.findFirst).mockResolvedValueOnce({
      id: "existing",
    } as never);
    vi.mocked(client.givingPledge.findUnique).mockResolvedValueOnce({
      account: { name: "General Fund", rockId: 101 },
      accountRockId: 101,
      amount: "200.00",
      createdAt: now,
      endDate: null,
      id: "pledge_1",
      period: "MONTHLY",
      personRockId: 910001,
      source: "STAFF_ENTERED",
      startDate: now,
      status: "DRAFT",
      updatedAt: now,
    } as never);

    await expect(
      updateGivingPledge(
        { id: "pledge_1", status: "ACTIVE" },
        financeUser,
        client,
      ),
    ).rejects.toMatchObject({
      message: "An active pledge already exists for this person and fund.",
    });
  });
});
