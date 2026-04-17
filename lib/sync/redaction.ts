const REDACTION_PATTERNS = [
  /Authorization-Token\s*[:=]\s*\S+/gi,
  /Bearer\s+\S+/gi,
  /sk_(live|test)_[A-Za-z0-9]+/gi,
  /[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
] as const;

const SENSITIVE_KEYS = [
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

export function redactText(value: string) {
  return REDACTION_PATTERNS.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[REDACTED]"),
    value,
  );
}

export function redactForLog(value: unknown): unknown {
  if (typeof value === "string") {
    return redactText(value);
  }

  if (Array.isArray(value)) {
    return value.map(redactForLog);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, childValue]) => [
      key,
      SENSITIVE_KEYS.some((pattern) => pattern.test(key))
        ? "[REDACTED]"
        : redactForLog(childValue),
    ]),
  );
}
