"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";

type CopySnippetProps = {
  code: string;
  label: string;
};

export function CopySnippet({ code, label }: CopySnippetProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-app-border bg-app-chip px-3">
        <h3 className="text-[12px] font-semibold text-app-foreground">
          {label}
        </h3>
        <button
          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-app-muted transition hover:bg-app-surface hover:text-app-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
          title={copied ? "Copied" : "Copy"}
          type="button"
        >
          {copied ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Clipboard aria-hidden="true" className="h-4 w-4" />
          )}
          <span className="sr-only">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[12px] leading-5 text-app-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
