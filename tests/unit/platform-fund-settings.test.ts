import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  getPlatformFundScope,
  updatePlatformFundSettings,
  whereForEnabledPlatformFunds,
} from "@/lib/settings/funds";

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

function client({
  accounts = [{ rockId: 101 }, { rockId: 202 }, { rockId: 303 }],
  settings = [] as Array<{ accountRockId: number; enabled: boolean }>,
} = {}) {
  const upsert = vi.fn(async () => ({}));
  const refreshCreate = vi.fn(async () => ({ id: "refresh_1" }));

  return {
    $transaction: vi.fn(async (callback) =>
      callback({
        platformFundSetting: {
          upsert,
        },
      }),
    ),
    derivedCalculationRefresh: {
      create: refreshCreate,
      findFirst: vi.fn(async () => null),
    },
    givingFact: {
      groupBy: vi.fn(async () => []),
    },
    platformFundSetting: {
      count: vi.fn(async () => settings.length),
      findMany: vi.fn(async () => settings),
    },
    rockFinancialAccount: {
      findMany: vi.fn(async () => accounts),
    },
  } as unknown as PrismaClient & {
    platformFundSetting: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
}

describe("platform fund settings", () => {
  it("fails closed before funds are configured", async () => {
    const scope = await getPlatformFundScope(client());

    expect(scope).toEqual({
      enabledAccountRockIds: [],
      mode: "UNCONFIGURED",
    });
    expect(whereForEnabledPlatformFunds(scope)).toEqual({
      accountRockId: { in: [] },
    });
  });

  it("returns only enabled funds after configuration", async () => {
    const scope = await getPlatformFundScope(
      client({
        settings: [
          { accountRockId: 101, enabled: true },
          { accountRockId: 202, enabled: false },
        ],
      }),
    );

    expect(scope).toEqual({
      enabledAccountRockIds: [101],
      mode: "CONFIGURED",
    });
  });

  it("allows Admin users to save enabled funds and request a refresh", async () => {
    const prisma = client();
    const requestRefresh = vi.fn(async () => undefined);

    await expect(
      updatePlatformFundSettings(
        { enabledAccountRockIds: [202, 101] },
        adminUser,
        prisma,
        requestRefresh,
      ),
    ).resolves.toEqual({
      changed: true,
      enabledAccountRockIds: [101, 202],
    });

    expect(requestRefresh).toHaveBeenCalledWith({
      requestedByUserId: adminUser.id,
    });
  });

  it("does not request duplicate refresh work when the enabled set is unchanged", async () => {
    const prisma = client({
      settings: [
        { accountRockId: 101, enabled: true },
        { accountRockId: 202, enabled: true },
      ],
    });
    const requestRefresh = vi.fn(async () => undefined);

    await updatePlatformFundSettings(
      { enabledAccountRockIds: [202, 101] },
      adminUser,
      prisma,
      requestRefresh,
    );

    expect(requestRefresh).not.toHaveBeenCalled();
  });

  it("rejects non-Admin updates", async () => {
    await expect(
      updatePlatformFundSettings(
        { enabledAccountRockIds: [101] },
        financeUser,
        client(),
      ),
    ).rejects.toThrow("permission");
  });

  it("rejects unknown Rock accounts", async () => {
    await expect(
      updatePlatformFundSettings(
        { enabledAccountRockIds: [999] },
        adminUser,
        client(),
      ),
    ).rejects.toThrow("selected platform fund");
  });
});
