export type RockDiscoveryEndpoint = {
  label: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
};

export type RockDiscoveryResult = {
  label: string;
  path: string;
  status: number | "network_error";
  ok: boolean;
  contentType?: string;
  shape?: string;
  error?: string;
};

export const ROCK_DISCOVERY_ENDPOINTS: RockDiscoveryEndpoint[] = [
  { label: "API v2 root", path: "/api/v2" },
  { label: "API v2 docs", path: "/api/v2/docs/index" },
  { label: "API v2 OpenAPI document", path: "/api/v2/doc" },
  { label: "API v1 docs", path: "/api/docs/index" },

  searchEndpoint("People v2", "/api/v2/models/people/search"),
  searchEndpoint("Person aliases v2", "/api/v2/models/personaliases/search"),
  searchEndpoint("Groups v2", "/api/v2/models/groups/search"),
  searchEndpoint("Group members v2", "/api/v2/models/groupmembers/search"),
  searchEndpoint("Campuses v2", "/api/v2/models/campuses/search"),
  searchEndpoint(
    "Financial accounts v2",
    "/api/v2/models/financialaccounts/search",
  ),
  searchEndpoint(
    "Financial transactions v2",
    "/api/v2/models/financialtransactions/search",
  ),
  searchEndpoint(
    "Financial transaction details v2",
    "/api/v2/models/financialtransactiondetails/search",
  ),
  searchEndpoint(
    "Financial scheduled transactions v2",
    "/api/v2/models/financialscheduledtransactions/search",
  ),

  {
    label: "People v1",
    path: "/api/People?$top=1",
  },
  { label: "Person aliases v1", path: "/api/PersonAliases?$top=1" },
  { label: "Groups v1", path: "/api/Groups?$top=1" },
  { label: "Group members v1", path: "/api/GroupMembers?$top=1" },
  { label: "Campuses v1", path: "/api/Campuses?$top=1" },
  { label: "Financial accounts v1", path: "/api/FinancialAccounts?$top=1" },
  {
    label: "Financial transactions v1",
    path: "/api/FinancialTransactions?$top=1",
  },
  {
    label: "Financial transaction details v1",
    path: "/api/FinancialTransactionDetails?$top=1",
  },
  {
    label: "Financial scheduled transactions v1",
    path: "/api/FinancialScheduledTransactions?$top=1",
  },
];

function searchEndpoint(label: string, path: string): RockDiscoveryEndpoint {
  return {
    label,
    path,
    method: "POST",
    body: {
      limit: 1,
    },
  };
}

const SENSITIVE_KEYS = [
  "authorization",
  "authorization-token",
  "cookie",
  "password",
  "secret",
  "token",
  "restkey",
  "apikey",
  "card",
  "bank",
  "routing",
  "accountnumber",
  "gatewaycustomer",
] as const;

export function normalizeRockBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export function buildRockUrl(baseUrl: string, path: string) {
  return `${normalizeRockBaseUrl(baseUrl)}${path.startsWith("/") ? path : `/${path}`}`;
}

export function summarizeJsonShape(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "array(empty)";
    }

    return `array(${summarizeJsonShape(value[0])})`;
  }

  if (value === null) {
    return "null";
  }

  if (typeof value !== "object") {
    return typeof value;
  }

  const keys = Object.keys(value).sort();

  if (keys.length === 0) {
    return "object(empty)";
  }

  return `object(keys: ${keys.map(redactSensitiveKeyName).join(", ")})`;
}

export function redactSensitiveText(value: string) {
  let redacted = value;

  redacted = redacted.replace(
    /Authorization-Token\s*[:=]\s*\S+/gi,
    "Authorization-Token=[REDACTED]",
  );
  redacted = redacted.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
  redacted = redacted.replace(
    /sk_(live|test)_[A-Za-z0-9]+/gi,
    "sk_$1_[REDACTED]",
  );
  redacted = redacted.replace(
    /[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    "[REDACTED_JWT]",
  );

  return redacted;
}

export function redactSensitiveKeyName(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (
    SENSITIVE_KEYS.some((sensitiveKey) => normalized.includes(sensitiveKey))
  ) {
    return `${key}:[REDACTED_KEY]`;
  }

  return key;
}

export async function discoverRockEndpoints({
  baseUrl,
  restKey,
  endpoints = ROCK_DISCOVERY_ENDPOINTS,
  fetcher = fetch,
}: {
  baseUrl: string;
  restKey: string;
  endpoints?: RockDiscoveryEndpoint[];
  fetcher?: typeof fetch;
}): Promise<RockDiscoveryResult[]> {
  const results: RockDiscoveryResult[] = [];

  for (const endpoint of endpoints) {
    results.push(
      await discoverRockEndpoint({
        baseUrl,
        restKey,
        endpoint,
        fetcher,
      }),
    );
  }

  return results;
}

async function discoverRockEndpoint({
  baseUrl,
  restKey,
  endpoint,
  fetcher,
}: {
  baseUrl: string;
  restKey: string;
  endpoint: RockDiscoveryEndpoint;
  fetcher: typeof fetch;
}): Promise<RockDiscoveryResult> {
  try {
    const response = await fetcher(buildRockUrl(baseUrl, endpoint.path), {
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      headers: {
        Accept: "application/json",
        ...(endpoint.body ? { "Content-Type": "application/json" } : {}),
        "Authorization-Token": restKey,
      },
      method: endpoint.method ?? "GET",
    });
    const contentType = response.headers.get("content-type") ?? undefined;
    const result: RockDiscoveryResult = {
      label: endpoint.label,
      path: endpoint.path,
      status: response.status,
      ok: response.ok,
      contentType,
    };

    if (response.ok && contentType?.includes("application/json")) {
      result.shape = summarizeJsonShape(await response.json());
    }

    return result;
  } catch (error) {
    return {
      label: endpoint.label,
      path: endpoint.path,
      status: "network_error",
      ok: false,
      error: redactSensitiveText(
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}
