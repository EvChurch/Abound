import Link from "next/link";
import type {
  ParticipationReport,
  ParticipationSummary,
} from "@/lib/giving/household-participation";
import {
  CHRISTIAN_LABELS,
  STAGE_LABELS,
  type ParticipationInput,
} from "@/lib/giving/household-participation-contract";
import { participationHref } from "@/lib/giving/household-participation-params";

export function HouseholdParticipationPanel({
  report,
}: {
  report: ParticipationReport;
}) {
  const context = {
    ...report.filters,
    after: undefined,
    snapshotId:
      report.latestSync?.status === "SUCCEEDED" ? report.snapshotId : undefined,
    fundRockIds: report.fundRockIds,
  };
  function countLink(
    value: number | null,
    filters: Partial<ParticipationInput>,
    label: string,
  ) {
    if (value === null)
      return <span aria-label={`${label}: unavailable`}>Unavailable</span>;
    if (value === 0) return <span>0</span>;
    return (
      <Link
        className="underline decoration-app-border underline-offset-4 hover:text-app-accent-strong"
        href={participationHref(context, filters)}
        aria-label={`${label}: ${value} households`}
      >
        {value.toLocaleString()}
      </Link>
    );
  }
  const rate = (n: number | null) =>
    n === null
      ? "Not applicable"
      : new Intl.NumberFormat("en-NZ", {
          style: "percent",
          maximumFractionDigits: 1,
        }).format(n);
  return (
    <section className="grid gap-4 rounded-[10px] border border-app-border bg-app-surface p-5">
      <div>
        <h2 className="text-xl font-semibold">Household participation</h2>
        <p className="mt-2 text-sm text-app-muted">
          Current household profile, giving during the selected period.
        </p>
      </div>
      <form
        action="/households/participation"
        className="flex flex-wrap items-end gap-3"
      >
        <label className="grid gap-1 text-sm">
          Completed months
          <select
            className="rounded border border-app-border bg-app-background p-2"
            name="months"
            defaultValue={report.filters.months}
          >
            {[1, 3, 6, 12, 24].map((n) => (
              <option key={n} value={n}>
                {n === 24 ? "2 years" : `${n} month${n === 1 ? "" : "s"}`}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Campuses
          <select
            className="rounded border border-app-border bg-app-background p-2"
            name="campuses"
            defaultValue={report.filters.campusRockIds
              .map((v) => v ?? "unassigned")
              .join(",")}
          >
            <option value="2,3,4">Central, North and UniChurch</option>
            <option value="2,3,4,5,unassigned">
              All campuses and unassigned
            </option>
            <option value="3">Central</option>
            <option value="2">North</option>
            <option value="4">UniChurch</option>
            <option value="5">Online</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Christian classification
          <select
            className="rounded border border-app-border bg-app-background p-2"
            name="christianStatus"
            defaultValue={report.filters.christianStatus ?? ""}
          >
            <option value="">All classifications</option>
            {Object.entries(CHRISTIAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="funds" value="" />
        <label className="grid gap-1 text-sm">
          Enabled funds
          <select
            multiple
            size={Math.min(3, report.availableFunds.length) || 1}
            className="rounded border border-app-border bg-app-background p-2"
            name="funds"
            defaultValue={report.fundRockIds.map(String)}
          >
            {report.availableFunds.map((f) => (
              <option key={f.rockId} value={f.rockId}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <button
          className="rounded bg-app-accent-strong px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Apply filters
        </button>
      </form>
      <p className="text-sm text-app-muted">
        {report.start.slice(0, 7)} through{" "}
        {new Date(new Date(report.endExclusive).getTime() - 1)
          .toISOString()
          .slice(0, 7)}{" "}
        · Latest completed month: {report.latestStart.slice(0, 7)} · UTC
      </p>
      <p className="text-xs text-app-muted">
        Funds: {report.funds.map((f) => f.name).join(", ") || "None selected"}.
        Sync: {report.latestSync?.status ?? "No sync"}
        {report.latestSync?.completedAt
          ? ` at ${report.latestSync.completedAt}`
          : ""}
        .
      </p>
      <ul className="grid gap-1 text-sm text-app-muted">
        {report.warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      {!report.filters.stage &&
      !report.filters.giving &&
      !report.filters.reviewOnly ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <caption className="sr-only">
              Household participation by connection stage
            </caption>
            <thead>
              <tr className="border-b border-app-border">
                {[
                  "Connection stage",
                  "Households",
                  "Christian adult present",
                  "All adults non-Christian¹",
                  "Unknown",
                  "Giving in period",
                  "Period participation",
                  "Giving latest month",
                  "Latest participation",
                  "Christian participation",
                ].map((label) => (
                  <th
                    key={label}
                    scope="col"
                    className="p-2 align-bottom font-semibold"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.summaries.map((row: ParticipationSummary) => {
                const stage = row.stage === "TOTAL" ? undefined : row.stage;
                const label =
                  row.stage === "TOTAL" ? "Total" : STAGE_LABELS[row.stage];
                return (
                  <tr
                    key={row.stage}
                    className="border-b border-app-border-faint"
                  >
                    <th scope="row" className="p-2">
                      {label}
                    </th>
                    <td className="p-2">
                      {countLink(
                        row.households,
                        { stage, giving: undefined },
                        `${label}, all`,
                      )}
                    </td>
                    <td className="p-2">
                      {countLink(
                        row.christian,
                        {
                          stage,
                          christianStatus: "CHRISTIAN",
                          giving: undefined,
                        },
                        `${label}, Christian adult present`,
                      )}
                    </td>
                    <td className="p-2">
                      {countLink(
                        row.nonChristian,
                        {
                          stage,
                          christianStatus: "NON_CHRISTIAN",
                          giving: undefined,
                        },
                        `${label}, all adults non-Christian`,
                      )}
                    </td>
                    <td className="p-2">
                      {countLink(
                        row.unknown,
                        {
                          stage,
                          christianStatus: "UNKNOWN",
                          giving: undefined,
                        },
                        `${label}, unknown`,
                      )}
                    </td>
                    <td className="p-2">
                      {countLink(
                        row.giving,
                        { stage, giving: "SELECTED" },
                        `${label}, giving in period`,
                      )}
                    </td>
                    <td className="p-2">
                      {rate(row.participationRate)}
                      {row.unresolvedGiving > 0 && (
                        <span className="block text-xs">
                          {row.unresolvedGiving} unresolved mappings
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      {countLink(
                        row.latestGiving,
                        { stage, giving: "LATEST" },
                        `${label}, giving latest month`,
                      )}
                    </td>
                    <td className="p-2">{rate(row.latestParticipationRate)}</td>
                    <td className="p-2">
                      {rate(row.christianParticipationRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Link
          className="text-sm underline"
          href={participationHref(context, {
            stage: undefined,
            giving: undefined,
            reviewOnly: false,
            after: undefined,
          })}
        >
          Back to participation summary
        </Link>
      )}
      <p className="text-xs text-app-muted">
        ¹ Investigating is the temporary non-Christian proxy. Other unverified
        statuses stay Unknown. Christian participation is unavailable because no
        positive source is verified. Not applicable also indicates an empty
        denominator or incomplete data.
      </p>
      <p className="text-sm">
        <Link
          className="underline"
          href={participationHref(context, {
            reviewOnly: true,
            giving: undefined,
            stage: undefined,
          })}
        >
          Review household data
        </Link>{" "}
        · Recorded givers in the same period:{" "}
        {countLink(
          report.recordedGiverDistribution.zero,
          { recordedGivers: "ZERO" },
          "Zero recorded givers",
        )}{" "}
        households with zero,{" "}
        {countLink(
          report.recordedGiverDistribution.one,
          { recordedGivers: "ONE" },
          "One recorded giver",
        )}{" "}
        with one,{" "}
        {countLink(
          report.recordedGiverDistribution.two,
          { recordedGivers: "TWO" },
          "Two recorded givers",
        )}{" "}
        with two,{" "}
        {countLink(
          report.recordedGiverDistribution.threeOrMore,
          { recordedGivers: "THREE_OR_MORE" },
          "Three or more recorded givers",
        )}{" "}
        with three or more;{" "}
        {countLink(
          report.recordedGiverDistribution.unresolved,
          { recordedGivers: "UNRESOLVED" },
          "Unresolved recorded givers",
        )}{" "}
        unresolved. A recorded giver may represent joint giving. These counts do
        not establish whether a household is a flat.
      </p>
      <details className="text-xs text-app-muted">
        <summary className="cursor-pointer">
          Definitions and limitations
        </summary>
        <p className="mt-2 leading-5">{report.sourceExplanation}</p>
      </details>
    </section>
  );
}
