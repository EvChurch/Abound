import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  archiveSavedListView,
  createSavedListView,
  getSavedListView,
  listSavedListViews,
  revalidateSavedViewFilter,
} from "@/lib/list-views/saved-views";

const adminUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  id: "user_1",
  name: "Admin",
  rockPersonId: null,
};

const otherAdminUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|other-admin",
  email: "other-admin@example.com",
  id: "user_2",
  name: "Other Admin",
  rockPersonId: null,
};

describe("saved list views", () => {
  it("lists active saved views across owners for any active local actor", async () => {
    const sharedSegment = {
      archivedAt: null,
      columnDefinition: { columns: [] },
      createdAt: new Date("2026-04-20T00:00:00.000Z"),
      density: "COMFORTABLE",
      description: null,
      filterDefinition: { conditions: [], mode: "all", type: "group" },
      id: "view_1",
      isDefault: false,
      name: "Shared segment",
      ownerUserId: "user_2",
      pageSize: 50,
      resource: "PEOPLE",
      sortDefinition: { direction: "ASC", field: "rockId" },
      updatedAt: new Date("2026-04-20T00:00:00.000Z"),
      visibility: "GLOBAL",
    };
    const findMany = vi.fn(async () => [sharedSegment]);
    const client = {
      savedListView: {
        findMany,
      },
    } as unknown as PrismaClient;

    await expect(
      listSavedListViews("PEOPLE", adminUser, client),
    ).resolves.toEqual([sharedSegment]);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { name: "asc" }],
      where: {
        archivedAt: null,
        resource: "PEOPLE",
      },
    });
  });

  it("lists amount-filtered shared saved views for active local users", async () => {
    const amountSegment = {
      archivedAt: null,
      columnDefinition: { columns: [] },
      createdAt: new Date("2026-04-20T00:00:00.000Z"),
      density: "COMFORTABLE",
      description: null,
      filterDefinition: {
        conditions: [
          {
            field: "totalGiven",
            operator: "GREATER_THAN",
            type: "condition",
            value: "1000.00",
          },
        ],
        mode: "all",
        type: "group",
      },
      id: "view_1",
      isDefault: false,
      name: "Amount segment",
      ownerUserId: "user_1",
      pageSize: 50,
      resource: "PEOPLE",
      sortDefinition: { direction: "ASC", field: "rockId" },
      updatedAt: new Date("2026-04-20T00:00:00.000Z"),
      visibility: "GLOBAL",
    };
    const findMany = vi.fn(async () => [amountSegment]);
    const client = {
      savedListView: {
        findMany,
      },
    } as unknown as PrismaClient;

    await expect(
      listSavedListViews("PEOPLE", otherAdminUser, client),
    ).resolves.toEqual([amountSegment]);
  });

  it("gets saved views created by another user", async () => {
    const savedView = {
      archivedAt: null,
      columnDefinition: { columns: [] },
      createdAt: new Date("2026-04-20T00:00:00.000Z"),
      density: "COMFORTABLE",
      description: null,
      filterDefinition: { conditions: [], mode: "all", type: "group" },
      id: "view_1",
      isDefault: false,
      name: "Shared segment",
      ownerUserId: "user_2",
      pageSize: 50,
      resource: "PEOPLE",
      sortDefinition: { direction: "ASC", field: "rockId" },
      updatedAt: new Date("2026-04-20T00:00:00.000Z"),
      visibility: "GLOBAL",
    };
    const findFirst = vi.fn(async () => savedView);
    const client = {
      savedListView: {
        findFirst,
      },
    } as unknown as PrismaClient;

    await expect(
      getSavedListView("view_1", adminUser, client),
    ).resolves.toEqual(savedView);

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "view_1",
      },
    });
  });

  it("creates shared app-owned views and clears existing defaults", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));
    const client = {
      $transaction: vi.fn(async (callback) =>
        callback({
          savedListView: {
            create: vi.fn(async ({ data }) => ({
              ...data,
              createdAt: new Date("2026-04-20T00:00:00.000Z"),
              id: "view_1",
              updatedAt: new Date("2026-04-20T00:00:00.000Z"),
            })),
            updateMany,
          },
        }),
      ),
    } as unknown as PrismaClient;

    await expect(
      createSavedListView(
        {
          filterDefinition: {
            conditions: [
              {
                field: "lifecycle",
                operator: "EQUALS",
                type: "condition",
                value: "AT_RISK",
              },
            ],
            mode: "all",
            type: "group",
          },
          isDefault: true,
          name: "At risk",
          resource: "PEOPLE",
        },
        adminUser,
        client,
      ),
    ).resolves.toMatchObject({
      id: "view_1",
      isDefault: true,
      ownerUserId: "user_1",
      resource: "PEOPLE",
      visibility: "GLOBAL",
    });
    expect(updateMany).toHaveBeenCalledWith({
      data: { isDefault: false },
      where: {
        resource: "PEOPLE",
      },
    });
  });

  it("archives saved views without deleting them", async () => {
    const findFirst = vi.fn(async () => ({
      archivedAt: null,
      columnDefinition: { columns: [] },
      createdAt: new Date("2026-04-20T00:00:00.000Z"),
      density: "COMFORTABLE",
      description: null,
      filterDefinition: { conditions: [], mode: "all", type: "group" },
      id: "view_1",
      isDefault: true,
      name: "At risk",
      ownerUserId: "user_1",
      pageSize: 50,
      resource: "PEOPLE",
      sortDefinition: { direction: "ASC", field: "rockId" },
      updatedAt: new Date("2026-04-20T00:00:00.000Z"),
      visibility: "PRIVATE",
    }));
    const update = vi.fn(async ({ data }) => ({
      ...data,
      id: "view_1",
    }));
    const client = {
      savedListView: {
        findFirst,
        update,
      },
    } as unknown as PrismaClient;

    await expect(
      archiveSavedListView("view_1", adminUser, client),
    ).resolves.toMatchObject({
      archivedAt: expect.any(Date),
      id: "view_1",
      isDefault: false,
    });

    expect(update).toHaveBeenCalledWith({
      data: {
        archivedAt: expect.any(Date),
        isDefault: false,
      },
      where: {
        id: "view_1",
      },
    });
  });

  it("revalidates amount-filtered saved views for active local users", () => {
    expect(
      revalidateSavedViewFilter("PEOPLE", {
        conditions: [
          {
            field: "totalGiven",
            operator: "GREATER_THAN",
            type: "condition",
            value: "1000.00",
          },
        ],
        mode: "all",
        type: "group",
      }),
    ).toMatchObject({
      conditions: [
        expect.objectContaining({
          field: "totalGiven",
        }),
      ],
    });
  });
});
