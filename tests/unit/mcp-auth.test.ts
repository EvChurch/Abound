import { describe, expect, it, vi } from "vitest";
import type { JWTPayload } from "jose";

import type { LocalAppUser } from "@/lib/auth/types";
import type { AppUserRepository } from "@/lib/auth/users";
import {
  authenticateMcpRequest,
  getMcpAuthConfig,
  mcpAuthenticateHeader,
  protectedResourceMetadata,
  type McpAuthConfig,
} from "@/lib/mcp/auth";
import { McpAuthError, McpConfigurationError } from "@/lib/mcp/errors";

const config = {
  audience: "https://abound.example.test/mcp",
  authorizationServer: "https://auth.example.test/",
  issuer: "https://auth.example.test/",
  jwksUri: "https://auth.example.test/.well-known/jwks.json",
  publicBaseUrl: "https://abound.example.test/",
  resource: "https://abound.example.test/mcp",
};

const staffUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|staff",
  email: "staff@example.test",
  id: "user_1",
  name: "Staff User",
  rockPersonId: null,
};

function usersReturning(user: LocalAppUser | null): AppUserRepository {
  return {
    async findActiveByAuth0Subject() {
      return user;
    },
  };
}

function requestWithToken(token: string | null) {
  return new Request("https://abound.example.test/mcp", {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
    method: "POST",
  });
}

describe("MCP auth", () => {
  it("loads MCP auth config from explicit values", () => {
    expect(
      getMcpAuthConfig({
        MCP_AUDIENCE: "https://abound.example.test/mcp",
        MCP_AUTH0_ISSUER: "https://auth.example.test",
        MCP_PUBLIC_BASE_URL: "https://abound.example.test",
        MCP_RESOURCE: "https://abound.example.test/mcp/",
      }),
    ).toMatchObject({
      audience: "https://abound.example.test/mcp",
      issuer: "https://auth.example.test/",
      jwksUri: "https://auth.example.test/.well-known/jwks.json",
      publicBaseUrl: "https://abound.example.test/",
      resource: "https://abound.example.test/mcp",
    });
  });

  it("fails fast when required MCP auth config is missing", () => {
    expect(() => getMcpAuthConfig({})).toThrow(McpConfigurationError);
  });

  it("builds protected resource metadata and auth challenges", () => {
    expect(protectedResourceMetadata(config)).toEqual({
      authorization_servers: ["https://auth.example.test/"],
      bearer_methods_supported: ["header"],
      resource: "https://abound.example.test/mcp",
      scopes_supported: ["abound:staff:read"],
    });
    expect(mcpAuthenticateHeader(config)).toContain(
      'resource_metadata="https://abound.example.test/.well-known/oauth-protected-resource"',
    );
    expect(mcpAuthenticateHeader(config)).toContain(
      'scope="abound:staff:read"',
    );
  });

  it("resolves valid bearer tokens to active local app users", async () => {
    const verifyToken = vi.fn(
      async (
        token: string,
        receivedConfig: McpAuthConfig,
      ): Promise<JWTPayload> => ({
        aud: receivedConfig.audience,
        azp: "mcp-client",
        exp: 1_800_000_000,
        iss: receivedConfig.issuer,
        scope: "abound:staff:read",
        sub: token === "token_1" ? "auth0|staff" : "auth0|unknown",
      }),
    );

    await expect(
      authenticateMcpRequest(requestWithToken("token_1"), {
        config,
        users: usersReturning(staffUser),
        verifyToken,
      }),
    ).resolves.toMatchObject({
      authInfo: {
        clientId: "mcp-client",
        expiresAt: 1_800_000_000,
        scopes: ["abound:staff:read"],
      },
      user: staffUser,
    });
    expect(verifyToken).toHaveBeenCalledWith("token_1", config);
  });

  it("resolves valid personal MCP bearer tokens to their active local app user", async () => {
    const accessTokens = {
      findValidByToken: vi.fn(async (token: string) =>
        token === "abound_mcp_validvalidvalidvalidvalidvalidvalidvalidvalid"
          ? {
              token: {
                createdAt: new Date("2026-07-21T00:00:00Z"),
                expiresAt: null,
                id: "mcp_token_1",
                lastUsedAt: null,
                name: "Codex laptop",
                revokedAt: null,
                scopes: ["abound:staff:read"],
                tokenPrefix: "abound_mcp_validvali",
              },
              user: staffUser,
            }
          : null,
      ),
    };
    const verifyToken = vi.fn();

    await expect(
      authenticateMcpRequest(
        requestWithToken(
          "abound_mcp_validvalidvalidvalidvalidvalidvalidvalidvalid",
        ),
        {
          accessTokens,
          config,
          users: usersReturning(null),
          verifyToken,
        },
      ),
    ).resolves.toMatchObject({
      authInfo: {
        clientId: "mcp-access-token:mcp_token_1",
        scopes: ["abound:staff:read"],
      },
      user: staffUser,
    });
    expect(accessTokens.findValidByToken).toHaveBeenCalledWith(
      "abound_mcp_validvalidvalidvalidvalidvalidvalidvalidvalid",
    );
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("rejects unknown personal MCP bearer tokens safely", async () => {
    await expect(
      authenticateMcpRequest(
        requestWithToken("abound_mcp_unknownunknownunknownunknownunknown"),
        {
          accessTokens: {
            async findValidByToken() {
              return null;
            },
          },
          config,
          users: usersReturning(staffUser),
        },
      ),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
      status: 401,
    } satisfies Partial<McpAuthError>);
  });

  it("rejects requests without bearer tokens safely", async () => {
    await expect(
      authenticateMcpRequest(requestWithToken(null), {
        config,
        users: usersReturning(staffUser),
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
      status: 401,
    } satisfies Partial<McpAuthError>);
  });

  it("rejects valid Auth0 users without local app access", async () => {
    await expect(
      authenticateMcpRequest(requestWithToken("token_1"), {
        config,
        users: usersReturning(null),
        verifyToken: async () => ({
          sub: "auth0|pending",
        }),
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Local application access is required.",
      status: 403,
    } satisfies Partial<McpAuthError>);
  });
});
