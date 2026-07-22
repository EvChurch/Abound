import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  authenticateMcpRequest,
  getMcpAuthConfig,
  mcpAuthenticateHeader,
} from "@/lib/mcp/auth";
import { McpAuthError, McpConfigurationError } from "@/lib/mcp/errors";

const config = {
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
        MCP_PUBLIC_BASE_URL: "https://abound.example.test",
        MCP_RESOURCE: "https://abound.example.test/mcp/",
      }),
    ).toMatchObject({
      publicBaseUrl: "https://abound.example.test/",
      resource: "https://abound.example.test/mcp",
    });
  });

  it("fails fast when required MCP auth config is missing", () => {
    expect(() => getMcpAuthConfig({})).toThrow(McpConfigurationError);
  });

  it("builds token-only auth challenges", () => {
    expect(mcpAuthenticateHeader()).toBe('Bearer scope="abound:staff:read"');
  });

  it("rejects non-personal bearer tokens instead of using Auth0 sign-in tokens", async () => {
    await expect(
      authenticateMcpRequest(requestWithToken("token_1"), {
        config,
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
      status: 401,
    } satisfies Partial<McpAuthError>);
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
    await expect(
      authenticateMcpRequest(
        requestWithToken(
          "abound_mcp_validvalidvalidvalidvalidvalidvalidvalidvalid",
        ),
        {
          accessTokens,
          config,
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
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      message: "Authentication is required.",
      status: 401,
    } satisfies Partial<McpAuthError>);
  });
});
