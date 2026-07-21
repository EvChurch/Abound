import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import type { McpPrincipal } from "@/lib/mcp/auth";
import {
  defaultMcpToolDependencies,
  executeMcpTool,
  MCP_TOOL_DEFINITIONS,
  type McpToolDependencies,
} from "@/lib/mcp/tools";
import { toolInputSchemas } from "@/lib/mcp/tool-schemas";

export function createAboundMcpServer(
  principal: McpPrincipal,
  dependencies?: Partial<McpToolDependencies>,
) {
  const server = new McpServer({
    name: "abound-staff-read-only",
    version: "0.1.0",
  });

  for (const definition of MCP_TOOL_DEFINITIONS) {
    server.registerTool(
      definition.name,
      {
        annotations: {
          readOnlyHint: true,
        },
        description: definition.description,
        inputSchema: toolInputSchemas[definition.name],
        title: definition.title,
      },
      async (input: unknown) =>
        executeMcpTool(
          definition.name,
          input,
          { user: principal.user },
          dependencies
            ? {
                ...defaultMcpToolDependencies,
                ...dependencies,
              }
            : undefined,
        ),
    );
  }

  return server;
}

export async function handleMcpRequest(
  request: Request,
  principal: McpPrincipal,
) {
  const server = createAboundMcpServer(principal);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(request, {
      authInfo: principal.authInfo,
    });
  } finally {
    await server.close();
  }
}
