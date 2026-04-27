"use client";

import { type ReactNode } from "react";

import type { PlatformFundSettingsSummary } from "@/lib/settings/funds";

type FundSettingsProps = {
  onRebuild: () => Promise<void>;
  onSave: (formData: FormData) => Promise<void>;
  summary: PlatformFundSettingsSummary;
};

export function FundSettings({
  onRebuild,
  onSave,
  summary,
}: FundSettingsProps) {
  return (
    <section className="grid gap-6">
      <header className="grid gap-4">
        <div className="grid gap-2">
          <p className="font-mono text-[11px] font-semibold uppercase text-app-accent-strong">
            Settings
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-2">
              <h1 className="text-[32px] font-semibold leading-[1.12] tracking-normal text-app-foreground sm:text-[42px]">
                Funds
              </h1>
              <p className="max-w-3xl text-[13px] leading-6 text-app-muted">
                Choose which funds are included in app calculations and staff
                workflows.
              </p>
            </div>
          </div>
        </div>

        {!summary.configured ? (
          <StatusCallout>
            Funds are not configured yet. Enable at least one fund to apply this
            configuration.
          </StatusCallout>
        ) : null}
      </header>

      <form action={onSave} className="grid gap-4">
        <div className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
          <div className="divide-y divide-app-border-faint">
            {summary.funds.map((fund) => (
              <label
                className="flex cursor-pointer items-center gap-3 px-4 py-4 hover:bg-app-soft"
                key={fund.accountRockId}
              >
                <input
                  className="h-4 w-4 accent-app-accent"
                  defaultChecked={fund.enabled}
                  name="enabledAccountRockIds"
                  onChange={(event) => {
                    event.currentTarget.form?.requestSubmit();
                  }}
                  type="checkbox"
                  value={fund.accountRockId}
                />
                <span className="font-semibold text-app-foreground">
                  {fund.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      </form>

      <section className="grid gap-3 rounded-[8px] border border-rose-200 bg-rose-50/70 p-4">
        <div className="grid gap-1">
          <h2 className="text-[15px] font-semibold text-rose-900">
            Danger zone
          </h2>
          <p className="text-[12.5px] leading-5 text-rose-900/90">
            This reruns derived reporting calculations for the currently enabled
            funds. It does not edit gift records. Use it only when reports look
            stale or inconsistent.
          </p>
        </div>
        <form action={onRebuild}>
          <button className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-rose-300 bg-white px-3 text-[12.5px] font-semibold text-rose-900 hover:bg-rose-100">
            Recalculate reports
          </button>
        </form>
      </section>
    </section>
  );
}

function StatusCallout({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900">
      {children}
    </div>
  );
}
