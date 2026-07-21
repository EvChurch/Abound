"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";

type CopyFieldProps = {
  label: string;
  value: string;
};

export function CopyField({ label, value }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="grid gap-2">
      <p className="text-[12px] font-semibold text-app-muted">{label}</p>
      <div className="flex min-w-0 flex-col gap-2 rounded-[8px] border border-app-border bg-app-surface p-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 break-all font-mono text-[13px] leading-5 text-app-foreground">
          {value}
        </div>
        <button
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-app-foreground text-app-background transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
          title={copied ? "Copied" : "Copy address"}
          type="button"
        >
          {copied ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Clipboard aria-hidden="true" className="h-4 w-4" />
          )}
          <span className="sr-only">{copied ? "Copied" : "Copy address"}</span>
        </button>
      </div>
    </div>
  );
}
