import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  isMcpAccessToken,
  prismaMcpAccessTokens,
  type McpAccessTokenRepository,
} from "@/lib/mcp/access-tokens";
import { McpAuthError, McpConfigurationError } from "@/lib/mcp/errors";

export type McpAuthConfig = {
  publicBaseUrl: string;
  resource: string;
};

export type McpPrincipal = {
  authInfo: AuthInfo;
  user: LocalAppUser;
};

export function getMcpAuthConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const publicBaseUrl = normalizeAbsoluteUrl(
    env.MCP_PUBLIC_BASE_URL ?? env.APP_BASE_URL,
    "MCP_PUBLIC_BASE_URL",
  );
  const resource = normalizeResource(
    env.MCP_RESOURCE ?? `${publicBaseUrl}/mcp`,
  );

  return {
    publicBaseUrl,
    resource,
  } satisfies McpAuthConfig;
}

export function mcpAuthenticateHeader() {
  return 'Bearer scope="abound:staff:read"';
}

export async function authenticateMcpRequest(
  request: Request,
  options: {
    accessTokens?: McpAccessTokenRepository;
    config?: McpAuthConfig;
  } = {},
): Promise<McpPrincipal> {
  const config = options.config ?? getMcpAuthConfig();
  const token = bearerTokenFromRequest(request);

  if (!isMcpAccessToken(token)) {
    throw new McpAuthError("Authentication is required.", {
      code: "UNAUTHENTICATED",
      status: 401,
    });
  }

  return authenticateMcpAccessToken(
    token,
    options.accessTokens ?? prismaMcpAccessTokens,
    config,
  );
}

async function authenticateMcpAccessToken(
  token: string,
  accessTokens: McpAccessTokenRepository,
  config: McpAuthConfig,
): Promise<McpPrincipal> {
  const principal = await accessTokens.findValidByToken(token);

  if (!principal) {
    throw new McpAuthError("Authentication is required.", {
      code: "UNAUTHENTICATED",
      status: 401,
    });
  }

  return {
    authInfo: {
      clientId: `mcp-access-token:${principal.token.id}`,
      resource: new URL(config.resource),
      scopes: principal.token.scopes,
      token,
      extra: {
        sub: principal.user.auth0Subject,
      },
    },
    user: principal.user,
  };
}

export function unauthorizedMcpResponse() {
  return Response.json(
    {
      error: "Authentication is required.",
    },
    {
      headers: {
        "WWW-Authenticate": mcpAuthenticateHeader(),
      },
      status: 401,
    },
  );
}

export function forbiddenMcpResponse() {
  return Response.json(
    {
      error: "Local application access is required.",
    },
    {
      status: 403,
    },
  );
}

function bearerTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    throw new McpAuthError("Authentication is required.", {
      code: "UNAUTHENTICATED",
      status: 401,
    });
  }

  const [scheme, token, extra] = authorization.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    throw new McpAuthError("A bearer access token is required.", {
      code: "UNAUTHENTICATED",
      status: 401,
    });
  }

  return token;
}

function normalizeResource(value: string | undefined) {
  const url = normalizeAbsoluteUrl(value, "MCP_RESOURCE");
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function normalizeAbsoluteUrl(value: string | undefined, name: string) {
  const rawValue = requiredValue(value, name);
  let url: URL;

  try {
    url = new URL(rawValue);
  } catch {
    throw new McpConfigurationError(`${name} must be an absolute URL.`);
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new McpConfigurationError(`${name} must use https.`);
  }

  return url.toString();
}

function requiredValue(value: string | undefined, name: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new McpConfigurationError(`${name} is required.`);
  }

  return trimmed;
}
