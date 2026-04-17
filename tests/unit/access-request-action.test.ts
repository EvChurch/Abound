import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentSession: null as { user?: unknown } | null,
  currentLocalUser: null as unknown,
  getSession: vi.fn(),
  findActiveByAuth0Subject: vi.fn(),
  findAccessRequestByAuth0Subject: vi.fn(),
  redirect: vi.fn(),
  upsertPending: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: mocks.getSession,
  },
}));

vi.mock("@/lib/auth/prisma-users", () => ({
  prismaAppUsers: {
    findActiveByAuth0Subject: mocks.findActiveByAuth0Subject,
  },
}));

vi.mock("@/lib/auth/prisma-access-requests", () => ({
  prismaAccessRequests: {
    createPending: mocks.upsertPending,
    findByAuth0Subject: mocks.findAccessRequestByAuth0Subject,
    updatePendingContact: mocks.upsertPending,
  },
}));

import { submitAccessRequest } from "@/app/access-request/actions";

describe("submitAccessRequest", () => {
  beforeEach(() => {
    mocks.currentSession = null;
    mocks.currentLocalUser = null;
    mocks.getSession.mockImplementation(async () => mocks.currentSession);
    mocks.findActiveByAuth0Subject.mockImplementation(
      async () => mocks.currentLocalUser,
    );
    mocks.findAccessRequestByAuth0Subject.mockImplementation(async () => null);
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
    mocks.upsertPending.mockImplementation(async (input) => ({
      id: "request_1",
      auth0Subject: input.auth0Subject,
      email: input.email ?? null,
      name: input.name ?? null,
      status: "PENDING",
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z"),
    }));
  });

  it("redirects anonymous users without creating an access request", async () => {
    await expect(submitAccessRequest()).rejects.toThrow(
      "NEXT_REDIRECT:/auth/login",
    );

    expect(mocks.upsertPending).not.toHaveBeenCalled();
  });

  it("redirects authorized local users without creating an access request", async () => {
    mocks.currentSession = {
      user: { sub: "auth0|admin", email: "admin@example.com" },
    };
    mocks.currentLocalUser = {
      id: "user_1",
      auth0Subject: "auth0|admin",
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      active: true,
      rockPersonId: null,
    };

    await expect(submitAccessRequest()).rejects.toThrow("NEXT_REDIRECT:/");

    expect(mocks.upsertPending).not.toHaveBeenCalled();
  });

  it("persists access requests for authenticated users with no local app user", async () => {
    mocks.currentSession = {
      user: {
        sub: "auth0|pending",
        email: "pending@example.com",
        name: "Pending User",
      },
    };

    await expect(submitAccessRequest()).rejects.toThrow(
      "NEXT_REDIRECT:/access-request/submitted",
    );

    expect(mocks.upsertPending).toHaveBeenCalledWith({
      auth0Subject: "auth0|pending",
      email: "pending@example.com",
      name: "Pending User",
    });
  });
});
