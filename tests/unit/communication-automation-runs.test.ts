import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  resolveCommunicationAudienceMembers: vi.fn(),
}));

vi.mock("@/lib/communications/segments", () => ({
  resolveCommunicationAudienceMembers:
    mocks.resolveCommunicationAudienceMembers,
}));

import {
  cancelAutomationRun,
  cancelAutomationRunReview,
  completeAutomationRunReview,
  excludeAutomationRecipient,
  freezeCommunicationAutomationRun,
  prepareAutomationRunSendNow,
  runCommunicationAutomationNow,
  updateAutomationRecipientReviewDecision,
} from "@/lib/communications/automation-runs";

const adminUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  id: "user_1",
  name: "Admin",
  rockPersonId: null,
  role: "ADMIN",
};

const pastoralReviewer: LocalAppUser = {
  ...adminUser,
  id: "user_2",
  role: "PASTORAL_CARE",
};

const financeUser: LocalAppUser = {
  ...adminUser,
  id: "user_3",
  role: "FINANCE",
};

describe("communication automation scheduled runs", () => {
  it("freezes matching recipients and skips missing email recipients", async () => {
    mocks.resolveCommunicationAudienceMembers.mockResolvedValueOnce({
      audienceSize: 2,
      audienceTruncated: false,
      preview: [
        {
          campusName: "North",
          contactReady: true,
          contactState: "Email-ready",
          displayName: "Jane Joining",
          email: "jane@example.com",
          explanation: "Never given.",
          householdName: "Joining Household",
          resource: "PERSON",
          rockId: 101,
        },
        {
          campusName: "North",
          contactReady: false,
          contactState: "Missing email",
          displayName: "No Email",
          email: null,
          explanation: "Never given.",
          householdName: "No Email Household",
          resource: "PERSON",
          rockId: 102,
        },
      ],
      resource: "PEOPLE",
      savedViewId: "view_1",
      segmentDefinition: {},
      segmentSummary: "Saved view: Joining - Never Given",
    });

    const create = vi.fn(async ({ data }) => ({
      ...data,
      id: "run_1",
      recipients: data.recipients.create,
    }));
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          audienceResource: "PEOPLE",
          archivedAt: null,
          cooldownDays: null,
          id: "automation_1",
          pausedAt: null,
          savedListViewId: "view_1",
          suppressionMode: "NEVER_RESEND",
        })),
      },
      communicationAutomationRun: {
        create,
        findFirst: vi.fn(async () => null),
      },
      communicationAutomationSuppression: {
        findUnique: vi.fn(async () => null),
      },
    } as unknown as PrismaClient;

    await expect(
      freezeCommunicationAutomationRun(
        {
          automationId: "automation_1",
          noticeDueAt: new Date("2026-07-06T09:00:00.000Z"),
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
        },
        adminUser,
        client,
      ),
    ).resolves.toMatchObject({
      deliverableCount: 1,
      recipientCount: 2,
      skippedCount: 1,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipients: {
          create: expect.arrayContaining([
            expect.objectContaining({
              emailSnapshot: "jane@example.com",
              recipientKey: "PERSON:101",
              status: "READY",
            }),
            expect.objectContaining({
              recipientKey: "PERSON:102",
              skipReason: "Missing email",
              status: "SKIPPED",
            }),
          ]),
        },
      }),
      include: { recipients: true },
    });
  });

  it("omits recipients who already received a send-once automation", async () => {
    mocks.resolveCommunicationAudienceMembers.mockResolvedValueOnce({
      audienceSize: 1,
      audienceTruncated: false,
      preview: [
        {
          campusName: null,
          contactReady: true,
          contactState: "Email-ready",
          displayName: "Repeat Recipient",
          email: "repeat@example.com",
          explanation: "Never given.",
          householdName: null,
          resource: "PERSON",
          rockId: 201,
        },
      ],
      resource: "PEOPLE",
      savedViewId: "view_1",
      segmentDefinition: {},
      segmentSummary: "Saved view: Joining - Never Given",
    });

    const create = vi.fn();
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          audienceResource: "PEOPLE",
          archivedAt: null,
          cooldownDays: null,
          id: "automation_1",
          pausedAt: null,
          savedListViewId: "view_1",
          suppressionMode: "NEVER_RESEND",
        })),
      },
      communicationAutomationRun: {
        create,
        findFirst: vi.fn(async () => null),
      },
      communicationAutomationSuppression: {
        findUnique: vi.fn(async () => ({
          acceptedAt: new Date("2026-07-01T09:00:00.000Z"),
          recipientKey: "PERSON:201",
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      freezeCommunicationAutomationRun(
        {
          automationId: "automation_1",
          noticeDueAt: new Date("2026-07-06T09:00:00.000Z"),
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
        },
        adminUser,
        client,
      ),
    ).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("omits permanently excluded recipients from future runs", async () => {
    mocks.resolveCommunicationAudienceMembers.mockResolvedValueOnce({
      audienceSize: 1,
      audienceTruncated: false,
      preview: [
        {
          campusName: null,
          contactReady: true,
          contactState: "Email-ready",
          displayName: "Excluded Recipient",
          email: "excluded@example.com",
          explanation: "Never given.",
          householdName: null,
          resource: "PERSON",
          rockId: 301,
        },
      ],
      resource: "PEOPLE",
      savedViewId: "view_1",
      segmentDefinition: {},
      segmentSummary: "Saved view: Joining - Never Given",
    });

    const create = vi.fn();
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          audienceResource: "PEOPLE",
          archivedAt: null,
          cooldownDays: null,
          id: "automation_1",
          pausedAt: null,
          savedListViewId: "view_1",
          suppressionMode: "NEVER_RESEND",
        })),
      },
      communicationAutomationRun: {
        create,
        findFirst: vi.fn(async () => null),
      },
      communicationAutomationSuppression: {
        findUnique: vi.fn(async () => ({
          acceptedAt: new Date("2026-07-01T09:00:00.000Z"),
          eligibleAfter: null,
          providerMessageId: null,
          recipientKey: "PERSON:301",
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      freezeCommunicationAutomationRun(
        {
          automationId: "automation_1",
          noticeDueAt: new Date("2026-07-06T09:00:00.000Z"),
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
        },
        adminUser,
        client,
      ),
    ).resolves.toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a pending review run for the next scheduled send time", async () => {
    mocks.resolveCommunicationAudienceMembers.mockResolvedValueOnce({
      audienceSize: 1,
      audienceTruncated: false,
      preview: [
        {
          campusName: "North",
          contactReady: true,
          contactState: "Email-ready",
          displayName: "Jane Joining",
          email: "jane@example.com",
          explanation: "Never given.",
          householdName: "Joining Household",
          resource: "PERSON",
          rockId: 101,
        },
      ],
      resource: "PEOPLE",
      savedViewId: "view_1",
      segmentDefinition: {},
      segmentSummary: "Saved view: Joining - Never Given",
    });

    const now = new Date("2026-07-15T10:30:00.000Z");
    const scheduledSendAt = new Date("2026-07-20T21:00:00.000Z");
    const create = vi.fn(async ({ data }) => ({
      ...data,
      id: "run_now",
      recipients: data.recipients.create,
    }));
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          audienceResource: "PEOPLE",
          archivedAt: null,
          cooldownDays: null,
          id: "automation_1",
          pausedAt: null,
          scheduleCron: "0 9 * * 2",
          savedListViewId: "view_1",
          suppressionMode: "NEVER_RESEND",
        })),
      },
      communicationAutomationRun: {
        create,
        findFirst: vi.fn(async () => null),
        findUnique: vi.fn(async () => null),
      },
      communicationAutomationSuppression: {
        findUnique: vi.fn(async () => null),
      },
    } as unknown as PrismaClient;

    await expect(
      runCommunicationAutomationNow(
        {
          automationId: "automation_1",
          now,
        },
        adminUser,
        client,
      ),
    ).resolves.toMatchObject({
      id: "run_now",
      scheduledSendAt,
      status: "PENDING_NOTICE",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        noticeDueAt: now,
        scheduledSendAt,
        status: "PENDING_NOTICE",
      }),
      include: { recipients: true },
    });
  });

  it("returns the existing active scheduled run instead of creating another one", async () => {
    const existingRun = {
      id: "run_existing",
      recipients: [],
      scheduledSendAt: new Date("2026-07-20T21:00:00.000Z"),
      status: "READY_TO_SEND",
    };
    const create = vi.fn();
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          scheduleCron: "0 9 * * 2",
        })),
      },
      communicationAutomationRun: {
        create,
        findFirst: vi.fn(async () => existingRun),
      },
    } as unknown as PrismaClient;

    await expect(
      runCommunicationAutomationNow(
        {
          automationId: "automation_1",
          now: new Date("2026-07-15T10:30:00.000Z"),
        },
        adminUser,
        client,
      ),
    ).resolves.toBe(existingRun);

    expect(create).not.toHaveBeenCalled();
  });

  it("creates a fresh run when the matching scheduled time was discarded", async () => {
    mocks.resolveCommunicationAudienceMembers.mockResolvedValueOnce({
      audienceSize: 1,
      audienceTruncated: false,
      preview: [
        {
          campusName: "North",
          contactReady: true,
          contactState: "Email-ready",
          displayName: "Jane Joining",
          email: "jane@example.com",
          explanation: "Never given.",
          householdName: "Joining Household",
          resource: "PERSON",
          rockId: 101,
        },
      ],
      resource: "PEOPLE",
      savedViewId: "view_1",
      segmentDefinition: {},
      segmentSummary: "Saved view: Joining - Never Given",
    });

    const now = new Date("2026-07-15T10:30:00.000Z");
    const scheduledSendAt = new Date("2026-07-20T21:00:00.000Z");
    const create = vi.fn(async ({ data }) => ({
      ...data,
      id: "run_new",
      recipients: data.recipients.create,
    }));
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          audienceResource: "PEOPLE",
          archivedAt: null,
          cooldownDays: null,
          id: "automation_1",
          pausedAt: null,
          scheduleCron: "0 9 * * 2",
          savedListViewId: "view_1",
          suppressionMode: "EVERY_RUN",
        })),
      },
      communicationAutomationRun: {
        create,
        findFirst: vi.fn(async () => null),
      },
      communicationAutomationSuppression: {
        findUnique: vi.fn(async () => null),
      },
    } as unknown as PrismaClient;

    await expect(
      runCommunicationAutomationNow(
        {
          automationId: "automation_1",
          now,
        },
        adminUser,
        client,
      ),
    ).resolves.toMatchObject({
      id: "run_new",
      scheduledSendAt,
      status: "PENDING_NOTICE",
    });

    expect(client.communicationAutomationRun.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: ["PENDING_NOTICE", "NOTICE_SENT", "READY_TO_SEND", "SENDING"],
          },
        }),
      }),
    );
    expect(create).toHaveBeenCalled();
  });

  it("lets selected reviewers exclude recipients", async () => {
    const updateRecipient = vi.fn(async ({ data, where }) => ({
      id: where.id,
      ...data,
    }));
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          communicationAutomationRecipient: {
            update: updateRecipient,
          },
          communicationAutomationRun: {
            update: vi.fn(async () => null),
          },
        }),
      ),
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          id: "recipient_1",
          runId: "run_1",
          run: {
            automation: {
              reviewers: [{ reviewerUserId: "user_2" }],
            },
          },
          status: "READY",
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      excludeAutomationRecipient(
        {
          reason: "Needs personal follow-up first",
          recipientId: "recipient_1",
        },
        pastoralReviewer,
        client,
      ),
    ).resolves.toMatchObject({
      excludedByUserId: "user_2",
      exclusionReason: "Needs personal follow-up first",
      status: "EXCLUDED",
    });
  });

  it("updates review decisions and creates permanent suppressions", async () => {
    const updateRecipient = vi.fn(async ({ data, where }) => ({
      id: where.id,
      ...data,
    }));
    const upsertSuppression = vi.fn(async () => null);
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          communicationAutomationRecipient: {
            update: updateRecipient,
          },
          communicationAutomationRun: {
            update: vi.fn(async () => null),
          },
          communicationAutomationSuppression: {
            deleteMany: vi.fn(async () => null),
            upsert: upsertSuppression,
          },
        }),
      ),
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          automationId: "automation_1",
          excludedAt: null,
          householdRockId: null,
          id: "recipient_1",
          personRockId: 101,
          resource: "PERSON",
          runId: "run_1",
          run: {
            automation: {
              reviewers: [{ reviewerUserId: "user_2" }],
            },
          },
          status: "READY",
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      updateAutomationRecipientReviewDecision(
        {
          decision: "PERMANENTLY_EXCLUDE",
          recipientId: "recipient_1",
        },
        pastoralReviewer,
        client,
      ),
    ).resolves.toMatchObject({
      exclusionReason: "Permanently excluded from this workflow.",
      status: "EXCLUDED",
    });

    expect(upsertSuppression).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          automationId: "automation_1",
          eligibleAfter: null,
          personRockId: 101,
          recipientKey: "PERSON:101",
        }),
      }),
    );
  });

  it("can restore an excluded recipient to send", async () => {
    const updateRecipient = vi.fn(async ({ data, where }) => ({
      id: where.id,
      ...data,
    }));
    const deleteSuppression = vi.fn(async () => null);
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          communicationAutomationRecipient: {
            update: updateRecipient,
          },
          communicationAutomationRun: {
            update: vi.fn(async () => null),
          },
          communicationAutomationSuppression: {
            deleteMany: deleteSuppression,
          },
        }),
      ),
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          automationId: "automation_1",
          excludedAt: new Date("2026-07-08T00:00:00.000Z"),
          householdRockId: null,
          id: "recipient_1",
          personRockId: 101,
          resource: "PERSON",
          runId: "run_1",
          run: {
            automation: {
              reviewers: [{ reviewerUserId: "user_2" }],
            },
          },
          status: "EXCLUDED",
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      updateAutomationRecipientReviewDecision(
        {
          decision: "SEND",
          recipientId: "recipient_1",
        },
        pastoralReviewer,
        client,
      ),
    ).resolves.toMatchObject({
      excludedAt: null,
      status: "READY",
    });

    expect(deleteSuppression).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          automationId: "automation_1",
          providerMessageId: null,
          recipientKey: "PERSON:101",
        }),
      }),
    );
  });

  it("completes run review and marks the run ready to send", async () => {
    const client = {
      communicationAutomationRecipient: {
        count: vi
          .fn()
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(0),
        findUnique: vi.fn(async () => ({
          automationId: "automation_1",
          excludedAt: null,
          householdRockId: null,
          id: "recipient_1",
          personRockId: 101,
          resource: "PERSON",
          runId: "run_1",
          run: {
            automation: {
              reviewers: [{ reviewerUserId: "user_2" }],
            },
          },
          status: "READY",
        })),
      },
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: {
            reviewers: [{ reviewerUserId: "user_2" }],
          },
          id: "run_1",
          recipients: [
            {
              id: "recipient_1",
            },
          ],
          status: "PENDING_NOTICE",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          communicationAutomationRecipient: {
            update: vi.fn(async ({ data, where }) => ({
              id: where.id,
              ...data,
            })),
          },
          communicationAutomationRun: {
            update: vi.fn(async () => null),
          },
          communicationAutomationSuppression: {
            deleteMany: vi.fn(async () => null),
          },
        }),
      ),
    } as unknown as PrismaClient;

    await expect(
      completeAutomationRunReview(
        {
          decisions: [{ decision: "SEND", recipientId: "recipient_1" }],
          runId: "run_1",
        },
        pastoralReviewer,
        client,
      ),
    ).resolves.toMatchObject({
      deliverableCount: 1,
      excludedCount: 1,
      skippedCount: 0,
      status: "READY_TO_SEND",
    });
  });

  it("rejects a pending run review", async () => {
    const client = {
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: {
            reviewers: [{ reviewerUserId: "user_2" }],
          },
          id: "run_1",
          status: "PENDING_NOTICE",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      cancelAutomationRunReview(
        {
          runId: "run_1",
        },
        pastoralReviewer,
        client,
      ),
    ).resolves.toMatchObject({
      status: "CANCELED",
    });
  });

  it("cancels a ready scheduled run before it sends", async () => {
    const client = {
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: {
            reviewers: [{ reviewerUserId: "user_2" }],
          },
          id: "run_1",
          status: "READY_TO_SEND",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      cancelAutomationRun(
        {
          runId: "run_1",
        },
        pastoralReviewer,
        client,
      ),
    ).resolves.toMatchObject({
      status: "CANCELED",
    });
  });

  it("moves a ready run scheduled time to now for immediate sending", async () => {
    const now = new Date("2026-07-07T10:00:00.000Z");
    const client = {
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: {
            reviewers: [{ reviewerUserId: "user_2" }],
          },
          id: "run_1",
          status: "READY_TO_SEND",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      prepareAutomationRunSendNow(
        {
          now,
          runId: "run_1",
        },
        pastoralReviewer,
        client,
      ),
    ).resolves.toMatchObject({
      scheduledSendAt: now,
    });
  });

  it("blocks Finance users from freezing runs", async () => {
    await expect(
      freezeCommunicationAutomationRun(
        {
          automationId: "automation_1",
          noticeDueAt: new Date("2026-07-06T09:00:00.000Z"),
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
        },
        financeUser,
        {} as PrismaClient,
      ),
    ).rejects.toMatchObject({
      extensions: { code: "FORBIDDEN" },
    });
  });
});
