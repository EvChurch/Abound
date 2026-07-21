"use client";

import { useActionState } from "react";
import { Check, KeyRound, Trash2 } from "lucide-react";

import type { CreateMcpTokenState } from "@/app/tools/mcp/actions";
import { CopyField } from "@/components/tools/copy-field";

export type McpTokenManagerToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type McpTokenManagerProps = {
  createAction: (
    state: CreateMcpTokenState,
    formData: FormData,
  ) => Promise<CreateMcpTokenState>;
  revokeAction: (formData: FormData) => Promise<void>;
  tokens: McpTokenManagerToken[];
};

const initialState: CreateMcpTokenState = {};

export function McpTokenManager({
  createAction,
  revokeAction,
  tokens,
}: McpTokenManagerProps) {
  const [state, formAction, isPending] = useActionState(
    createAction,
    initialState,
  );
  const activeTokens = tokens.filter((token) => !token.revokedAt);
  const revokedTokens = tokens.filter((token) => token.revokedAt);

  return (
    <section className="grid gap-4 rounded-[8px] border border-app-border bg-app-surface p-4">
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <KeyRound aria-hidden="true" className="h-4 w-4 text-app-muted" />
          <h2 className="text-base font-semibold text-app-foreground">
            Personal MCP tokens
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-app-muted">
          Use a personal token when your AI app cannot use the Auth0 sign-in
          flow. Tokens are read-only, tied to your Abound user, and visible only
          when created.
        </p>
      </div>

      {state.plainTextToken ? (
        <div className="grid gap-2 rounded-[8px] border border-app-accent bg-app-background p-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-app-foreground">
            <Check aria-hidden="true" className="h-4 w-4 text-app-accent" />
            Copy this token now
          </div>
          <CopyField label="MCP bearer token" value={state.plainTextToken} />
        </div>
      ) : null}

      <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-2">
          <span className="text-[12px] font-semibold text-app-muted">
            Token name
          </span>
          <input
            className="min-h-10 rounded-[6px] border border-app-border bg-app-background px-3 text-sm text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
            maxLength={80}
            name="name"
            placeholder="Codex on my laptop"
          />
        </label>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-[6px] bg-app-foreground px-3 text-[13px] font-semibold text-app-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
        >
          <KeyRound aria-hidden="true" className="h-4 w-4" />
          {isPending ? "Creating" : "Create token"}
        </button>
      </form>

      {state.error ? (
        <p className="text-[13px] font-semibold text-[oklch(0.58_0.15_25)]">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-3">
        {activeTokens.length > 0 ? (
          activeTokens.map((token) => (
            <TokenRow
              key={token.id}
              revokeAction={revokeAction}
              token={token}
            />
          ))
        ) : (
          <p className="rounded-[8px] border border-dashed border-app-border bg-app-background p-4 text-sm text-app-muted">
            No active personal MCP tokens.
          </p>
        )}
      </div>

      {revokedTokens.length > 0 ? (
        <details className="text-sm text-app-muted">
          <summary className="cursor-pointer font-semibold">
            Revoked tokens
          </summary>
          <div className="mt-3 grid gap-2">
            {revokedTokens.map((token) => (
              <div
                className="rounded-[8px] border border-app-border-faint bg-app-background p-3"
                key={token.id}
              >
                <TokenSummary token={token} />
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}

function TokenRow({
  revokeAction,
  token,
}: {
  revokeAction: (formData: FormData) => Promise<void>;
  token: McpTokenManagerToken;
}) {
  return (
    <article className="grid gap-3 rounded-[8px] border border-app-border-faint bg-app-background p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <TokenSummary token={token} />
      <form action={revokeAction}>
        <input name="tokenId" type="hidden" value={token.id} />
        <button className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[6px] border border-app-border bg-app-surface px-3 text-[13px] font-semibold text-app-muted transition hover:bg-app-chip hover:text-app-foreground">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Revoke
        </button>
      </form>
    </article>
  );
}

function TokenSummary({ token }: { token: McpTokenManagerToken }) {
  return (
    <div className="grid gap-1">
      <div className="font-semibold text-app-foreground">{token.name}</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-app-muted">
        <span className="font-mono">{token.tokenPrefix}...</span>
        <span>Created {formatDate(token.createdAt)}</span>
        {token.lastUsedAt ? (
          <span>Last used {formatDate(token.lastUsedAt)}</span>
        ) : null}
        {token.revokedAt ? (
          <span>Revoked {formatDate(token.revokedAt)}</span>
        ) : null}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
