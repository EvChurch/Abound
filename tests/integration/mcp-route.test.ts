import { beforeEach, describe, expect, it, vi } from "vitest";

import type { McpAuthConfig } from "@/lib/mcp/auth";
import { McpAuthError } from "@/lib/mcp/errors";

const config: McpAuthConfig = {
  audience: "https://abound.example.test/mcp",
  authorizationServer: "https://auth.example.test/",
  issuer: "https://auth.example.test/",
  jwksUri: "https://auth.example.test/.well-known/jwks.json",
  publicBaseUrl: "https://abound.example.test",
  resource: "https://abound.example.test/mcp",
};

const mocks = vi.hoisted(() => ({
  authenticateMcpRequest: vi.fn(),
  getMcpAuthConfig: vi.fn(),
  handleMcpRequest: vi.fn(),
}));

vi.mock("@/lib/mcp/auth", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/mcp/auth")>("@/lib/mcp/auth");

  return {
    ...actual,
    authenticateMcpRequest: mocks.authenticateMcpRequest,
    getMcpAuthConfig: mocks.getMcpAuthConfig,
  };
});

vi.mock("@/lib/mcp/server", () => ({
  handleMcpRequest: mocks.handleMcpRequest,
}));

import { GET, POST } from "@/app/mcp/route";

describe("MCP route", () => {
  beforeEach(() => {
    mocks.authenticateMcpRequest.mockReset();
    mocks.getMcpAuthConfig.mockReset();
    mocks.handleMcpRequest.mockReset();
    mocks.getMcpAuthConfig.mockReturnValue(config);
  });

  it("challenges unauthenticated callers with protected resource metadata", async () => {
    mocks.authenticateMcpRequest.mockRejectedValue(
      new McpAuthError("Authentication is required.", {
        code: "UNAUTHENTICATED",
        status: 401,
      }),
    );

    const response = await POST(
      new Request("https://abound.example.test/mcp", { method: "POST" }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain(
      'resource_metadata="https://abound.example.test/.well-known/oauth-protected-resource"',
    );
    expect(await response.json()).toEqual({
      error: "Authentication is required.",
    });
    expect(mocks.handleMcpRequest).not.toHaveBeenCalled();
  });

  it("denies authenticated users without local app access", async () => {
    mocks.authenticateMcpRequest.mockRejectedValue(
      new McpAuthError("Local application access is required.", {
        code: "FORBIDDEN",
        status: 403,
      }),
    );

    const response = await POST(
      new Request("https://abound.example.test/mcp", { method: "POST" }),
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Local application access is required.",
    });
    expect(mocks.handleMcpRequest).not.toHaveBeenCalled();
  });

  it("passes authenticated GET and POST requests to the MCP transport", async () => {
    const principal = {
      authInfo: {
        clientId: "mcp-client",
        scopes: ["abound:staff:read"],
        token: "token",
      },
      user: {
        active: true,
        auth0Subject: "auth0|staff",
        email: "staff@example.test",
        id: "user_1",
        name: "Staff User",
        rockPersonId: "101",
      },
    };
    mocks.authenticateMcpRequest.mockResolvedValue(principal);
    mocks.handleMcpRequest.mockImplementation(() =>
      Response.json({ ok: true }),
    );

    const getRequest = new Request("https://abound.example.test/mcp");
    const postRequest = new Request("https://abound.example.test/mcp", {
      method: "POST",
    });

    expect(await (await GET(getRequest)).json()).toEqual({ ok: true });
    expect(await (await POST(postRequest)).json()).toEqual({ ok: true });
    expect(mocks.authenticateMcpRequest).toHaveBeenCalledWith(getRequest, {
      config,
    });
    expect(mocks.authenticateMcpRequest).toHaveBeenCalledWith(postRequest, {
      config,
    });
    expect(mocks.handleMcpRequest).toHaveBeenCalledWith(getRequest, principal);
    expect(mocks.handleMcpRequest).toHaveBeenCalledWith(postRequest, principal);
  });

  it("returns a generic response for unexpected server failures", async () => {
    mocks.authenticateMcpRequest.mockResolvedValue({
      authInfo: { scopes: [], token: "token" },
      user: {
        active: true,
        auth0Subject: "auth0|staff",
        email: "staff@example.test",
        id: "user_1",
        name: "Staff User",
        rockPersonId: "101",
      },
    });
    mocks.handleMcpRequest.mockRejectedValue(new Error("transport details"));

    const response = await POST(
      new Request("https://abound.example.test/mcp", { method: "POST" }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "The MCP request could not be completed.",
    });
  });
});
