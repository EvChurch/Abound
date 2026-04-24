import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  accessRequestFindUnique: vi.fn(),
  accessRequestFindMany: vi.fn(),
  accessRequestUpdate: vi.fn(),
  appUserFindMany: vi.fn(),
  appUserFindUnique: vi.fn(),
  appUserUpdate: vi.fn(),
  appUserUpsert: vi.fn(),
  rockPersonFindMany: vi.fn(),
  transaction: vi.fn(async (operations: unknown[]) => operations),
  fetch: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    accessRequest: {
      findMany: mocks.accessRequestFindMany,
      findUnique: mocks.accessRequestFindUnique,
      update: mocks.accessRequestUpdate,
    },
    appUser: {
      findMany: mocks.appUserFindMany,
      findUnique: mocks.appUserFindUnique,
      update: mocks.appUserUpdate,
      upsert: mocks.appUserUpsert,
    },
    rockPerson: {
      findMany: mocks.rockPersonFindMany,
    },
  },
}));

import {
  approveAccessRequest,
  listUserManagementSummary,
  updateAppUser,
} from "@/lib/settings/users";

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

describe("user management settings", () => {
  beforeEach(() => {
    mocks.accessRequestFindMany.mockReset();
    mocks.accessRequestFindUnique.mockReset();
    mocks.accessRequestUpdate.mockReset();
    mocks.appUserFindMany.mockReset();
    mocks.appUserFindUnique.mockReset();
    mocks.appUserUpdate.mockReset();
    mocks.appUserUpsert.mockReset();
    mocks.rockPersonFindMany.mockReset();
    mocks.transaction.mockClear();
    mocks.fetch.mockReset();
    vi.stubGlobal("fetch", mocks.fetch);
    process.env.ROCK_BASE_URL = "https://rock.example.org";
    process.env.ROCK_REST_KEY = "test-rest-key";
    mocks.appUserFindUnique.mockResolvedValue(null);
    mocks.fetch.mockResolvedValue({
      json: async () => ({ value: [] }),
      ok: true,
    });
    mocks.rockPersonFindMany.mockResolvedValue([]);
  });

  it("lists local users and prioritizes pending access requests", async () => {
    mocks.appUserFindMany.mockResolvedValue([
      {
        active: true,
        auth0Subject: "auth0|admin",
        createdAt: new Date("2026-04-20T00:00:00.000Z"),
        email: "admin@example.com",
        id: "user_1",
        name: "Admin",
        rockPersonId: null,
        role: "ADMIN",
        updatedAt: new Date("2026-04-22T00:00:00.000Z"),
      },
    ]);
    mocks.accessRequestFindMany.mockResolvedValue([
      {
        auth0Subject: "auth0|old",
        createdAt: new Date("2026-04-18T00:00:00.000Z"),
        email: "old@example.com",
        id: "request_2",
        name: "Old Request",
        status: "DENIED",
        updatedAt: new Date("2026-04-18T00:00:00.000Z"),
      },
      {
        auth0Subject: "auth0|pending",
        createdAt: new Date("2026-04-23T00:00:00.000Z"),
        email: "pending@example.com",
        id: "request_1",
        name: "Pending Request",
        status: "PENDING",
        updatedAt: new Date("2026-04-23T00:00:00.000Z"),
      },
    ]);

    const summary = await listUserManagementSummary(adminUser);

    expect(summary.activeUserCount).toBe(1);
    expect(summary.pendingRequestCount).toBe(1);
    expect(summary.accessRequests[0]?.status).toBe("PENDING");
  });

  it("approves a request by creating or updating the local app user", async () => {
    mocks.accessRequestFindUnique.mockResolvedValue({
      auth0Subject: "auth0|pending",
      email: "pending@example.com",
      id: "request_1",
      name: "Pending User",
    });
    mocks.appUserUpsert.mockResolvedValue({});
    mocks.accessRequestUpdate.mockResolvedValue({});

    await approveAccessRequest(
      {
        requestId: "request_1",
        role: "FINANCE",
      },
      adminUser,
    );

    expect(mocks.appUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          active: true,
          auth0Subject: "auth0|pending",
          role: "FINANCE",
          rockPersonId: null,
        }),
      }),
    );
    expect(mocks.accessRequestUpdate).toHaveBeenCalledWith({
      where: { id: "request_1" },
      data: { status: "APPROVED" },
    });
  });

  it("auto-links rockPersonId from Rock UserLogins using AUTH0_<subject> username", async () => {
    mocks.accessRequestFindUnique.mockResolvedValue({
      auth0Subject: "google-oauth2|101883630546333659931",
      email: "pending@example.com",
      id: "request_1",
      name: "Pending User",
    });
    mocks.fetch.mockResolvedValue({
      json: async () => [
        {
          PersonId: 8597,
          UserName: "AUTH0_google-oauth2|101883630546333659931",
        },
      ],
      ok: true,
    });
    mocks.appUserUpsert.mockResolvedValue({});
    mocks.accessRequestUpdate.mockResolvedValue({});

    await approveAccessRequest(
      {
        requestId: "request_1",
        role: "FINANCE",
      },
      adminUser,
    );

    expect(mocks.appUserUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          rockPersonId: "8597",
        }),
        update: expect.objectContaining({
          rockPersonId: "8597",
        }),
      }),
    );
  });

  it("rejects non-Admin updates", async () => {
    await expect(
      updateAppUser(
        {
          active: true,
          role: "ADMIN",
          userId: "user_1",
        },
        financeUser,
      ),
    ).rejects.toThrow("permission");
  });

  it("prevents an Admin from removing their own administrator access", async () => {
    await expect(
      updateAppUser(
        {
          active: false,
          role: "ADMIN",
          userId: "user_1",
        },
        adminUser,
      ),
    ).rejects.toThrow("own administrator access");
  });
});
