import { createRequire } from "node:module";

import type { graphql as graphqlType } from "graphql";
import { describe, expect, it, vi } from "vitest";

import type { GraphQLContext } from "@/lib/graphql/context";
import type { LocalAppUser } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  createGraphQLContext: vi.fn(),
  createDraftGivingPledgeFromRecommendation: vi.fn(),
  createStaffTask: vi.fn(),
  getRockHouseholdProfile: vi.fn(),
  getRockPersonProfile: vi.fn(),
  getSyncStatusSummary: vi.fn(),
  listPledgeCandidates: vi.fn(),
  quickCreateGivingPledge: vi.fn(),
  rejectGivingPledgeRecommendation: vi.fn(),
  listStaffTasks: vi.fn(),
  updateGivingPledge: vi.fn(),
  updateStaffTask: vi.fn(),
}));

vi.mock("@/lib/graphql/context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/graphql/context")>(
    "@/lib/graphql/context",
  );

  return {
    ...actual,
    createGraphQLContext: mocks.createGraphQLContext,
  };
});

vi.mock("@/lib/sync/status", () => ({
  getSyncStatusSummary: mocks.getSyncStatusSummary,
}));

vi.mock("@/lib/tasks/service", () => ({
  createStaffTask: mocks.createStaffTask,
  listStaffTasks: mocks.listStaffTasks,
  updateStaffTask: mocks.updateStaffTask,
}));

vi.mock("@/lib/giving/pledges", () => ({
  createDraftGivingPledgeFromRecommendation:
    mocks.createDraftGivingPledgeFromRecommendation,
  listPledgeCandidates: mocks.listPledgeCandidates,
  quickCreateGivingPledge: mocks.quickCreateGivingPledge,
  rejectGivingPledgeRecommendation: mocks.rejectGivingPledgeRecommendation,
  updateGivingPledge: mocks.updateGivingPledge,
}));

vi.mock("@/lib/people/profiles", () => ({
  getRockHouseholdProfile: mocks.getRockHouseholdProfile,
  getRockPersonProfile: mocks.getRockPersonProfile,
}));

import { schema } from "@/lib/graphql/schema";

const require = createRequire(import.meta.url);
const { graphql } = require("graphql") as {
  graphql: typeof graphqlType;
};

const adminUser: LocalAppUser = {
  id: "user_1",
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN",
  active: true,
  rockPersonId: null,
};

const adminContext: GraphQLContext = {
  accessState: {
    status: "authorized",
    user: adminUser,
  },
};

const financeContext: GraphQLContext = {
  accessState: {
    status: "authorized",
    user: {
      ...adminUser,
      id: "user_2",
      role: "FINANCE",
    },
  },
};

describe("GraphQL API schema", () => {
  it("returns the authorized local app viewer", async () => {
    const result = await graphql({
      contextValue: adminContext,
      schema,
      source: /* GraphQL */ `
        query Viewer {
          viewer {
            id
            email
            role
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      viewer: {
        id: "user_1",
        email: "admin@example.com",
        role: "ADMIN",
      },
    });
  });

  it("denies sensitive data to anonymous callers", async () => {
    const result = await graphql({
      contextValue: {
        accessState: {
          status: "anonymous",
        },
      } satisfies GraphQLContext,
      schema,
      source: /* GraphQL */ `
        query Viewer {
          viewer {
            id
          }
        }
      `,
    });

    expect(result.data).toEqual({ viewer: null });
    expect(result.errors?.[0]).toMatchObject({
      message: "Authentication is required.",
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  });

  it("returns staff-safe sync status and bounds open issue lists", async () => {
    mocks.getSyncStatusSummary.mockResolvedValueOnce({
      latestRun: {
        id: "sync_1",
        source: "rock:v1",
        status: "SUCCEEDED",
        startedAt: new Date("2026-04-18T10:00:00.000Z"),
        completedAt: new Date("2026-04-18T10:01:00.000Z"),
        recordsRead: 180_509,
        recordsWritten: 245_395,
        recordsSkipped: 1,
      },
      recentRuns: [],
      openIssues: Array.from({ length: 60 }, (_value, index) => ({
        id: `issue_${index}`,
        severity: "WARNING",
        source: "rock:v1",
        recordType: "FinancialTransaction",
        rockId: String(index),
        code: "MISSING_REFERENCE",
        message: "A synced record references a missing Rock row.",
        createdAt: new Date("2026-04-18T10:02:00.000Z"),
      })),
      openIssueCount: 60,
      syncedCounts: {
        people: 10,
        households: 2,
        householdMembers: 11,
        connectGroups: 3,
        connectGroupMembers: 4,
        financialTransactions: 5,
        financialTransactionDetails: 6,
        givingFacts: 7,
      },
    });

    const result = await graphql({
      contextValue: adminContext,
      schema,
      source: /* GraphQL */ `
        query SyncStatus {
          syncStatus {
            latestRun {
              status
              recordsRead
            }
            openIssueCount
            openIssues(limit: 500) {
              id
              code
              message
            }
            syncedCounts {
              people
              givingFacts
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data?.syncStatus).toMatchObject({
      latestRun: {
        status: "SUCCEEDED",
        recordsRead: 180_509,
      },
      openIssueCount: 60,
      syncedCounts: {
        people: 10,
        givingFacts: 7,
      },
    });
    expect(
      (result.data?.syncStatus as { openIssues: unknown[] }).openIssues,
    ).toHaveLength(50);
    expect(JSON.stringify(result.data)).not.toMatch(/donor@example|token/i);
  });

  it("creates staff tasks through the app-owned workflow API", async () => {
    mocks.createStaffTask.mockResolvedValueOnce({
      id: "task_1",
      title: "Follow up",
      description: null,
      status: "OPEN",
      priority: "HIGH",
      assignedToUserId: null,
      personRockId: 910001,
      householdRockId: null,
      dueAt: null,
      completedAt: null,
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    });

    const result = await graphql({
      contextValue: adminContext,
      schema,
      source: /* GraphQL */ `
        mutation CreateTask {
          createStaffTask(
            title: "Follow up"
            personRockId: 910001
            priority: HIGH
          ) {
            id
            title
            status
            priority
            personRockId
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      createStaffTask: {
        id: "task_1",
        title: "Follow up",
        status: "OPEN",
        priority: "HIGH",
        personRockId: 910001,
      },
    });
    expect(mocks.createStaffTask).toHaveBeenCalledWith(
      expect.objectContaining({
        personRockId: 910001,
        title: "Follow up",
      }),
      adminContext.accessState.status === "authorized"
        ? adminContext.accessState.user
        : null,
    );
  });

  it("denies task mutations to finance users", async () => {
    const result = await graphql({
      contextValue: financeContext,
      schema,
      source: /* GraphQL */ `
        mutation CreateTask {
          createStaffTask(title: "Call donor", personRockId: 910001) {
            id
          }
        }
      `,
    });

    expect(result.data).toEqual({ createStaffTask: null });
    expect(result.errors?.[0]).toMatchObject({
      message: "You do not have permission to perform this action.",
      extensions: {
        code: "FORBIDDEN",
      },
    });
  });

  it("returns stable bad input errors for invalid task dates", async () => {
    const result = await graphql({
      contextValue: adminContext,
      schema,
      source: /* GraphQL */ `
        mutation CreateTask {
          createStaffTask(title: "Follow up", dueAt: "not-a-date") {
            id
          }
        }
      `,
    });

    expect(result.data).toEqual({ createStaffTask: null });
    expect(result.errors?.[0]).toMatchObject({
      message: "Date values must be valid ISO date strings.",
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  });

  it("returns role-aware Rock person profile data", async () => {
    mocks.getRockPersonProfile.mockResolvedValueOnce({
      amountsHidden: false,
      deceased: false,
      displayName: "Jane Donor",
      email: "jane@example.com",
      emailActive: true,
      firstName: "Jane",
      givingHousehold: {
        active: true,
        archived: false,
        campus: null,
        lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
        name: "Donor Family",
        rockId: 920001,
      },
      givingId: "G-910001",
      givingLeaderRockId: null,
      givingSummary: {
        accountSummaries: [],
        firstGiftAt: new Date("2022-01-12T00:00:00.000Z"),
        lastGiftAmount: "250.00",
        lastGiftAt: new Date("2026-04-07T00:00:00.000Z"),
        lastTwelveMonthsTotal: "3000.00",
        monthlyGiving: [],
        monthsWithGiving: 38,
        reliabilityKinds: ["ONE_OFF"],
        source: "PERSON",
        sourceExplanation:
          "Derived from local GivingFact rows synced from Rock.",
        totalGiven: "12450.00",
      },
      householdMemberships: [],
      lastName: "Donor",
      lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
      nickName: "Jane",
      photoUrl: "/api/rock/person-photo/12345",
      primaryAliasRockId: 1001,
      primaryCampus: {
        name: "North Campus",
        rockId: 30,
        shortCode: "N",
      },
      primaryHousehold: {
        active: true,
        archived: false,
        campus: null,
        lastSyncedAt: new Date("2026-04-18T10:00:00.000Z"),
        name: "Donor Family",
        rockId: 920001,
      },
      pledgeEditor: {
        personRockId: 910001,
        rows: [
          {
            account: {
              active: true,
              name: "General Fund",
              rockId: 101,
            },
            activePledge: null,
            basisMonths: 9,
            confidence: "MEDIUM",
            draftPledge: null,
            explanation:
              "9 of the latest 12 months include giving to this fund.",
            lastGiftAt: new Date("2026-04-07T00:00:00.000Z"),
            lastTwelveMonthsTotal: "3000.00",
            recommendedAmount: "250.00",
            recommendedPeriod: "MONTHLY",
            sourceExplanation:
              "Derived from local GivingFact rows synced from Rock.",
            status: "RECOMMENDED",
          },
        ],
      },
      recordStatus: "Active",
      rockId: 910001,
      staffTasks: [],
    });

    const result = await graphql({
      contextValue: financeContext,
      schema,
      source: /* GraphQL */ `
        query PersonProfile {
          rockPerson(rockId: 910001) {
            displayName
            email
            photoUrl
            amountsHidden
            primaryCampus {
              name
            }
            givingSummary {
              totalGiven
              reliabilityKinds
            }
            pledgeEditor {
              rows {
                status
                recommendedAmount
                account {
                  name
                }
              }
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      rockPerson: {
        amountsHidden: false,
        displayName: "Jane Donor",
        email: "jane@example.com",
        photoUrl: "/api/rock/person-photo/12345",
        givingSummary: {
          reliabilityKinds: ["ONE_OFF"],
          totalGiven: "12450.00",
        },
        pledgeEditor: {
          rows: [
            {
              account: {
                name: "General Fund",
              },
              recommendedAmount: "250.00",
              status: "RECOMMENDED",
            },
          ],
        },
        primaryCampus: {
          name: "North Campus",
        },
      },
    });
    expect(mocks.getRockPersonProfile).toHaveBeenCalledWith(
      { rockId: 910001 },
      financeContext.accessState.status === "authorized"
        ? financeContext.accessState.user
        : null,
    );
  });

  it("creates quick and draft pledges and rejects recommendations through the staff API", async () => {
    const pledge = {
      accountName: "General Fund",
      accountRockId: 101,
      amount: "250.00",
      createdAt: new Date("2026-04-20T10:00:00.000Z"),
      endDate: null,
      id: "pledge_1",
      period: "MONTHLY",
      personRockId: 910001,
      source: "PATTERN_RECOMMENDED",
      startDate: new Date("2026-04-20T10:00:00.000Z"),
      status: "ACTIVE",
      updatedAt: new Date("2026-04-20T10:00:00.000Z"),
    };

    mocks.quickCreateGivingPledge.mockResolvedValueOnce(pledge);
    mocks.createDraftGivingPledgeFromRecommendation.mockResolvedValueOnce({
      ...pledge,
      id: "pledge_2",
      status: "DRAFT",
    });
    mocks.rejectGivingPledgeRecommendation.mockResolvedValueOnce({
      id: "decision_1",
    });

    const quick = await graphql({
      contextValue: financeContext,
      schema,
      source: /* GraphQL */ `
        mutation QuickCreate {
          quickCreateGivingPledge(personRockId: 910001, accountRockId: 101) {
            id
            amount
            status
          }
        }
      `,
    });
    const draft = await graphql({
      contextValue: financeContext,
      schema,
      source: /* GraphQL */ `
        mutation CreateDraft {
          createDraftGivingPledgeFromRecommendation(
            personRockId: 910001
            accountRockId: 101
          ) {
            id
            status
          }
        }
      `,
    });
    const rejected = await graphql({
      contextValue: financeContext,
      schema,
      source: /* GraphQL */ `
        mutation RejectRecommendation {
          rejectGivingPledgeRecommendation(
            personRockId: 910001
            accountRockId: 101
            reason: "Staff judgement"
          )
        }
      `,
    });

    expect(quick.errors).toBeUndefined();
    expect(draft.errors).toBeUndefined();
    expect(rejected.errors).toBeUndefined();
    expect(quick.data).toEqual({
      quickCreateGivingPledge: {
        amount: "250.00",
        id: "pledge_1",
        status: "ACTIVE",
      },
    });
    expect(draft.data).toEqual({
      createDraftGivingPledgeFromRecommendation: {
        id: "pledge_2",
        status: "DRAFT",
      },
    });
    expect(rejected.data).toEqual({
      rejectGivingPledgeRecommendation: true,
    });
  });

  it("returns pledge candidates for future bulk review", async () => {
    mocks.listPledgeCandidates.mockResolvedValueOnce([
      {
        account: {
          active: true,
          name: "General Fund",
          rockId: 101,
        },
        activePledge: null,
        basisMonths: 9,
        confidence: "MEDIUM",
        draftPledge: null,
        explanation: "9 of the latest 12 months include giving to this fund.",
        lastGiftAt: new Date("2026-04-07T00:00:00.000Z"),
        lastTwelveMonthsTotal: "3000.00",
        personDisplayName: "Jane Donor",
        personRockId: 910001,
        recommendedAmount: "250.00",
        recommendedPeriod: "MONTHLY",
        sourceExplanation:
          "Derived from local GivingFact rows synced from Rock.",
        status: "RECOMMENDED",
      },
    ]);

    const result = await graphql({
      contextValue: financeContext,
      schema,
      source: /* GraphQL */ `
        query PledgeCandidates {
          pledgeCandidates(limit: 10) {
            personRockId
            personDisplayName
            recommendedAmount
            account {
              name
            }
          }
        }
      `,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data).toEqual({
      pledgeCandidates: [
        {
          account: {
            name: "General Fund",
          },
          personDisplayName: "Jane Donor",
          personRockId: 910001,
          recommendedAmount: "250.00",
        },
      ],
    });
  });

  it("returns safe not found errors for missing Rock profiles", async () => {
    mocks.getRockHouseholdProfile.mockResolvedValueOnce(null);

    const result = await graphql({
      contextValue: adminContext,
      schema,
      source: /* GraphQL */ `
        query MissingHousehold {
          rockHousehold(rockId: 999999) {
            rockId
          }
        }
      `,
    });

    expect(result.data).toEqual({ rockHousehold: null });
    expect(result.errors?.[0]).toMatchObject({
      message: "Rock household was not found.",
      extensions: {
        code: "NOT_FOUND",
      },
    });
  });

  it("executes a POST request through the Yoga route handler", async () => {
    mocks.createGraphQLContext.mockResolvedValueOnce(adminContext);

    const { POST } = await import("@/app/api/graphql/route");
    const response = await POST(
      new Request("http://localhost/api/graphql", {
        body: JSON.stringify({
          query: /* GraphQL */ `
            query Viewer {
              viewer {
                role
              }
            }
          `,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
      {
        params: Promise.resolve({}),
      },
    );

    await expect(response.json()).resolves.toEqual({
      data: {
        viewer: {
          role: "ADMIN",
        },
      },
    });
  });

  it("disables schema introspection in production route handling", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    mocks.createGraphQLContext.mockResolvedValueOnce(adminContext);

    try {
      const { POST } = await import("@/app/api/graphql/route");
      const response = await POST(
        new Request("http://localhost/api/graphql", {
          body: JSON.stringify({
            query: /* GraphQL */ `
              query Introspection {
                __schema {
                  queryType {
                    name
                  }
                }
              }
            `,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "POST",
        }),
        {
          params: Promise.resolve({}),
        },
      );
      const body = await response.json();

      expect(body.data).toBeUndefined();
      expect(body.errors?.[0]?.message).toContain(
        "GraphQL introspection has been disabled",
      );
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
