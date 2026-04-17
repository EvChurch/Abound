import type { SyncStatusSummary } from "@/lib/sync/status";

type SyncStatusProps = {
  summary: SyncStatusSummary;
};

export function SyncStatus({ summary }: SyncStatusProps) {
  const latestRun = summary.latestRun;
  const runStatus = latestRun?.status ?? "NO_RUN";

  return (
    <section className="grid gap-8">
      <div className="grid gap-4">
        <p className="text-sm font-bold uppercase text-app-accent-strong">
          Sync status
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
              Rock data import health.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-7 text-app-muted">
              Local reporting reads from synced data. Rock remains the source of
              truth, and this app only uses read-only API calls.
            </p>
          </div>
          <span className={statusClassName(runStatus)}>
            {statusLabel(runStatus)}
          </span>
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Records read" value={latestRun?.recordsRead ?? 0} />
        <Metric label="Rows written" value={latestRun?.recordsWritten ?? 0} />
        <Metric label="Skipped" value={latestRun?.recordsSkipped ?? 0} />
        <Metric label="Open issues" value={summary.openIssueCount} />
      </dl>

      <section className="grid gap-4">
        <h2 className="text-xl font-bold">Synced shape</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="People" value={summary.syncedCounts.people} />
          <Metric label="Families" value={summary.syncedCounts.households} />
          <Metric
            label="Family members"
            value={summary.syncedCounts.householdMembers}
          />
          <Metric
            label="Connect Groups"
            value={summary.syncedCounts.connectGroups}
          />
          <Metric
            label="Active group links"
            value={summary.syncedCounts.connectGroupMembers}
          />
          <Metric
            label="Transactions"
            value={summary.syncedCounts.financialTransactions}
          />
          <Metric
            label="Transaction details"
            value={summary.syncedCounts.financialTransactionDetails}
          />
          <Metric
            label="Giving facts"
            value={summary.syncedCounts.givingFacts}
          />
        </dl>
      </section>

      <section className="grid gap-3 border-t border-slate-300 pt-6">
        <h2 className="text-xl font-bold">Runner recommendation</h2>
        <p className="max-w-3xl leading-7 text-app-muted">
          Keep this phase on explicit SyncRun rows. When scheduling is needed,
          prefer a Postgres-backed runner such as pg-boss before Redis-backed
          BullMQ or an external durable workflow service. The sync job is
          auditable, database-centered, and does not need multi-day workflow
          orchestration yet.
        </p>
      </section>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-300 bg-white p-4">
      <dt className="text-sm font-bold text-app-muted">{label}</dt>
      <dd className="mt-2 text-3xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "SUCCEEDED") return "Healthy";
  if (status === "PARTIAL") return "Needs review";
  if (status === "FAILED") return "Failed";
  if (status === "STARTED") return "Running";
  return "No runs";
}

function statusClassName(status: string) {
  const base =
    "inline-flex min-h-10 w-fit items-center rounded-md border px-4 text-sm font-bold";

  if (status === "SUCCEEDED") {
    return `${base} border-emerald-700 bg-emerald-50 text-emerald-900`;
  }

  if (status === "PARTIAL" || status === "STARTED") {
    return `${base} border-amber-700 bg-amber-50 text-amber-900`;
  }

  if (status === "FAILED") {
    return `${base} border-red-700 bg-red-50 text-red-900`;
  }

  return `${base} border-slate-400 bg-white text-app-muted`;
}
