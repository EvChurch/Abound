"use client";

import { useState } from "react";

import { CustomSelect } from "@/components/ui/custom-select";

type RepeatSendingMode = "NEVER_RESEND" | "COOLDOWN" | "EVERY_RUN";

type RepeatSendingFieldProps = {
  defaultCooldownDays?: number | null;
  defaultValue?: RepeatSendingMode;
};

export function RepeatSendingField({
  defaultCooldownDays,
  defaultValue = "NEVER_RESEND",
}: RepeatSendingFieldProps) {
  const [mode, setMode] = useState<RepeatSendingMode>(defaultValue);

  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <span className="text-[12px] font-semibold text-app-muted">
          Repeat sending
        </span>
        <CustomSelect
          ariaLabel="Repeat sending"
          className="inline-flex min-h-10 w-full items-center justify-between gap-2 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none transition hover:border-app-border-strong focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/20"
          defaultValue={defaultValue}
          menuClassName="fixed z-30 max-h-80 overflow-y-auto rounded-[8px] border border-app-border bg-app-background p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
          name="repeatMode"
          onValueChange={(value) => setMode(value as RepeatSendingMode)}
          options={[
            {
              label: "Send once per person",
              value: "NEVER_RESEND",
            },
            {
              label: "Send again after a delay",
              value: "COOLDOWN",
            },
            {
              label: "Send on every scheduled run",
              value: "EVERY_RUN",
            },
          ]}
          rootClassName="relative w-full"
        />
      </div>
      {mode === "COOLDOWN" ? (
        <label className="grid gap-1">
          <span className="text-[12px] font-semibold text-app-muted">
            Repeat delay
          </span>
          <span className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-[6px] border border-app-border bg-app-background focus-within:border-app-accent focus-within:ring-2 focus-within:ring-app-accent/20">
            <input
              className="min-w-0 bg-transparent px-2.5 text-[13px] text-app-foreground outline-none"
              defaultValue={defaultCooldownDays ?? 30}
              min={1}
              name="cooldownDays"
              type="number"
            />
            <span className="flex items-center border-l border-app-border bg-app-surface px-3 text-[12px] font-semibold text-app-muted">
              days
            </span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
