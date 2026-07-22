import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppTopNav } from "@/components/navigation/app-top-nav";
import { CopyPromptList } from "@/components/tools/copy-prompt-list";
import {
  McpTokenManager,
  type McpTokenManagerToken,
} from "@/components/tools/mcp-token-manager";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import {
  listMcpAccessTokens,
  type McpAccessTokenSummary,
} from "@/lib/mcp/access-tokens";
import {
  createMcpTokenAction,
  revokeMcpTokenAction,
} from "@/app/tools/mcp/actions";

export const metadata = {
  title: "MCP Setup",
};

export default async function McpSetupPage() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const guide = buildMcpGuide(await currentRequestOrigin());
  const tokens = await listMcpAccessTokens(accessState.user.id);

  return (
    <main className="min-h-screen bg-app-background">
      <AppTopNav
        active="tools"
        canManageSettings
        canManageTools
        toolsActiveItem="mcp"
      />
      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-7 sm:py-7">
        <div className="grid gap-7">
          <header className="flex flex-col gap-3 border-b border-app-border pb-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-app-muted">
              Tools
            </p>
            <h1 className="text-2xl font-semibold text-app-foreground">
              Connect Abound to Your AI App
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-app-muted">
              Create a revocable read-only token for Codex, Claude, or another
              AI app. After the token is created, copy the setup details into
              the app that will use it.
            </p>
          </header>

          <McpTokenManager
            createAction={createMcpTokenAction}
            mcpUrl={guide.mcpUrl}
            revokeAction={revokeMcpTokenAction}
            tokens={tokens.map(serializeMcpToken)}
          />

          <section className="grid gap-4">
            <div>
              <h2 className="text-base font-semibold text-app-foreground">
                Ask a question
              </h2>
              <p className="mt-1 text-sm leading-6 text-app-muted">
                Start broad, then use the names or segments your AI finds for
                follow-up questions.
              </p>
            </div>
            <CopyPromptList
              prompts={[
                "What saved people and household segments are available in Abound?",
                "Find households with recent giving changes and show the strongest examples.",
                "Which households appear to have stopped giving recently?",
                "Which people look newly engaged based on recent giving?",
                "Before I ask about donors, is Abound's giving data up to date?",
                "Summarize the giving context for a donor I name next.",
              ]}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function serializeMcpToken(token: McpAccessTokenSummary): McpTokenManagerToken {
  return {
    createdAt: token.createdAt.toISOString(),
    expiresAt: token.expiresAt?.toISOString() ?? null,
    id: token.id,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    name: token.name,
    revokedAt: token.revokedAt?.toISOString() ?? null,
    tokenPrefix: token.tokenPrefix,
  };
}

async function currentRequestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!host) {
    return null;
  }

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
}

function buildMcpGuide(currentOrigin: string | null) {
  const publicBaseUrl =
    currentOrigin ??
    process.env.MCP_PUBLIC_BASE_URL ??
    process.env.APP_BASE_URL ??
    "https://your-abound-domain.example";
  const mcpUrl = absoluteUrl(undefined, publicBaseUrl, "/mcp");

  return {
    mcpUrl,
  };
}

function absoluteUrl(
  configuredUrl: string | undefined,
  publicBaseUrl: string,
  path: string,
) {
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  try {
    return new URL(path, publicBaseUrl).toString();
  } catch {
    return `https://your-abound-domain.example${path}`;
  }
}
