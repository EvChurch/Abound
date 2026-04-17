import { describe, expect, it } from "vitest";

import { resolveAccessState } from "@/lib/auth/access-control";
import type { AppUserRepository } from "@/lib/auth/users";

const emptyUsers: AppUserRepository = {
  async findActiveByAuth0Subject() {
    return null;
  },
};

describe("resolveAccessState", () => {
  it("treats missing Auth0 identity as anonymous", async () => {
    await expect(resolveAccessState(null, emptyUsers)).resolves.toEqual({
      status: "anonymous",
    });
  });

  it("requires a local active app user after Auth0 login", async () => {
    await expect(
      resolveAccessState(
        { sub: "auth0|123", email: "user@example.com" },
        emptyUsers,
      ),
    ).resolves.toEqual({
      status: "needs_access",
      identity: {
        sub: "auth0|123",
        email: "user@example.com",
        name: null,
        picture: null,
      },
    });
  });

  it("authorizes active local app users", async () => {
    await expect(
      resolveAccessState(
        { sub: "auth0|admin", email: "admin@example.com" },
        {
          async findActiveByAuth0Subject() {
            return {
              id: "user_1",
              auth0Subject: "auth0|admin",
              email: "admin@example.com",
              name: "Admin",
              role: "ADMIN",
              active: true,
              rockPersonId: null,
            };
          },
        },
      ),
    ).resolves.toMatchObject({
      status: "authorized",
      user: { role: "ADMIN" },
    });
  });
});
