import Link from "next/link";
import { redirect } from "next/navigation";
import { HouseholdParticipationPanel } from "@/components/dashboard/household-participation-panel";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { auth0 } from "@/lib/auth/auth0";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { getHouseholdParticipation } from "@/lib/giving/household-participation";
import {
  participationFromParams,
  participationHref,
} from "@/lib/giving/household-participation-params";
import {
  CHRISTIAN_LABELS,
  STAGE_LABELS,
} from "@/lib/giving/household-participation-contract";
export const metadata = { title: "Household participation" };
export default async function ParticipationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth0.getSession();
  const access = await getCurrentAccessState(session?.user);
  if (access.status === "anonymous") redirect("/auth/login");
  if (access.status === "needs_access") redirect("/access-request");
  let report;
  try {
    report = await getHouseholdParticipation(
      participationFromParams(await searchParams),
      access.user,
    );
  } catch (error) {
    const { GraphQLError } = await import("graphql");
    if (!(error instanceof GraphQLError)) throw error;
    return (
      <main className="mx-auto max-w-4xl p-8">
        <h1 className="text-2xl font-semibold">
          Refresh household participation
        </h1>
        <p className="my-4">{error.message}</p>
        <Link className="underline" href="/households/participation">
          Open a fresh report
        </Link>
      </main>
    );
  }
  const context = {
    ...report.filters,
    snapshotId:
      report.latestSync?.status === "SUCCEEDED" ? report.snapshotId : undefined,
    fundRockIds: report.fundRockIds,
  };
  const yes = (value: boolean | null) =>
    value === null ? "Unresolved" : value ? "Yes" : "No";
  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav active="households" canManageSettings canManageTools />
      <main className="mx-auto grid max-w-[1280px] gap-6 p-4 sm:p-7">
        <h1 className="text-3xl font-semibold">Household participation</h1>
        <HouseholdParticipationPanel report={report} />
        <section className="grid gap-4 rounded-lg border border-app-border bg-app-surface p-5">
          <h2 className="text-xl font-semibold">
            Matching households ({report.totalCount})
          </h2>
          <p className="text-sm text-app-muted">
            {report.filters.stage
              ? STAGE_LABELS[report.filters.stage]
              : "All stages"}{" "}
            ·{" "}
            {report.filters.christianStatus
              ? CHRISTIAN_LABELS[report.filters.christianStatus]
              : "All classifications"}{" "}
            ·{" "}
            {report.filters.giving === "SELECTED"
              ? "Gave in the selected period"
              : report.filters.giving === "LATEST"
                ? "Gave in the latest completed month"
                : report.filters.giving === "NOT_SELECTED"
                  ? "Did not give in the selected period"
                  : "Any giving participation"}
            {report.filters.reviewOnly ? " · Household review" : ""}
            {report.filters.recordedGivers
              ? ` · Recorded givers: ${report.filters.recordedGivers.toLowerCase().replaceAll("_", " ")}`
              : ""}
          </p>
          {report.filters.reviewOnly && (
            <p className="text-sm">
              For Tataihono to triage: inspect the linked family and giving
              households in Rock, confirm current adult memberships and giving
              links, then assign any correction to the responsible Rock staff
              member. These flags are checks, not instructions to merge or split
              households. No source correction is automatic.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr>
                  {[
                    "Household",
                    "Campus",
                    "Adult classification",
                    "Giving in period / latest",
                    "Recorded givers",
                    "Review",
                  ].map((h) => (
                    <th key={h} className="p-2" scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr
                    key={row.rockId}
                    className="border-t border-app-border-faint"
                  >
                    <th className="p-2" scope="row">
                      <Link
                        className="underline"
                        href={`/households/${row.rockId}`}
                      >
                        {row.name}
                      </Link>
                    </th>
                    <td className="p-2">{row.campusName}</td>
                    <td className="p-2">
                      {STAGE_LABELS[row.stage]} ·{" "}
                      {CHRISTIAN_LABELS[row.christianStatus]}
                      <span className="block text-xs text-app-muted">
                        {row.adultCount} eligible adults;{" "}
                        {row.adultStatuses.join(", ")}. {row.proxyAdultCount}{" "}
                        Investigating proxy.
                      </span>
                    </td>
                    <td className="p-2">
                      {yes(row.givingSelected)} / {yes(row.givingLatest)}
                    </td>
                    <td className="p-2">
                      {row.recordedGivers ?? "Unresolved"}
                    </td>
                    <td className="p-2">
                      {row.reviewReasons.length ? (
                        <>
                          <span>
                            {row.reviewReasons
                              .map((r) => r.toLowerCase().replaceAll("_", " "))
                              .join("; ")}
                          </span>
                          <span className="block text-xs">
                            Giving households:{" "}
                            {row.givingHouseholdRockIds.join(", ") || "Missing"}
                            . Check Rock relationships; Tataihono to triage.{" "}
                            {row.reviewMembershipRockIds.length > 0
                              ? `Membership IDs to check: ${row.reviewMembershipRockIds.join(", ")}.`
                              : ""}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.nextAfter !== null &&
            report.latestSync?.status === "SUCCEEDED" && (
              <Link
                className="w-fit rounded border border-app-border px-4 py-2 text-sm"
                href={participationHref(context, { after: report.nextAfter })}
              >
                Next page
              </Link>
            )}
          {report.nextAfter !== null &&
            report.latestSync?.status !== "SUCCEEDED" && (
              <p className="text-sm text-app-muted">
                Further pages are available after a successful sync. These
                counts are provisional.
              </p>
            )}
          {report.filters.after && (
            <Link
              className="text-sm underline"
              href={participationHref(context, { after: undefined })}
            >
              Back to first page
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
