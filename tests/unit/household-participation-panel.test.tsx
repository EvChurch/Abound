import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HouseholdParticipationPanel } from "@/components/dashboard/household-participation-panel";
import { participationReportFixture as report } from "../fixtures/household-participation";
describe("household participation UI contract", () => {
  it("labels limits, exposes all periods and preserves the source cohort in count links", () => {
    const html = renderToStaticMarkup(
      <HouseholdParticipationPanel report={report} />,
    );
    expect(html).toContain("2 years");
    expect(html).toContain("Not applicable");
    expect(html).toContain("Investigating is the temporary");
    expect(html).toContain("Enabled fund");
    expect(html).toContain("Recorded givers");
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(
      (m) => new URL(m[1].replaceAll("&amp;", "&"), "https://example.test"),
    );
    const giving = links.find(
      (l) => l.searchParams.get("giving") === "SELECTED",
    )!;
    for (const [key, value] of Object.entries({
      months: "24",
      campuses: "3",
      funds: "1",
      snapshotId: "snapshot",
      asOf: "2026-10-24T00:00:00.000Z",
    }))
      expect(giving.searchParams.get(key)).toBe(value);
  });
  it("avoids misleading count links when displaying a restricted drilldown", () => {
    const html = renderToStaticMarkup(
      <HouseholdParticipationPanel
        report={{ ...report, filters: { ...report.filters, giving: "LATEST" } }}
      />,
    );
    expect(html).toContain("Back to participation summary");
    expect(html).not.toContain("Giving in period</th>");
  });
  it("allows fresh provisional first-page drilldowns without a misleading stable snapshot", () => {
    const html = renderToStaticMarkup(
      <HouseholdParticipationPanel
        report={{
          ...report,
          latestSync: { id: "run", status: "STARTED", completedAt: null },
        }}
      />,
    );
    expect(html).not.toContain("snapshotId=");
  });
});
