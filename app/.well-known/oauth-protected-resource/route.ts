import { getMcpAuthConfig, protectedResourceMetadata } from "@/lib/mcp/auth";
import { safeErrorMessage } from "@/lib/mcp/errors";

export function GET() {
  try {
    return Response.json(protectedResourceMetadata(getMcpAuthConfig()));
  } catch (error) {
    return Response.json(
      {
        error: safeErrorMessage(error),
      },
      {
        status: 500,
      },
    );
  }
}
