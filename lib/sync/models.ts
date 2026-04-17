export const ROCK_SYNC_SOURCE = "rock:v1" as const;

export const ROCK_READ_ENDPOINTS = [
  "/api/People",
  "/api/PersonAlias",
  "/api/DefinedValues",
  "/api/GroupTypes",
  "/api/GroupTypeRoles",
  "/api/Groups",
  "/api/GroupMembers",
  "/api/Campuses",
  "/api/FinancialAccounts",
  "/api/FinancialTransactions",
  "/api/FinancialTransactionDetails",
  "/api/FinancialScheduledTransactions",
  "/api/FinancialScheduledTransactionDetails",
] as const;

export type RockSourceMetadata = {
  rockId: number;
  rockGuid?: string | null;
  sourceUpdatedAt?: Date | string | null;
  lastSyncRunId: string;
};

const FORBIDDEN_SENSITIVE_KEY_PATTERNS = [
  /authorization/i,
  /cookie/i,
  /password/i,
  /secret/i,
  /token/i,
  /rest.?key/i,
  /api.?key/i,
  /card/i,
  /bank/i,
  /routing/i,
  /accountNumber/i,
  /gatewayCustomer/i,
  /paymentMethod/i,
] as const;

export function assertRockSourceMetadata(metadata: RockSourceMetadata) {
  if (!Number.isInteger(metadata.rockId) || metadata.rockId <= 0) {
    throw new Error("Rock source metadata requires a positive integer rockId.");
  }

  if (!metadata.lastSyncRunId.trim()) {
    throw new Error("Rock source metadata requires lastSyncRunId.");
  }

  if (
    metadata.sourceUpdatedAt &&
    Number.isNaN(Date.parse(String(metadata.sourceUpdatedAt)))
  ) {
    throw new Error(
      "Rock source metadata sourceUpdatedAt must be a valid date.",
    );
  }
}

export function findForbiddenSensitiveKeys(
  value: unknown,
  path = "payload",
): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenSensitiveKeys(item, `${path}.${index}`),
    );
  }

  const keys: string[] = [];

  for (const [key, childValue] of Object.entries(value)) {
    const childPath = `${path}.${key}`;

    if (FORBIDDEN_SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      keys.push(childPath);
    }

    keys.push(...findForbiddenSensitiveKeys(childValue, childPath));
  }

  return keys;
}

export function assertNoForbiddenSensitiveKeys(value: unknown) {
  const forbiddenKeys = findForbiddenSensitiveKeys(value);

  if (forbiddenKeys.length > 0) {
    throw new Error(
      `Payload includes forbidden sensitive fields: ${forbiddenKeys.join(", ")}`,
    );
  }
}
