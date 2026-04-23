"use client";

import { useMemo, useState, type ReactNode } from "react";

import type { PlatformFundSettingsSummary } from "@/lib/settings/funds";

type FundSettingsProps = {
  onRebuild: () => Promise<void>;
  onSave: (formData: FormData) => Promise<void>;
  refreshRequested: boolean;
  saved: boolean;
  summary: PlatformFundSettingsSummary;
};

export function FundSettings({
  onRebuild,
  onSave,
  refreshRequested,
  saved,
  summary,
}: FundSettingsProps) {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const filteredFunds = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return summary.funds.filter((fund) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        fund.name.toLowerCase().includes(normalizedQuery) ||
        String(fund.accountRockId).includes(normalizedQuery);
      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && fund.active) ||
        (activeFilter === "inactive" && !fund.active);

      return matchesQuery && matchesActive;
    });
  }, [activeFilter, query, summary.funds]);

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
                Platform funds
              </h1>
              <p className="max-w-3xl text-[13px] leading-6 text-app-muted">
                Enabled funds are the only Rock funds available to staff-facing
                giving calculations, pledge recommendations, dashboards, lists,
                and APIs.
              </p>
            </div>
            <form action={onRebuild}>
              <button className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-border bg-app-surface px-3 text-[12.5px] font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground">
                Rebuild calculations
              </button>
            </form>
          </div>
        </div>

        {!summary.configured ? (
          <StatusCallout tone="warn">
            Platform funds are not configured. Fund-scoped giving values are
            withheld until an Admin saves the enabled fund set.
          </StatusCallout>
        ) : null}
        {saved ? (
          <StatusCallout tone="success">
            Platform funds saved. Derived calculation refresh was requested if
            the enabled set changed.
          </StatusCallout>
        ) : null}
        {refreshRequested ? (
          <StatusCallout tone="success">
            Rebuild requested. The worker will refresh stored fund-scoped
            calculations.
          </StatusCallout>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-4">
          <Metric label="Enabled" value={summary.enabledCount} />
          <Metric label="Synced funds" value={summary.totalCount} />
          <Metric
            label="Configuration"
            value={summary.configured ? "Saved" : "Required"}
          />
          <Metric
            label="Refresh"
            value={refreshStatusLabel(summary.latestRefresh?.status)}
          />
        </dl>
      </header>

      <form action={onSave} className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3 rounded-[8px] border border-app-border bg-app-surface px-4 py-3">
          <label className="grid min-w-[240px] flex-1 gap-1">
            <span className="font-mono text-[10px] font-semibold uppercase text-app-muted">
              Search
            </span>
            <input
              className="h-9 rounded-[5px] border border-app-border bg-app-background px-3 text-[13px] outline-none focus:border-app-accent"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Fund name or Rock ID"
              value={query}
            />
          </label>
          <label className="grid gap-1">
            <span className="font-mono text-[10px] font-semibold uppercase text-app-muted">
              Status
            </span>
            <select
              className="h-9 rounded-[5px] border border-app-border bg-app-background px-3 text-[13px] outline-none focus:border-app-accent"
              onChange={(event) => setActiveFilter(event.target.value)}
              value={activeFilter}
            >
              <option value="all">All funds</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <button className="mt-5 inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-accent bg-app-accent px-4 text-[12.5px] font-semibold text-white">
            Save platform funds
          </button>
        </div>

        <div className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface">
          <div className="grid grid-cols-[minmax(0,1fr)_120px_110px_110px] gap-3 border-b border-app-border-faint bg-app-soft px-4 py-3 font-mono text-[10px] font-semibold uppercase text-app-muted max-lg:hidden">
            <span>Fund</span>
            <span>Giving facts</span>
            <span>State</span>
            <span>Enabled</span>
          </div>
          <div className="divide-y divide-app-border-faint">
            {filteredFunds.map((fund) => (
              <label
                className="grid cursor-pointer gap-3 px-4 py-4 hover:bg-app-soft lg:grid-cols-[minmax(0,1fr)_120px_110px_110px] lg:items-center"
                key={fund.accountRockId}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-app-foreground">
                      {fund.name}
                    </span>
                    <span className="rounded-[4px] bg-app-chip px-2 py-0.5 font-mono text-[10px] font-semibold text-app-muted">
                      Rock {fund.accountRockId}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-app-muted">
                    {[
                      fund.campusName,
                      taxLabel(fund.taxDeductible),
                      publicLabel(fund.public),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No additional Rock account metadata"}
                  </p>
                </div>
                <span className="text-[13px] text-app-muted">
                  {formatNumber(fund.factCount)}
                </span>
                <span className={fund.active ? activeClass : inactiveClass}>
                  {fund.active ? "Active" : "Inactive"}
                </span>
                <span className="flex items-center gap-2 text-[13px] font-semibold text-app-foreground">
                  <input
                    className="h-4 w-4 accent-app-accent"
                    defaultChecked={fund.enabled}
                    name="enabledAccountRockIds"
                    type="checkbox"
                    value={fund.accountRockId}
                  />
                  Enabled
                </span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[8px] border border-app-border bg-app-surface p-4">
      <dt className="font-mono text-[10px] font-semibold uppercase text-app-muted">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold tracking-normal text-app-foreground">
        {typeof value === "number" ? formatNumber(value) : value}
      </dd>
    </div>
  );
}

function StatusCallout({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "warn";
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-[8px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-medium text-emerald-900"
          : "rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium text-amber-900"
      }
    >
      {children}
    </div>
  );
}

const activeClass =
  "inline-flex w-fit rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800";
const inactiveClass =
  "inline-flex w-fit rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600";

function refreshStatusLabel(status?: string | null) {
  if (!status) return "No refresh";

  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function taxLabel(value: boolean | null) {
  if (value === null) return null;
  return value ? "Tax deductible" : "Not tax deductible";
}

function publicLabel(value: boolean | null) {
  if (value === null) return null;
  return value ? "Public" : "Private";
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
