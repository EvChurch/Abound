export class McpConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpConfigurationError";
  }
}

export class McpAuthError extends Error {
  readonly status: 401 | 403;
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN";

  constructor(
    message: string,
    options: { code: McpAuthError["code"]; status: McpAuthError["status"] },
  ) {
    super(message);
    this.name = "McpAuthError";
    this.code = options.code;
    this.status = options.status;
  }
}

export function safeErrorMessage(error: unknown) {
  if (error instanceof McpAuthError) {
    return error.message;
  }

  if (error instanceof McpConfigurationError) {
    return error.message;
  }

  return "The MCP request could not be completed.";
}
