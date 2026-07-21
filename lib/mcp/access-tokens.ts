import { createHash, randomBytes } from "node:crypto";

import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";

export const MCP_ACCESS_TOKEN_PREFIX = "abound_mcp_";
export const MCP_STAFF_READ_SCOPE = "abound:staff:read";

export type McpAccessTokenSummary = {
  id: string;
  name: string;
  tokenPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
};

export type McpAccessTokenPrincipal = {
  token: McpAccessTokenSummary;
  user: LocalAppUser;
};

export type McpAccessTokenRepository = {
  findValidByToken(token: string): Promise<McpAccessTokenPrincipal | null>;
};

export const prismaMcpAccessTokens: McpAccessTokenRepository = {
  async findValidByToken(token) {
    const now = new Date();
    const record = await prisma.mcpAccessToken.findUnique({
      include: {
        appUser: true,
      },
      where: {
        tokenHash: hashMcpAccessToken(token),
      },
    });

    if (
      !record ||
      record.revokedAt ||
      (record.expiresAt && record.expiresAt <= now) ||
      !record.appUser.active
    ) {
      return null;
    }

    await prisma.mcpAccessToken.update({
      data: {
        lastUsedAt: now,
      },
      where: {
        id: record.id,
      },
    });

    return {
      token: summarizeMcpAccessToken(record),
      user: {
        active: record.appUser.active,
        auth0Subject: record.appUser.auth0Subject,
        email: record.appUser.email,
        id: record.appUser.id,
        name: record.appUser.name,
        rockPersonId: record.appUser.rockPersonId,
      },
    };
  },
};

export async function listMcpAccessTokens(appUserId: string) {
  const records = await prisma.mcpAccessToken.findMany({
    orderBy: {
      createdAt: "desc",
    },
    where: {
      appUserId,
    },
  });

  return records.map(summarizeMcpAccessToken);
}

export async function createMcpAccessToken({
  appUserId,
  name,
}: {
  appUserId: string;
  name: string;
}) {
  const token = generateMcpAccessToken();
  const record = await prisma.mcpAccessToken.create({
    data: {
      appUserId,
      name: normalizeTokenName(name),
      scopes: [MCP_STAFF_READ_SCOPE],
      tokenHash: hashMcpAccessToken(token),
      tokenPrefix: token.slice(0, 22),
    },
  });

  return {
    plainTextToken: token,
    token: summarizeMcpAccessToken(record),
  };
}

export async function revokeMcpAccessToken({
  appUserId,
  tokenId,
}: {
  appUserId: string;
  tokenId: string;
}) {
  await prisma.mcpAccessToken.updateMany({
    data: {
      revokedAt: new Date(),
    },
    where: {
      appUserId,
      id: tokenId,
      revokedAt: null,
    },
  });
}

export function isMcpAccessToken(token: string) {
  return token.startsWith(MCP_ACCESS_TOKEN_PREFIX);
}

export function hashMcpAccessToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function generateMcpAccessToken() {
  return `${MCP_ACCESS_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

function normalizeTokenName(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 80) : "MCP token";
}

function summarizeMcpAccessToken(record: {
  createdAt: Date;
  expiresAt: Date | null;
  id: string;
  lastUsedAt: Date | null;
  name: string;
  revokedAt: Date | null;
  scopes: string[];
  tokenPrefix: string;
}) {
  return {
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    id: record.id,
    lastUsedAt: record.lastUsedAt,
    name: record.name,
    revokedAt: record.revokedAt,
    scopes: record.scopes,
    tokenPrefix: record.tokenPrefix,
  } satisfies McpAccessTokenSummary;
}
