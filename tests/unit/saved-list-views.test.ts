import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  archiveSavedListView,
  createSavedListView,
  listSavedListViews,
  revalidateSavedViewFilter,
} from "@/lib/list-views/saved-views";

const financeUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|finance",
  email: "finance@example.com",
  id: "user_1",
  name: "Finance",
  rockPersonId: null,
  role: "FINANCE",
};

describe("saved list views", () => {
  it("lists only active saved views", async () => {
    const findMany = vi.fn(async () => []);
    const client = {
      savedListView: {
        findMany,
      },
    } as unknown as PrismaClient;

    await expect(
      listSavedListViews("PEOPLE", financeUser, client),
    ).resolves.toEqual([]);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { name: "asc" }],
      where: {
        archivedAt: null,
        ownerUserId: "user_1",
        resource: "PEOPLE",
      },
    });
  });

  it("creates private app-owned views and clears existing defaults", async () => {
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
            updateMany: vi.fn(async () => ({ count: 1 })),
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
        financeUser,
        client,
      ),
    ).resolves.toMatchObject({
      id: "view_1",
      isDefault: true,
      ownerUserId: "user_1",
      resource: "PEOPLE",
      visibility: "PRIVATE",
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
      archiveSavedListView("view_1", financeUser, client),
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

  it("revalidates saved views against the current actor role", () => {
    expect(() =>
      revalidateSavedViewFilter(
        "PEOPLE",
        {
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
        {
          ...financeUser,
          role: "PASTORAL_CARE",
        },
      ),
    ).toThrow("Saved list view is no longer valid for this role.");
  });
});
