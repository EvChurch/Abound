import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  clampLimit,
  createStaffTask,
  listStaffTasks,
  updateStaffTask,
} from "@/lib/tasks/service";

const adminUser: LocalAppUser = {
  id: "user_1",
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN",
  active: true,
  rockPersonId: null,
};

const pastoralCareUser: LocalAppUser = {
  ...adminUser,
  id: "user_2",
  role: "PASTORAL_CARE",
};

const financeUser: LocalAppUser = {
  ...adminUser,
  id: "user_3",
  role: "FINANCE",
};

describe("staff task service", () => {
  it("allows pastoral care users to create app-owned follow-up tasks", async () => {
    const create = vi.fn(async ({ data }) => ({
      id: "task_1",
      status: "OPEN",
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      completedAt: null,
      ...data,
    }));
    const client = {
      appUser: {
        findUnique: vi.fn(async () => null),
      },
      rockHousehold: {
        findUnique: vi.fn(async () => ({ rockId: 920001 })),
      },
      rockPerson: {
        findUnique: vi.fn(async () => null),
      },
      staffTask: {
        create,
      },
    } as unknown as PrismaClient;

    await expect(
      createStaffTask(
        {
          title: "  Follow up on recurring giving interruption  ",
          householdRockId: 920001,
          priority: "HIGH",
        },
        pastoralCareUser,
        client,
      ),
    ).resolves.toMatchObject({
      title: "Follow up on recurring giving interruption",
      householdRockId: 920001,
      priority: "HIGH",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        householdRockId: 920001,
        personRockId: null,
      }),
    });
  });

  it("allows local workflow tasks without Rock anchors", async () => {
    const create = vi.fn(async ({ data }) => ({
      id: "task_1",
      status: "OPEN",
      createdAt: new Date("2026-04-18T10:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      completedAt: null,
      ...data,
    }));
    const client = {
      appUser: {
        findUnique: vi.fn(async () => null),
      },
      rockHousehold: {
        findUnique: vi.fn(async () => null),
      },
      rockPerson: {
        findUnique: vi.fn(async () => null),
      },
      staffTask: {
        create,
      },
    } as unknown as PrismaClient;

    await expect(
      createStaffTask(
        {
          title: "Review sync issue queue",
        },
        pastoralCareUser,
        client,
      ),
    ).resolves.toMatchObject({
      title: "Review sync issue queue",
      householdRockId: null,
      personRockId: null,
    });
  });

  it("blocks finance users from mutating care workflow tasks", async () => {
    const client = {} as PrismaClient;

    await expect(
      createStaffTask(
        {
          title: "Call donor",
          personRockId: 910001,
        },
        financeUser,
        client,
      ),
    ).rejects.toMatchObject({
      extensions: {
        code: "FORBIDDEN",
      },
    });
  });

  it("requires task anchors to point at synced Rock people or households", async () => {
    const client = {
      appUser: {
        findUnique: vi.fn(async () => null),
      },
      rockHousehold: {
        findUnique: vi.fn(async () => null),
      },
      rockPerson: {
        findUnique: vi.fn(async () => null),
      },
    } as unknown as PrismaClient;

    await expect(
      createStaffTask(
        {
          title: "Investigate giving data cleanup",
          personRockId: 123,
        },
        adminUser,
        client,
      ),
    ).rejects.toMatchObject({
      message: "Staff task person link was not found.",
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  });

  it("rejects blank assignee ids before Prisma can throw relation errors", async () => {
    const client = {} as PrismaClient;

    await expect(
      createStaffTask(
        {
          title: "Assign me safely",
          assignedToUserId: "   ",
        },
        adminUser,
        client,
      ),
    ).rejects.toMatchObject({
      message: "Staff task assignee must be a non-empty id.",
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  });

  it("marks completed tasks with a completion timestamp", async () => {
    const update = vi.fn(async ({ data, where }) => ({
      id: where.id,
      title: "Follow up",
      description: null,
      status: data.status,
      priority: "NORMAL",
      assignedToUserId: null,
      personRockId: 910001,
      householdRockId: null,
      dueAt: null,
      completedAt: data.completedAt,
      createdAt: new Date("2026-04-18T09:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
    }));
    const client = {
      staffTask: {
        findUnique: vi.fn(async () => ({ id: "task_1" })),
        update,
      },
    } as unknown as PrismaClient;

    await expect(
      updateStaffTask(
        {
          id: "task_1",
          status: "COMPLETED",
        },
        adminUser,
        client,
      ),
    ).resolves.toMatchObject({
      id: "task_1",
      status: "COMPLETED",
      completedAt: expect.any(Date),
    });
  });

  it("validates task reassignment through active local app users", async () => {
    const client = {
      appUser: {
        findUnique: vi.fn(async () => null),
      },
      staffTask: {
        findUnique: vi.fn(async () => ({ id: "task_1" })),
      },
    } as unknown as PrismaClient;

    await expect(
      updateStaffTask(
        {
          id: "task_1",
          assignedToUserId: "missing_user",
        },
        adminUser,
        client,
      ),
    ).rejects.toMatchObject({
      message: "Staff task assignee was not found.",
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  });

  it("lets staff clear an assignment explicitly with null", async () => {
    const update = vi.fn(async ({ data, where }) => ({
      id: where.id,
      title: "Follow up",
      description: null,
      status: "OPEN",
      priority: "NORMAL",
      assignedToUserId: null,
      personRockId: 910001,
      householdRockId: null,
      dueAt: null,
      completedAt: null,
      createdAt: new Date("2026-04-18T09:00:00.000Z"),
      updatedAt: new Date("2026-04-18T10:00:00.000Z"),
      ...data,
    }));
    const client = {
      staffTask: {
        findUnique: vi.fn(async () => ({ id: "task_1" })),
        update,
      },
    } as unknown as PrismaClient;

    await updateStaffTask(
      {
        id: "task_1",
        assignedToUserId: null,
      },
      adminUser,
      client,
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedTo: {
            disconnect: true,
          },
        }),
      }),
    );
  });

  it("bounds staff task list limits", async () => {
    expect(clampLimit(undefined)).toBe(20);
    expect(clampLimit(0)).toBe(20);
    expect(clampLimit(10.8)).toBe(10);
    expect(clampLimit(500)).toBe(50);
  });

  it("lists task records for users with workflow permission", async () => {
    const findMany = vi.fn(async () => []);
    const client = {
      staffTask: {
        findMany,
      },
    } as unknown as PrismaClient;

    await listStaffTasks({ limit: 500, status: "OPEN" }, adminUser, client);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: {
          status: "OPEN",
        },
      }),
    );
  });
});
