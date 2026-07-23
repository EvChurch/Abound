import { describe, expect, it } from "vitest";

import { renderCompletionReport } from "@/lib/communications/completion-reports";

describe("communication completion reports", () => {
  it("renders a staff summary with names, emails, and outcomes", () => {
    const report = renderCompletionReport({
      recipients: [
        {
          displayNameSnapshot: "Jane Citizen",
          emailSnapshot: "jane@example.com",
          status: "ACCEPTED",
        },
        {
          displayNameSnapshot: "Alex Visitor",
          emailSnapshot: "alex@example.com",
          skipReason: "Missing active email.",
          status: "SKIPPED",
        },
        {
          displayNameSnapshot: "Sam Member",
          emailSnapshot: "sam@example.com",
          exclusionReason: "Reviewer removed from this run.",
          status: "EXCLUDED",
        },
      ],
      workflowName: "New giver follow-up",
    });

    expect(report.subject).toBe("New giver follow-up staff summary");
    expect(report.text).toContain("Jane Citizen - jane@example.com - Sent");
    expect(report.text).toContain(
      "Alex Visitor - alex@example.com - Skipped - Missing active email.",
    );
    expect(report.text).toContain(
      "Sam Member - sam@example.com - Excluded - Reviewer removed from this run.",
    );
    expect(report.html).toContain("recipient-card");
    expect(report.html).toContain("avatar-fallback");
    expect(report.html).toContain(
      'class="recipient-section recipient-section-first"',
    );
    expect(report.html).toContain("Sent</td>");
    expect(report.html).toContain("Skipped</td>");
    expect(report.html).toContain("Excluded</td>");
    expect(report.html).not.toContain('class="outcome');
    expect(report.html).not.toContain("Missing active email.");
    expect(report.html).not.toContain("Reviewer removed from this run.");
    expect(report.html).not.toContain("Completion report summary");
    expect(report.html).not.toContain("gift amount");
    expect(report.html).not.toContain("payment");
    expect(report.html).not.toContain("provider payload");
  });

  it("renders Rock avatars when a synced photo id is present", () => {
    const report = renderCompletionReport({
      recipients: [
        {
          displayNameSnapshot: "Jane Citizen",
          emailSnapshot: "jane@example.com",
          person: { photoRockId: 123 },
          status: "ACCEPTED",
        },
      ],
      workflowName: "New giver follow-up",
    });

    expect(report.html).toContain("GetImage.ashx?id=123");
    expect(report.html).toContain('class="avatar"');
  });
});
