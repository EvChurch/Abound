CREATE TABLE "McpAccessToken" (
    "id" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "McpAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "McpAccessToken_tokenHash_key" ON "McpAccessToken"("tokenHash");

CREATE INDEX "McpAccessToken_appUserId_revokedAt_idx" ON "McpAccessToken"("appUserId", "revokedAt");

CREATE INDEX "McpAccessToken_expiresAt_idx" ON "McpAccessToken"("expiresAt");

ALTER TABLE "McpAccessToken" ADD CONSTRAINT "McpAccessToken_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
