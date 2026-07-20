export const APPROVED_COMMUNICATION_TOKENS = [
  "firstName",
  "displayName",
  "householdName",
  "campusName",
  "connectionStatus",
] as const;

export type CommunicationTemplateToken =
  (typeof APPROVED_COMMUNICATION_TOKENS)[number];

export type CommunicationTemplateTokenContext = Partial<
  Record<CommunicationTemplateToken, string | null>
>;

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g;
const APPROVED_TOKEN_SET = new Set<string>(APPROVED_COMMUNICATION_TOKENS);

export function renderApprovedTokens(
  value: string,
  context: CommunicationTemplateTokenContext,
) {
  return value.replace(TOKEN_PATTERN, (_match, token: string) => {
    if (!APPROVED_TOKEN_SET.has(token)) {
      throw new Error(`Unsupported communication template token: ${token}`);
    }

    return context[token as CommunicationTemplateToken] || fallbackFor(token);
  });
}

export function assertApprovedTokens(value: string) {
  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const token = match[1]!;

    if (!APPROVED_TOKEN_SET.has(token)) {
      throw new Error(`Unsupported communication template token: ${token}`);
    }
  }
}

export function listTemplateTokens(value: string) {
  const tokens = new Set<CommunicationTemplateToken>();

  for (const match of value.matchAll(TOKEN_PATTERN)) {
    const token = match[1]!;

    if (APPROVED_TOKEN_SET.has(token)) {
      tokens.add(token as CommunicationTemplateToken);
    }
  }

  return [...tokens];
}

function fallbackFor(token: string) {
  if (token === "firstName") {
    return "there";
  }

  return "";
}
