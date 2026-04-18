import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";

import type { AppUserRepository } from "@/lib/auth/users";
import {
  requirePermission,
  requireStaffUser,
  resolveGraphQLContext,
  type GraphQLContext,
} from "@/lib/graphql/context";

const emptyUsers: AppUserRepository = {
  async findActiveByAuth0Subject() {
    return null;
  },
};

const adminUser = {
  id: "user_1",
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  name: "Admin",
  role: "ADMIN" as const,
  active: true,
  rockPersonId: null,
};

describe("GraphQL auth context", () => {
  it("treats missing Auth0 session users as anonymous", async () => {
    await expect(resolveGraphQLContext(null, emptyUsers)).resolves.toEqual({
      accessState: {
        status: "anonymous",
      },
    });
  });

  it("keeps Auth0-authenticated users without local app access out of staff context", async () => {
    await expect(
      resolveGraphQLContext(
        { sub: "auth0|pending", email: "pending@example.com" },
        emptyUsers,
      ),
    ).resolves.toEqual({
      accessState: {
        status: "needs_access",
        identity: {
          sub: "auth0|pending",
          email: "pending@example.com",
          name: null,
          picture: null,
        },
      },
    });
  });

  it("resolves authorized local app users into staff context", async () => {
    await expect(
      resolveGraphQLContext(
        { sub: "auth0|admin", email: "admin@example.com" },
        {
          async findActiveByAuth0Subject() {
            return adminUser;
          },
        },
      ),
    ).resolves.toEqual({
      accessState: {
        status: "authorized",
        user: adminUser,
      },
    });
  });

  it("throws safe unauthenticated errors for anonymous staff access", () => {
    expect(() =>
      requireStaffUser({ accessState: { status: "anonymous" } }),
    ).toThrow(GraphQLError);

    try {
      requireStaffUser({ accessState: { status: "anonymous" } });
    } catch (error) {
      expect(error).toMatchObject({
        message: "Authentication is required.",
        extensions: {
          code: "UNAUTHENTICATED",
        },
      });
      expect(String(error)).not.toMatch(/auth0|token|stack/i);
    }
  });

  it("throws safe forbidden errors for authenticated users without local app access", () => {
    const context: GraphQLContext = {
      accessState: {
        status: "needs_access",
        identity: {
          sub: "auth0|pending",
          email: "pending@example.com",
          name: null,
          picture: null,
        },
      },
    };

    try {
      requireStaffUser(context);
    } catch (error) {
      expect(error).toMatchObject({
        message: "Local application access is required.",
        extensions: {
          code: "FORBIDDEN",
        },
      });
      expect(String(error)).not.toMatch(/pending@example|auth0\|pending/i);
    }
  });

  it("enforces role permissions after local app access is resolved", () => {
    const financeContext: GraphQLContext = {
      accessState: {
        status: "authorized",
        user: {
          ...adminUser,
          role: "FINANCE",
        },
      },
    };

    expect(() => requirePermission(financeContext, "tasks:manage")).toThrow(
      "You do not have permission to perform this action.",
    );
    expect(requirePermission(financeContext, "finance:read_amounts")).toEqual(
      financeContext.accessState.status === "authorized"
        ? financeContext.accessState.user
        : null,
    );
  });
});
