"use client";

import { useState } from "react";
import { Check, Clipboard } from "lucide-react";

type CopyPromptListProps = {
  prompts: string[];
};

export function CopyPromptList({ prompts }: CopyPromptListProps) {
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {prompts.map((prompt) => {
        const copied = copiedPrompt === prompt;

        return (
          <button
            className="group flex min-h-20 w-full items-center justify-between gap-3 rounded-[8px] border border-app-border bg-app-surface p-4 text-left text-sm leading-6 text-app-foreground transition hover:border-app-accent hover:bg-app-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
            key={prompt}
            onClick={async () => {
              await navigator.clipboard.writeText(prompt);
              setCopiedPrompt(prompt);
              window.setTimeout(() => setCopiedPrompt(null), 1600);
            }}
            type="button"
          >
            <span>{prompt}</span>
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-app-foreground text-app-background transition group-hover:opacity-90">
              {copied ? (
                <Check aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Clipboard aria-hidden="true" className="h-4 w-4" />
              )}
              <span className="sr-only">
                {copied ? "Copied prompt" : "Copy prompt"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
