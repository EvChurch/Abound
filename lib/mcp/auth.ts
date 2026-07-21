import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

import type { LocalAppUser } from "@/lib/auth/types";
import { prismaAppUsers } from "@/lib/auth/prisma-users";
import type { AppUserRepository } from "@/lib/auth/users";
import { McpAuthError, McpConfigurationError } from "@/lib/mcp/errors";

export type McpAuthConfig = {
  audience: string;
  authorizationServer: string;
  issuer: string;
  jwksUri: string;
  publicBaseUrl: string;
  resource: string;
};

export type McpPrincipal = {
  authInfo: AuthInfo;
  user: LocalAppUser;
};

export type TokenVerifier = (
  token: string,
  config: McpAuthConfig,
) => Promise<JWTPayload>;

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export function getMcpAuthConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const issuer = normalizeIssuer(
    env.MCP_AUTH0_ISSUER ?? auth0DomainToIssuer(env.AUTH0_DOMAIN),
  );
  const publicBaseUrl = normalizeAbsoluteUrl(
    env.MCP_PUBLIC_BASE_URL ?? env.APP_BASE_URL,
    "MCP_PUBLIC_BASE_URL",
  );
  const resource = normalizeResource(
    env.MCP_RESOURCE ?? `${publicBaseUrl}/mcp`,
  );
  const audience = requiredValue(env.MCP_AUDIENCE ?? resource, "MCP_AUDIENCE");
  const authorizationServer = normalizeIssuer(
    env.MCP_AUTHORIZATION_SERVER ?? issuer,
  );
  const jwksUri = normalizeAbsoluteUrl(
    env.MCP_AUTH0_JWKS_URI ?? `${issuer}.well-known/jwks.json`,
    "MCP_AUTH0_JWKS_URI",
  );

  return {
    audience,
    authorizationServer,
    issuer,
    jwksUri,
    publicBaseUrl,
    resource,
  } satisfies McpAuthConfig;
}

export function protectedResourceMetadata(config: McpAuthConfig) {
  return {
    resource: config.resource,
    authorization_servers: [config.authorizationServer],
    bearer_methods_supported: ["header"],
    scopes_supported: ["abound:staff:read"],
  };
}

export function mcpAuthenticateHeader(config: McpAuthConfig) {
  const metadataUrl = new URL(
    "/.well-known/oauth-protected-resource",
    config.publicBaseUrl,
  ).toString();

  return `Bearer resource_metadata="${metadataUrl}", scope="abound:staff:read"`;
}

export async function authenticateMcpRequest(
  request: Request,
  options: {
    config?: McpAuthConfig;
    users?: AppUserRepository;
    verifyToken?: TokenVerifier;
  } = {},
): Promise<McpPrincipal> {
  const config = options.config ?? getMcpAuthConfig();
  const token = bearerTokenFromRequest(request);
  const payload = await (options.verifyToken ?? verifyAuth0AccessToken)(
    token,
    config,
  );
  const subject = payload.sub;

  if (!subject) {
    throw new McpAuthError("The access token is missing a subject.", {
      code: "UNAUTHENTICATED",
      status: 401,
    });
  }

  const user = await (options.users ?? prismaAppUsers).findActiveByAuth0Subject(
    subject,
  );

  if (!user) {
    throw new McpAuthError("Local application access is required.", {
      code: "FORBIDDEN",
      status: 403,
    });
  }

  return {
    authInfo: {
      clientId: stringClaim(payload.client_id ?? payload.azp) ?? "unknown",
      expiresAt: typeof payload.exp === "number" ? payload.exp : undefined,
      resource: new URL(config.resource),
      scopes: scopesFromPayload(payload),
      token,
      extra: {
        sub: subject,
      },
    },
    user,
  };
}

export function unauthorizedMcpResponse(config: McpAuthConfig) {
  return Response.json(
    {
      error: "Authentication is required.",
    },
    {
      headers: {
        "WWW-Authenticate": mcpAuthenticateHeader(config),
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

async function verifyAuth0AccessToken(token: string, config: McpAuthConfig) {
  const jwks = jwksFor(config.jwksUri);
  const { payload } = await jwtVerify(token, jwks, {
    audience: config.audience,
    issuer: config.issuer,
  });

  return payload;
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

function scopesFromPayload(payload: JWTPayload) {
  const scope = payload.scope;

  if (typeof scope !== "string") {
    return [];
  }

  return scope.split(/\s+/).filter(Boolean);
}

function jwksFor(jwksUri: string) {
  const cached = jwksCache.get(jwksUri);
  if (cached) return cached;

  const jwks = createRemoteJWKSet(new URL(jwksUri));
  jwksCache.set(jwksUri, jwks);
  return jwks;
}

function auth0DomainToIssuer(domain: string | undefined) {
  if (!domain?.trim()) {
    return undefined;
  }

  return `https://${domain.trim()}/`;
}

function normalizeIssuer(value: string | undefined) {
  const url = normalizeAbsoluteUrl(value, "MCP_AUTH0_ISSUER");
  return url.endsWith("/") ? url : `${url}/`;
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

function stringClaim(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
