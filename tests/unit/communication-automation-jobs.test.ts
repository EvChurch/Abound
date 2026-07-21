import { describe, expect, it, vi } from "vitest";

import {
  enqueueCommunicationAutomationEvaluation,
  performCommunicationAutomationDueSendSweep,
  performCommunicationAutomationEvaluationJob,
  performCommunicationAutomationNoticeJob,
  performCommunicationAutomationSendJob,
  scheduleCommunicationAutomation,
  scheduleKeyForAutomation,
} from "@/lib/communications/automation-jobs";
import {
  COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
  COMMUNICATION_AUTOMATION_NOTICE_QUEUE,
} from "@/lib/sync/job-constants";

const mocks = vi.hoisted(() => ({
  freezeCommunicationAutomationRun: vi.fn(),
}));

vi.mock("@/lib/communications/automation-runs", () => ({
  freezeCommunicationAutomationRun: mocks.freezeCommunicationAutomationRun,
}));

describe("communication automation jobs", () => {
  it("schedules active automations with stable singleton keys", async () => {
    const boss = {
      send: vi.fn(async () => "job_1"),
    };

    await scheduleCommunicationAutomation(
      boss as never,
      {
        id: "automation_1",
        preSendNoticeMinutes: 1440,
        scheduleCron: "0 9 * * 2",
        scheduleTimezone: "America/New_York",
      },
      new Date("2026-07-19T20:30:00.000Z"),
    );

    expect(boss.send).toHaveBeenCalledWith(
      COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
      {
        automationId: "automation_1",
        noticeDueAt: "2026-07-19T21:00:00.000Z",
        scheduledSendAt: "2026-07-20T21:00:00.000Z",
      },
      {
        singletonKey: "automation_1:2026-07-20T21:00:00.000Z",
        startAfter: new Date("2026-07-19T21:00:00.000Z"),
      },
    );
  });

  it("enqueues evaluation jobs with per-window singleton protection", async () => {
    const boss = {
      send: vi.fn(async () => "job_1"),
    };

    await expect(
      enqueueCommunicationAutomationEvaluation(boss as never, {
        automationId: "automation_1",
        scheduledSendAt: "2026-07-07T09:00:00.000Z",
      }),
    ).resolves.toBe("job_1");
    expect(boss.send).toHaveBeenCalledWith(
      COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
      {
        automationId: "automation_1",
        scheduledSendAt: "2026-07-07T09:00:00.000Z",
      },
      {
        singletonKey: "automation_1:2026-07-07T09:00:00.000Z",
      },
    );
  });

  it("evaluates active automations and enqueues notice jobs", async () => {
    mocks.freezeCommunicationAutomationRun.mockResolvedValueOnce({
      id: "run_1",
      status: "PENDING_NOTICE",
    });
    const boss = {
      send: vi.fn(async () => "job_1"),
    };
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          audienceResource: "PEOPLE",
          createdBy: {
            active: true,
            auth0Subject: "auth0|admin",
            email: "admin@example.com",
            id: "user_1",
            name: "Admin",
            rockPersonId: null,
          },
          id: "automation_1",
          nextSendAt: new Date("2026-07-07T09:00:00.000Z"),
          archivedAt: null,
          pausedAt: null,
          preSendNoticeMinutes: 1440,
          scheduleCron: "0 9 * * 2",
        })),
      },
    };

    await expect(
      performCommunicationAutomationEvaluationJob(
        {
          automationId: "automation_1",
        },
        { boss: boss as never, prisma: client as never },
      ),
    ).resolves.toEqual({
      runId: "run_1",
      status: "PENDING_NOTICE",
    });

    expect(mocks.freezeCommunicationAutomationRun).toHaveBeenCalledWith(
      expect.objectContaining({
        automationId: "automation_1",
        scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
      }),
      expect.objectContaining({ id: "user_1" }),
      client,
    );
    expect(boss.send).toHaveBeenCalledWith(
      COMMUNICATION_AUTOMATION_NOTICE_QUEUE,
      { runId: "run_1" },
      { singletonKey: "run_1" },
    );
    expect(boss.send).not.toHaveBeenCalledWith(
      expect.stringContaining("send"),
      expect.anything(),
      expect.anything(),
    );
    expect(boss.send).toHaveBeenCalledWith(
      COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
      {
        automationId: "automation_1",
        noticeDueAt: "2026-07-12T21:00:00.000Z",
        scheduledSendAt: "2026-07-13T21:00:00.000Z",
      },
      {
        singletonKey: "automation_1:2026-07-13T21:00:00.000Z",
        startAfter: new Date("2026-07-12T21:00:00.000Z"),
      },
    );
  });

  it("skips evaluation without enqueuing jobs when no run is created", async () => {
    mocks.freezeCommunicationAutomationRun.mockResolvedValueOnce(null);
    const boss = {
      send: vi.fn(async () => "job_1"),
    };
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          audienceResource: "PEOPLE",
          archivedAt: null,
          createdBy: {
            active: true,
            auth0Subject: "auth0|admin",
            email: "admin@example.com",
            id: "user_1",
            name: "Admin",
            rockPersonId: null,
          },
          id: "automation_1",
          nextSendAt: new Date("2026-07-07T09:00:00.000Z"),
          pausedAt: null,
          preSendNoticeMinutes: 1440,
          scheduleCron: "0 9 * * 2",
        })),
      },
    };

    await expect(
      performCommunicationAutomationEvaluationJob(
        {
          automationId: "automation_1",
        },
        { boss: boss as never, prisma: client as never },
      ),
    ).resolves.toEqual({
      runId: null,
      status: "SKIPPED",
    });

    expect(boss.send).toHaveBeenCalledWith(
      COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
      {
        automationId: "automation_1",
        noticeDueAt: "2026-07-12T21:00:00.000Z",
        scheduledSendAt: "2026-07-13T21:00:00.000Z",
      },
      {
        singletonKey: "automation_1:2026-07-13T21:00:00.000Z",
        startAfter: new Date("2026-07-12T21:00:00.000Z"),
      },
    );
  });

  it("marks notices as sent", async () => {
    const emailSender = {
      send: vi.fn(async () => ({
        providerMessageId: "notice_1",
        status: "ACCEPTED" as const,
      })),
    };
    const createMany = vi.fn(async () => ({ count: 1 }));
    const client = {
      staffTask: {
        createMany,
      },
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: {
            name: "Joining follow-up",
            reviewers: [
              {
                reviewer: {
                  email: "reviewer@example.com",
                  id: "user_2",
                  name: "Reviewer",
                },
                reviewerUserId: "user_2",
              },
            ],
          },
          automationId: "automation_1",
          id: "run_1",
          recipients: [
            {
              displayNameSnapshot: "Jane Citizen",
              emailSnapshot: "jane@example.com",
              person: { photoRockId: 12345 },
              personRockId: 101,
              status: "PENDING",
            },
            {
              displayNameSnapshot: "Sam Visitor",
              emailSnapshot: "sam@example.com",
              person: null,
              personRockId: 102,
              status: "READY",
            },
          ],
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
          status: "PENDING_NOTICE",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };

    await expect(
      performCommunicationAutomationNoticeJob(
        { runId: "run_1" },
        { emailSender, prisma: client as never },
      ),
    ).resolves.toMatchObject({
      runId: "run_1",
      status: "NOTICE_SENT",
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          assignedToUserId: "user_2",
          priority: "HIGH",
          title: "Review communication: Joining follow-up",
        }),
      ],
    });
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Ev Church <info@ev.church>",
        html: expect.stringContaining("Review Joining follow-up"),
        recipientEmail: "reviewer@example.com",
        subject: "Review communication: Joining follow-up",
        text: expect.stringContaining("Recipients: 2"),
      }),
    );
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("2 recipients in this scheduled run"),
        text: expect.stringContaining("Jane Citizen"),
      }),
    );
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("GetImage.ashx?id=12345"),
        text: expect.not.stringContaining("jane@example.com"),
      }),
    );
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Sam Visitor"),
        text: expect.stringContaining("Tuesday, 7 July 2026 at 9:00 pm"),
      }),
    );
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Open review"),
      }),
    );
  });

  it("refuses send processing before the review window elapses", async () => {
    const client = {
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: { archivedAt: null, pausedAt: null },
          deliverableCount: 1,
          id: "run_1",
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
          status: "NOTICE_SENT",
        })),
      },
    };

    await expect(
      performCommunicationAutomationSendJob(
        { runId: "run_1" },
        {
          now: new Date("2026-07-07T08:00:00.000Z"),
          prisma: client as never,
        },
      ),
    ).resolves.toEqual({
      runId: "run_1",
      status: "NOTICE_SENT",
    });
  });

  it("does not send discarded runs even if a send job exists", async () => {
    const emailSender = {
      send: vi.fn(),
    };
    const client = {
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: { archivedAt: null, pausedAt: null },
          deliverableCount: 1,
          id: "run_1",
          recipients: [
            {
              displayNameSnapshot: "Jane Citizen",
              emailSnapshot: "jane@example.com",
              id: "recipient_1",
              status: "READY",
            },
          ],
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
          status: "CANCELED",
        })),
      },
    };

    await expect(
      performCommunicationAutomationSendJob(
        { force: true, runId: "run_1" },
        {
          emailSender,
          now: new Date("2026-07-07T09:00:01.000Z"),
          prisma: client as never,
        },
      ),
    ).resolves.toEqual({
      runId: "run_1",
      status: "CANCELED",
    });
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it("sweeps reviewed runs whose scheduled time has passed", async () => {
    const transaction = vi.fn(async () => undefined);
    const client = {
      $transaction: transaction,
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          automation: {
            cooldownDays: null,
            suppressionMode: "NEVER_RESEND",
          },
          automationId: "automation_1",
          householdRockId: null,
          id: "recipient_1",
          personRockId: 101,
          resource: "PERSON",
          runId: "run_1",
        })),
        update: vi.fn((args) => args),
      },
      communicationAutomationRecipientEvent: {
        create: vi.fn((args) => args),
      },
      communicationAutomationSuppression: {
        upsert: vi.fn((args) => args),
      },
      communicationAutomationRun: {
        findMany: vi.fn(async () => [{ id: "run_1" }]),
        findUnique: vi.fn(async () => ({
          automation: {
            archivedAt: null,
            fromEmail: "hello@example.org",
            fromName: "Church Team",
            pausedAt: null,
            replyToEmail: "reply@example.org",
            templateFields: {
              format: "react-email-editor",
              html: "<p>Hello {{ firstName }}</p>",
              subject: "Hello {{ firstName }}",
              text: "Hello {{ firstName }}",
            },
            templateKey: "joining-never-given",
          },
          automationId: "automation_1",
          deliverableCount: 1,
          id: "run_1",
          recipients: [
            {
              displayNameSnapshot: "Jane Citizen",
              emailSnapshot: "jane@example.com",
              id: "recipient_1",
              status: "READY",
            },
          ],
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
          status: "READY_TO_SEND",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    const emailSender = {
      send: vi.fn(async () => ({
        providerMessageId: "email_123",
        status: "ACCEPTED" as const,
      })),
    };
    const now = new Date("2026-07-07T09:00:01.000Z");

    await expect(
      performCommunicationAutomationDueSendSweep({
        emailSender,
        now,
        prisma: client as never,
      }),
    ).resolves.toEqual({
      processed: 1,
      results: [{ runId: "run_1", status: "SENT" }],
    });
    expect(client.communicationAutomationRun.findMany).toHaveBeenCalledWith({
      orderBy: [
        { scheduledSendAt: "asc" },
        { updatedAt: "asc" },
        { id: "asc" },
      ],
      select: { id: true },
      take: 25,
      where: {
        automation: {
          archivedAt: null,
          pausedAt: null,
        },
        scheduledSendAt: { lte: now },
        status: "READY_TO_SEND",
      },
    });
    expect(emailSender.send).toHaveBeenCalledOnce();
  });

  it("sends due deliverable runs through the configured sender", async () => {
    const transaction = vi.fn(async () => undefined);
    const client = {
      $transaction: transaction,
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          automation: {
            cooldownDays: null,
            suppressionMode: "NEVER_RESEND",
          },
          automationId: "automation_1",
          householdRockId: null,
          id: "recipient_1",
          personRockId: 101,
          resource: "PERSON",
          runId: "run_1",
        })),
        update: vi.fn((args) => args),
      },
      communicationAutomationRecipientEvent: {
        create: vi.fn((args) => args),
      },
      communicationAutomationSuppression: {
        upsert: vi.fn((args) => args),
      },
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: {
            fromEmail: "hello@example.org",
            fromName: "Church Team",
            archivedAt: null,
            pausedAt: null,
            replyToEmail: "reply@example.org",
            templateFields: {
              format: "react-email-editor",
              html: "<p>Hello {{ firstName }}</p>",
              subject: "Hello {{ firstName }}",
              text: "Hello {{ firstName }}",
            },
            templateKey: "joining-never-given",
          },
          automationId: "automation_1",
          deliverableCount: 1,
          id: "run_1",
          recipients: [
            {
              displayNameSnapshot: "Jane Citizen",
              emailSnapshot: "jane@example.com",
              id: "recipient_1",
              status: "READY",
            },
          ],
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
          status: "READY_TO_SEND",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    const emailSender = {
      send: vi.fn(async () => ({
        providerMessageId: "email_123",
        status: "ACCEPTED" as const,
      })),
    };

    await expect(
      performCommunicationAutomationSendJob(
        { runId: "run_1" },
        {
          emailSender,
          now: new Date("2026-07-07T09:00:01.000Z"),
          prisma: client as never,
        },
      ),
    ).resolves.toEqual({
      runId: "run_1",
      status: "SENT",
    });
    expect(emailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Church Team <hello@example.org>",
        html: expect.stringContaining("<p>Hello Jane</p>"),
        recipientEmail: "jane@example.com",
        subject: "Hello Jane",
      }),
    );
    expect(transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({ status: "ACCEPTED" }),
        }),
      ]),
    );
  });

  it("forces ready runs through the sender even before the scheduled time", async () => {
    const transaction = vi.fn(async () => undefined);
    const client = {
      $transaction: transaction,
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          automation: {
            cooldownDays: null,
            suppressionMode: "NEVER_RESEND",
          },
          automationId: "automation_1",
          householdRockId: null,
          id: "recipient_1",
          personRockId: 101,
          resource: "PERSON",
          runId: "run_1",
        })),
        update: vi.fn((args) => args),
      },
      communicationAutomationRecipientEvent: {
        create: vi.fn((args) => args),
      },
      communicationAutomationSuppression: {
        upsert: vi.fn((args) => args),
      },
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: {
            archivedAt: null,
            fromEmail: "hello@example.org",
            fromName: "Church Team",
            pausedAt: null,
            replyToEmail: "reply@example.org",
            templateFields: {
              format: "react-email-editor",
              html: "<p>Hello {{ firstName }}</p>",
              subject: "Hello {{ firstName }}",
              text: "Hello {{ firstName }}",
            },
            templateKey: "joining-never-given",
          },
          automationId: "automation_1",
          deliverableCount: 1,
          id: "run_1",
          recipients: [
            {
              displayNameSnapshot: "Jane Citizen",
              emailSnapshot: "jane@example.com",
              id: "recipient_1",
              status: "READY",
            },
          ],
          scheduledSendAt: new Date("2026-07-08T09:00:00.000Z"),
          status: "READY_TO_SEND",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    const emailSender = {
      send: vi.fn(async () => ({
        providerMessageId: "email_123",
        status: "ACCEPTED" as const,
      })),
    };

    await expect(
      performCommunicationAutomationSendJob(
        { force: true, runId: "run_1" },
        {
          emailSender,
          now: new Date("2026-07-07T09:00:01.000Z"),
          prisma: client as never,
        },
      ),
    ).resolves.toEqual({
      runId: "run_1",
      status: "SENT",
    });
    expect(emailSender.send).toHaveBeenCalledOnce();
  });

  it("does not send recipients excluded during review", async () => {
    const client = {
      communicationAutomationRun: {
        findUnique: vi.fn(async () => ({
          automation: {
            archivedAt: null,
            fromEmail: "hello@example.org",
            fromName: "Church Team",
            pausedAt: null,
            replyToEmail: "reply@example.org",
            templateFields: {
              format: "react-email-editor",
              html: "<p>Hello {{ firstName }}</p>",
              subject: "Hello {{ firstName }}",
              text: "Hello {{ firstName }}",
            },
            templateKey: "joining-never-given",
          },
          automationId: "automation_1",
          deliverableCount: 0,
          id: "run_1",
          recipients: [
            {
              displayNameSnapshot: "Jane Citizen",
              emailSnapshot: "jane@example.com",
              id: "recipient_1",
              status: "EXCLUDED",
            },
          ],
          scheduledSendAt: new Date("2026-07-07T09:00:00.000Z"),
          status: "READY_TO_SEND",
        })),
        update: vi.fn(async ({ data, where }) => ({
          id: where.id,
          ...data,
        })),
      },
    };
    const emailSender = {
      send: vi.fn(),
    };

    await expect(
      performCommunicationAutomationSendJob(
        { runId: "run_1" },
        {
          emailSender,
          now: new Date("2026-07-07T09:00:01.000Z"),
          prisma: client as never,
        },
      ),
    ).resolves.toEqual({
      runId: "run_1",
      status: "SKIPPED",
    });
    expect(emailSender.send).not.toHaveBeenCalled();
  });

  it("validates automation schedule keys", () => {
    expect(scheduleKeyForAutomation("automation_1")).toBe(
      "communication-automation:automation_1",
    );
    expect(() => scheduleKeyForAutomation("")).toThrow("automationId");
  });
});
