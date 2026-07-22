import {
  authenticateMcpRequest,
  forbiddenMcpResponse,
  getMcpAuthConfig,
  unauthorizedMcpResponse,
} from "@/lib/mcp/auth";
import { McpAuthError } from "@/lib/mcp/errors";
import { handleMcpRequest } from "@/lib/mcp/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleAuthenticatedMcpRequest(request);
}

export async function POST(request: Request) {
  return handleAuthenticatedMcpRequest(request);
}

async function handleAuthenticatedMcpRequest(request: Request) {
  const config = getMcpAuthConfig();

  try {
    const principal = await authenticateMcpRequest(request, { config });
    return await handleMcpRequest(request, principal);
  } catch (error) {
    if (error instanceof McpAuthError) {
      return error.status === 403
        ? forbiddenMcpResponse()
        : unauthorizedMcpResponse();
    }

    return Response.json(
      {
        error: "The MCP request could not be completed.",
      },
      {
        status: 500,
      },
    );
  }
}
