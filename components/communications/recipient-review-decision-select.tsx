"use client";

import { CustomSelect } from "@/components/ui/custom-select";

const recipientDecisionOptions = [
  { label: "Send", value: "SEND" },
  { label: "Don't send in this batch", value: "SKIP_BATCH" },
  { label: "Permanently exclude", value: "PERMANENTLY_EXCLUDE" },
] as const;

type RecipientReviewDecisionSelectProps = {
  defaultValue: string;
  disabled?: boolean;
  name?: string;
  onValueChange?: (value: string) => void;
  value?: string;
};

export function RecipientReviewDecisionSelect({
  defaultValue,
  disabled = false,
  name = "decision",
  onValueChange,
  value,
}: RecipientReviewDecisionSelectProps) {
  return (
    <CustomSelect
      ariaLabel="Recipient send decision"
      className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-[6px] border border-app-border bg-app-surface px-2.5 text-[12px] font-semibold text-app-foreground outline-none transition hover:border-app-border-strong focus-visible:ring-2 focus-visible:ring-app-accent/25"
      defaultValue={defaultValue}
      disabled={disabled}
      menuClassName="fixed z-30 rounded-[8px] border border-app-border bg-app-background p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
      name={name}
      onValueChange={(nextValue) => onValueChange?.(nextValue)}
      options={recipientDecisionOptions}
      rootClassName="w-full"
      value={value}
    />
  );
}
