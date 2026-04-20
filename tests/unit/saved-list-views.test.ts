import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  createSavedListView,
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
