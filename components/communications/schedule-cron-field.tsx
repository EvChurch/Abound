"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { describeCommunicationCron } from "@/lib/communications/cron";

type ScheduleCronFieldProps = {
  defaultValue: string;
  name: string;
};

export function ScheduleCronField({
  defaultValue,
  name,
}: ScheduleCronFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const result = useMemo(() => describeCommunicationCron(value), [value]);

  useEffect(() => {
    inputRef.current?.setCustomValidity(result.isValid ? "" : result.message);
  }, [result]);

  return (
    <label className="grid gap-1">
      <span className="text-[12px] font-semibold text-app-muted">Schedule</span>
      <input
        ref={inputRef}
        aria-describedby="schedule-cron-description"
        aria-invalid={!result.isValid}
        className="min-h-10 rounded-[6px] border border-app-border bg-app-background px-2.5 font-mono text-[12px] text-app-foreground outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20 aria-invalid:border-red-500 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/20"
        name={name}
        onChange={(event) => setValue(event.target.value)}
        required
        type="text"
        value={value}
      />
      <span
        className={
          result.isValid
            ? "text-[12px] leading-5 text-app-muted"
            : "text-[12px] leading-5 text-red-600"
        }
        id="schedule-cron-description"
      >
        {result.isValid
          ? compactScheduleDescription(result.description)
          : result.message}
      </span>
    </label>
  );
}

function compactScheduleDescription(description: string) {
  return description
    .replace(/\s+New Zealand time\.$/, ".")
    .replace(/^Runs every\s+/i, "")
    .replace(/^Runs daily\s+/i, "Daily ")
    .replace(/^Runs monthly\s+/i, "Monthly ")
    .replace(/\.$/, "");
}
