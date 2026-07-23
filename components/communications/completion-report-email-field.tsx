"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";

type CompletionReportEmailFieldProps = {
  defaultEmails?: string[];
  formId?: string;
  name?: string;
};

export function CompletionReportEmailField({
  defaultEmails = [],
  formId,
  name = "completionReportEmail",
}: CompletionReportEmailFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const [emails, setEmails] = useState(() => normalizeEmails(defaultEmails));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  function addDraft(value = draft) {
    const result = parseEmailDraft(value);

    if (result.valid.length > 0) {
      setEmails((current) => normalizeEmails([...current, ...result.valid]));
    }

    if (result.invalid.length > 0) {
      setDraft(result.invalid.join(" "));
      setError("Enter a valid email address before adding it.");
      return;
    }

    if (result.valid.length === 0) {
      setDraft("");
      setError("");
      return;
    }

    setDraft("");
    setError("");
  }

  function removeEmail(email: string) {
    setEmails((current) => current.filter((candidate) => candidate !== email));
  }

  return (
    <div className="grid gap-1">
      <label
        className="text-[12px] font-semibold text-app-muted"
        htmlFor={inputId}
      >
        Completion report
      </label>
      <div
        className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-[6px] border border-app-border bg-app-background px-2 py-1.5 text-[13px] text-app-foreground focus-within:border-app-accent focus-within:ring-2 focus-within:ring-app-accent/20 has-[input[aria-invalid='true']]:border-red-500 has-[input[aria-invalid='true']]:focus-within:border-red-500 has-[input[aria-invalid='true']]:focus-within:ring-red-500/20"
        onClick={(event) => {
          event.currentTarget.querySelector("input")?.focus();
        }}
      >
        {emails.map((email) => (
          <span
            className="inline-flex min-h-7 max-w-full items-center gap-1 rounded-[999px] border border-app-border bg-app-soft px-2 text-[12px] font-medium text-app-foreground"
            key={email}
          >
            <span className="truncate">{email}</span>
            <button
              aria-label={`Remove ${email}`}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-app-muted hover:bg-app-background hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeEmail(email);
              }}
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          className="min-h-7 min-w-40 flex-1 bg-transparent px-1 text-[13px] text-app-foreground outline-none placeholder:text-app-muted"
          placeholder={
            emails.length === 0 ? "membership@example.com" : "Add another"
          }
          value={draft}
          onBlur={() => addDraft()}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === "Tab" ||
              event.key === "," ||
              event.key === ";"
            ) {
              event.preventDefault();
              addDraft();
            } else if (
              event.key === "Backspace" &&
              draft.length === 0 &&
              emails.length > 0
            ) {
              setEmails((current) => current.slice(0, -1));
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");

            if (/[\s,;]/.test(pasted)) {
              event.preventDefault();
              addDraft(`${draft} ${pasted}`);
            }
          }}
        />
      </div>
      {emails.map((email) => (
        <input
          form={formId}
          key={email}
          name={name}
          type="hidden"
          value={email}
        />
      ))}
      {error ? (
        <span
          className="text-[11px] leading-4 text-red-600"
          id={errorId}
          role="alert"
        >
          {error}
        </span>
      ) : (
        <span className="text-[11px] leading-4 text-app-muted">
          Press Enter, comma, or Tab after each address.
        </span>
      )}
    </div>
  );
}

function parseEmailDraft(value: string) {
  const candidates = normalizeEmails(value.split(/[\s,;]+/));

  return {
    invalid: candidates.filter((email) => !isValidOperationalEmail(email)),
    valid: candidates.filter((email) => isValidOperationalEmail(email)),
  };
}

function normalizeEmails(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  );
}

function isValidOperationalEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
