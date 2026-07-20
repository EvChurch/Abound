import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  ensureJoiningNeverGivenSavedView,
  joiningNeverGivenFilter,
} from "@/lib/communications/automation-seeds";

const mocks = vi.hoisted(() => ({
  getSavedListView: vi.fn(),
}));

vi.mock("@/lib/list-views/saved-views", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/list-views/saved-views")>();

  return {
    ...actual,
    getSavedListView: mocks.getSavedListView,
  };
});

import {
  archiveCommunicationAutomation,
  createCommunicationAutomation,
  deleteCommunicationAutomation,
  getCommunicationAutomation,
  getCommunicationAutomationLifecycleAction,
  unarchiveCommunicationAutomation,
  updateCommunicationAutomation,
} from "@/lib/communications/automations";

const adminUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  id: "user_1",
  name: "Admin",
  rockPersonId: null,
  role: "ADMIN",
};

const financeUser: LocalAppUser = {
  ...adminUser,
  id: "user_2",
  role: "FINANCE",
};

describe("communication automation service", () => {
  it("includes active runs even when they are outside the recent summary", async () => {
    const summaryRun = {
      id: "run_discarded",
      scheduledSendAt: new Date("2026-07-20T21:00:00.000Z"),
      status: "CANCELED",
      updatedAt: new Date("2026-07-20T20:00:00.000Z"),
    };
    const activeRun = {
      id: "run_active",
      scheduledSendAt: new Date("2026-07-20T21:00:00.000Z"),
      status: "READY_TO_SEND",
      updatedAt: new Date("2026-07-20T22:00:00.000Z"),
    };
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          id: "automation_1",
          runs: [summaryRun],
        })),
      },
      communicationAutomationRun: {
        findMany: vi.fn(async () => [activeRun]),
      },
    } as unknown as PrismaClient;

    await expect(
      getCommunicationAutomation("automation_1", adminUser, client),
    ).resolves.toMatchObject({
      runs: [
        expect.objectContaining({ id: "run_active" }),
        expect.objectContaining({ id: "run_discarded" }),
      ],
    });

    expect(client.communicationAutomationRun.findMany).toHaveBeenCalledWith({
      include: {
        events: true,
        recipients: true,
      },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      where: {
        automationId: "automation_1",
        status: {
          in: ["PENDING_NOTICE", "NOTICE_SENT", "READY_TO_SEND", "SENDING"],
        },
      },
    });
  });

  it("creates an automation from a saved People segment", async () => {
    mocks.getSavedListView.mockResolvedValueOnce({
      filterDefinition: {},
      id: "view_1",
      name: "Joining - Never Given",
      resource: "PEOPLE",
    });

    const create = vi.fn(async ({ data }) => ({
      ...data,
      id: "automation_1",
    }));
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          communicationAutomation: {
            create,
          },
        }),
      ),
      appUser: {
        findMany: vi.fn(async () => [{ id: "user_3" }]),
      },
    } as unknown as PrismaClient;

    await expect(
      createCommunicationAutomation(
        {
          name: "  Joining follow-up  ",
          reviewerUserIds: ["user_3"],
          savedListViewId: "view_1",
          scheduleCron: "0 9 * * 2",
          templateFields: {
            format: "react-email-editor",
            html: "<p>Hello {{ firstName }}</p>",
            subject: "Hello",
          },
          templateKey: "joining-never-given",
        },
        adminUser,
        client,
      ),
    ).resolves.toMatchObject({
      id: "automation_1",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        activatedAt: expect.any(Date),
        activatedByUserId: "user_1",
        audienceResource: "PEOPLE",
        createdByUserId: "user_1",
        name: "Joining follow-up",
        reviewers: {
          create: [{ reviewerUserId: "user_3" }],
        },
        savedListViewId: "view_1",
        segmentSummary: "Saved view: Joining - Never Given",
        suppressionMode: "NEVER_RESEND",
      }),
      include: { reviewers: true },
    });
  });

  it("blocks Finance users from creating automations", async () => {
    await expect(
      createCommunicationAutomation(
        {
          name: "Finance automation",
          reviewerUserIds: ["user_3"],
          savedListViewId: "view_1",
          scheduleCron: "0 9 * * 2",
          templateKey: "joining-never-given",
        },
        financeUser,
        {} as PrismaClient,
      ),
    ).rejects.toMatchObject({
      extensions: { code: "FORBIDDEN" },
    });
  });

  it("rejects invalid cron schedules before creating automations", async () => {
    mocks.getSavedListView.mockResolvedValueOnce({
      filterDefinition: {},
      id: "view_1",
      name: "Joining - Never Given",
      resource: "PEOPLE",
    });

    const transaction = vi.fn();
    const client = {
      $transaction: transaction,
      appUser: {
        findMany: vi.fn(async () => [{ id: "user_3" }]),
      },
    } as unknown as PrismaClient;

    await expect(
      createCommunicationAutomation(
        {
          name: "Joining follow-up",
          reviewerUserIds: ["user_3"],
          savedListViewId: "view_1",
          scheduleCron: "0 25 * * *",
          templateKey: "joining-never-given",
        },
        adminUser,
        client,
      ),
    ).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
      message: "The hour value must be between 0 and 23.",
    });

    expect(transaction).not.toHaveBeenCalled();
  });

  it("updates workflow settings, template fields, and reviewers", async () => {
    mocks.getSavedListView.mockResolvedValueOnce({
      filterDefinition: {},
      id: "view_2",
      name: "Returning Guests",
      resource: "PEOPLE",
    });

    const deleteMany = vi.fn(async () => ({ count: 1 }));
    const updateRuns = vi.fn(async () => ({ count: 1 }));
    const update = vi.fn(async ({ data, where }) => ({
      id: where.id,
      ...data,
    }));
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          communicationAutomation: {
            update,
          },
          communicationAutomationReviewer: {
            deleteMany,
          },
          communicationAutomationRun: {
            updateMany: updateRuns,
          },
        }),
      ),
      appUser: {
        findMany: vi.fn(async () => [{ id: "user_3" }]),
      },
      communicationAutomation: {
        findUnique: vi.fn(async () => ({
          id: "automation_1",
          preSendNoticeMinutes: 1440,
          scheduleCron: "0 9 * * 2",
          templateKey: "joining-never-given",
        })),
      },
    } as unknown as PrismaClient;

    await expect(
      updateCommunicationAutomation(
        {
          id: "automation_1",
          name: " Returning guests ",
          reviewerUserIds: ["user_3"],
          savedListViewId: "view_2",
          scheduleCron: "30 8 * * 1",
          templateFields: {
            format: "react-email-editor",
            html: "<p>Hello {{ firstName }}</p>",
            subject: "Hello",
          },
        },
        adminUser,
        client,
      ),
    ).resolves.toMatchObject({
      id: "automation_1",
      name: "Returning guests",
      savedListViewId: "view_2",
      scheduleCron: "30 8 * * 1",
      segmentSummary: "Saved view: Returning Guests",
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: { automationId: "automation_1" },
    });
    expect(updateRuns).toHaveBeenCalledWith({
      data: {
        noticeDueAt: expect.any(Date),
        scheduledSendAt: expect.any(Date),
      },
      where: {
        automationId: "automation_1",
        status: {
          in: ["PENDING_NOTICE", "NOTICE_SENT", "READY_TO_SEND"],
        },
      },
    });
    expect(update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reviewers: {
          create: [{ reviewerUserId: "user_3" }],
        },
        scheduleTimezone: "Pacific/Auckland",
      }),
      include: expect.any(Object),
      where: { id: "automation_1" },
    });
  });

  it("allows deleting only workflows without runs or sent emails", async () => {
    const deleteAutomation = vi.fn(async () => ({ id: "automation_1" }));
    const client = {
      communicationAutomation: {
        delete: deleteAutomation,
        findUnique: vi.fn(async () => ({
          archivedAt: null,
          id: "automation_1",
        })),
      },
      communicationAutomationRecipient: {
        count: vi.fn(async () => 0),
      },
      communicationAutomationRun: {
        count: vi.fn(async () => 0),
      },
    } as unknown as PrismaClient;

    await expect(
      getCommunicationAutomationLifecycleAction(
        "automation_1",
        adminUser,
        client,
      ),
    ).resolves.toEqual({
      action: "delete",
      hasRuns: false,
      hasSentEmails: false,
    });

    await expect(
      deleteCommunicationAutomation("automation_1", adminUser, client),
    ).resolves.toBe(true);

    expect(deleteAutomation).toHaveBeenCalledWith({
      where: { id: "automation_1" },
    });
  });

  it("blocks deleting workflows with run history", async () => {
    const client = {
      communicationAutomation: {
        delete: vi.fn(),
        findUnique: vi.fn(async () => ({
          archivedAt: null,
          id: "automation_1",
        })),
      },
      communicationAutomationRecipient: {
        count: vi.fn(async () => 0),
      },
      communicationAutomationRun: {
        count: vi.fn(async () => 1),
      },
    } as unknown as PrismaClient;

    await expect(
      getCommunicationAutomationLifecycleAction(
        "automation_1",
        adminUser,
        client,
      ),
    ).resolves.toEqual({
      action: "archive",
      hasRuns: true,
      hasSentEmails: false,
    });

    await expect(
      deleteCommunicationAutomation("automation_1", adminUser, client),
    ).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
  });

  it("archives and unarchives workflows", async () => {
    const update = vi.fn(async ({ data, where }) => ({
      id: where.id,
      ...data,
    }));
    const client = {
      communicationAutomation: {
        findUnique: vi.fn(async () => ({ id: "automation_1" })),
        update,
      },
    } as unknown as PrismaClient;

    await expect(
      archiveCommunicationAutomation("automation_1", adminUser, client),
    ).resolves.toMatchObject({
      archivedAt: expect.any(Date),
      id: "automation_1",
      nextNoticeAt: null,
      nextSendAt: null,
    });

    await expect(
      unarchiveCommunicationAutomation("automation_1", adminUser, client),
    ).resolves.toMatchObject({
      archivedAt: null,
      id: "automation_1",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          archivedAt: expect.any(Date),
          nextNoticeAt: null,
          nextSendAt: null,
        }),
        where: { id: "automation_1" },
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { archivedAt: null },
        where: { id: "automation_1" },
      }),
    );
  });
});

describe("communication automation seed helpers", () => {
  it("creates or returns the Joining and Never Given saved view", async () => {
    const create = vi.fn(async ({ data }) => ({
      ...data,
      id: "view_1",
      updatedAt: new Date("2026-07-02T00:00:00.000Z"),
    }));
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          savedListView: {
            create,
            updateMany: vi.fn(async () => ({ count: 0 })),
          },
        }),
      ),
      savedListView: {
        findMany: vi.fn(async () => []),
      },
    } as unknown as PrismaClient;

    await expect(
      ensureJoiningNeverGivenSavedView(adminUser, client),
    ).resolves.toMatchObject({
      filterDefinition: joiningNeverGivenFilter(),
      id: "view_1",
      name: "Joining - Never Given",
      resource: "PEOPLE",
    });
  });
});
