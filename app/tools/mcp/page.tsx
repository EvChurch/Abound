import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppTopNav } from "@/components/navigation/app-top-nav";
import { CopyField } from "@/components/tools/copy-field";
import { CopyPromptList } from "@/components/tools/copy-prompt-list";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";

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
              Give Codex, Claude, or another AI app read-only access to the
              giving context you already use in Abound. You will copy one
              address, paste it into your AI app, and sign in.
            </p>
          </header>

          <section className="grid gap-4">
            <Step
              body="This is the only address most AI apps need."
              number="1"
              title="Copy the Abound connection address"
            />
            <CopyField label="Abound MCP address" value={guide.mcpUrl} />
          </section>

          <section className="grid gap-4">
            <Step
              body="Choose the app you use, then paste the address when it asks for an MCP server URL."
              number="2"
              title="Add it to your AI app"
            />
            <div className="grid gap-3 lg:grid-cols-3">
              <InstructionCard
                items={[
                  "Open Settings.",
                  "Choose MCP servers.",
                  "Add a Streamable HTTP server.",
                  "Paste the Abound address.",
                  "Save, restart if asked, then sign in.",
                ]}
                title="Codex"
              />
              <InstructionCard
                items={[
                  "Open Claude Code.",
                  "Add an HTTP MCP server named Abound.",
                  "Paste the Abound address.",
                  "Run /mcp.",
                  "Choose Abound and sign in.",
                ]}
                title="Claude"
              />
              <InstructionCard
                items={[
                  "Open your app's connectors or MCP settings.",
                  "Add a remote HTTP MCP server.",
                  "Paste the Abound address.",
                  "Sign in when the app asks.",
                ]}
                title="Other AI Apps"
              />
            </div>
          </section>

          <section className="grid gap-4">
            <Step
              body="Start broad, then use the names or segments your AI finds for follow-up questions."
              number="3"
              title="Ask a question"
            />
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

function Step({
  body,
  number,
  title,
}: {
  body: string;
  number: string;
  title: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-foreground text-[13px] font-semibold text-app-background">
        {number}
      </div>
      <div>
        <h2 className="text-base font-semibold text-app-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-app-muted">{body}</p>
      </div>
    </div>
  );
}

function InstructionCard({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-[8px] border border-app-border bg-app-surface p-4">
      <h3 className="text-base font-semibold text-app-foreground">{title}</h3>
      <ol className="mt-3 grid list-decimal gap-2 pl-5 text-sm leading-6 text-app-muted">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </div>
  );
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
