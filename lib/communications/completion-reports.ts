import {
  SYSTEM_EMAIL_HEADER_IMAGE_ALT,
  SYSTEM_EMAIL_HEADER_IMAGE_PATH,
} from "@/lib/communications/template-assets";
import { rockGetImageUrl } from "@/lib/rock/photos";

type CompletionReportRecipient = {
  displayNameSnapshot: string;
  emailSnapshot: string | null;
  exclusionReason?: string | null;
  person?: { photoRockId: number | null } | null;
  personRockId?: number | null;
  skipReason?: string | null;
  status: string;
};

export type CompletionReportInput = {
  recipients: CompletionReportRecipient[];
  workflowName: string;
};

export function renderCompletionReport(input: CompletionReportInput) {
  const subject = `${input.workflowName} staff summary`;
  const rows = input.recipients.map((recipient) => ({
    email: recipient.emailSnapshot ?? "",
    initials: initialsForName(recipient.displayNameSnapshot),
    name: recipient.displayNameSnapshot,
    outcome: outcomeForRecipient(recipient.status),
    photoUrl: recipient.person?.photoRockId
      ? rockGetImageUrl(
          process.env.ROCK_BASE_URL ?? "https://rock.ev.church",
          recipient.person.photoRockId,
        ).toString()
      : null,
    reason: reasonForRecipient(recipient),
  }));
  const sections = completionReportSections(rows);
  const text = [
    subject,
    "",
    ...sections.flatMap((section) => [
      `${section.label} (${section.rows.length})`,
      ...section.rows.map((row) =>
        [row.name, row.email, row.outcome, row.reason]
          .filter(Boolean)
          .join(" - "),
      ),
      "",
    ]),
  ].join("\n");

  const htmlSections = sections
    .map((section, index) => completionReportSectionHtml(section, index))
    .join("");

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        background: #f8f6f1;
        color: #2f332f;
        font-family: Arial, sans-serif;
        font-size: 15px;
        line-height: 24px;
      }

      .page {
        max-width: 680px;
        margin: 0 auto;
        padding: 32px 16px;
      }

      .header {
        margin: 0 0 16px;
        padding: 0 32px;
      }

      .header img {
        display: block;
        width: 48px;
        height: 48px;
        border-radius: 4px;
      }

      .card {
        background: #ffffff;
        border: 1px solid #ded8cc;
        border-radius: 6px;
        padding: 32px;
      }

      h1 {
        margin: 0 0 8px;
        color: #252923;
        font-size: 28px;
        font-weight: 700;
        line-height: 34px;
      }

      p {
        margin: 0 0 16px;
      }

      .lede {
        color: #66746e;
      }

      .recipient-list {
        width: 100%;
        border-collapse: collapse;
      }

      .recipient-section {
        margin-top: 24px;
      }

      .recipient-section-first {
        margin-top: 22px;
      }

      .section-heading {
        width: 100%;
        margin: 0 0 10px;
        border-collapse: collapse;
      }

      .section-title {
        color: #252923;
        font-size: 16px;
        font-weight: 700;
        line-height: 22px;
      }

      .section-count-cell {
        text-align: right;
      }

      .section-count {
        display: inline-block;
        border-radius: 999px;
        background: #f4efe4;
        color: #725b2d;
        font-size: 11px;
        font-weight: 700;
        line-height: 16px;
        padding: 3px 8px;
      }

      .recipient-card-cell {
        padding: 0 0 10px;
      }

      .recipient-card {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #e8e2d7;
        border-radius: 6px;
        background: #fbfaf7;
      }

      .avatar-cell {
        width: 48px;
        padding: 12px 12px 12px 14px;
        vertical-align: middle;
      }

      .avatar,
      .avatar-fallback {
        display: block;
        width: 40px;
        height: 40px;
        border-radius: 20px;
      }

      .avatar {
        object-fit: cover;
      }

      .avatar-fallback {
        background: #e7eee8;
        color: #2f6f77;
        font-size: 13px;
        font-weight: 700;
        line-height: 40px;
        text-align: center;
      }

      .recipient-detail {
        padding: 12px 14px 12px 0;
        vertical-align: top;
      }

      .recipient-topline {
        margin-bottom: 2px;
      }

      .recipient-name {
        display: inline-block;
        margin-right: 8px;
        color: #252923;
        font-size: 14px;
        font-weight: 700;
        line-height: 20px;
      }

      .recipient-email {
        color: #66746e;
        font-size: 12px;
        line-height: 18px;
      }

      .footer {
        margin-top: 16px;
        padding: 0 32px;
        color: #66746e;
        font-size: 12px;
        line-height: 20px;
      }

      .footer p {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <img src="${escapeHtml(systemEmailHeaderImageUrl())}" alt="${SYSTEM_EMAIL_HEADER_IMAGE_ALT}" />
      </div>
      <div class="card">
        <h1>${escapeHtml(subject)}</h1>
        <p class="lede">This workflow has finished attempting its recipient sends.</p>
        ${htmlSections}
      </div>
      <div class="footer">
        <p>You are receiving this because this address is configured for completion reports on this communication workflow.</p>
      </div>
    </div>
  </body>
</html>`;

  return { html, subject, text };
}

type CompletionReportOutcome =
  | "Excluded"
  | "Failed"
  | "Pending"
  | "Sent"
  | "Skipped";

function outcomeForRecipient(status: string): CompletionReportOutcome {
  if (status === "ACCEPTED" || status === "DELIVERED") {
    return "Sent";
  }

  if (status === "SKIPPED" || status === "SUPPRESSED") {
    return "Skipped";
  }

  if (status === "EXCLUDED") {
    return "Excluded";
  }

  if (status === "FAILED" || status === "BOUNCED" || status === "COMPLAINED") {
    return "Failed";
  }

  return "Pending";
}

function reasonForRecipient(recipient: CompletionReportRecipient) {
  if (recipient.status === "EXCLUDED") {
    return recipient.exclusionReason ?? "";
  }

  if (
    recipient.status === "SKIPPED" ||
    recipient.status === "SUPPRESSED" ||
    recipient.status === "FAILED"
  ) {
    return recipient.skipReason ?? "";
  }

  return "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function avatarHtml(row: {
  initials: string;
  name: string;
  photoUrl: string | null;
}) {
  if (row.photoUrl) {
    return `<img class="avatar" src="${escapeHtml(row.photoUrl)}" alt="" />`;
  }

  return `<div class="avatar-fallback">${escapeHtml(row.initials)}</div>`;
}

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = [parts[0]?.[0], parts[1]?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials || "?";
}

function systemEmailHeaderImageUrl() {
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:7000";
  return new URL(SYSTEM_EMAIL_HEADER_IMAGE_PATH, appBaseUrl).toString();
}

type CompletionReportRow = {
  email: string;
  initials: string;
  name: string;
  outcome: CompletionReportOutcome;
  photoUrl: string | null;
  reason: string;
};

type CompletionReportSection = {
  label: CompletionReportOutcome;
  rows: CompletionReportRow[];
};

function completionReportSections(
  rows: CompletionReportRow[],
): CompletionReportSection[] {
  return (["Sent", "Skipped", "Excluded", "Failed", "Pending"] as const)
    .map((label) => ({
      label,
      rows: rows.filter((row) => row.outcome === label),
    }))
    .filter((section) => section.rows.length > 0);
}

function completionReportSectionHtml(
  section: CompletionReportSection,
  index: number,
) {
  const sectionClass =
    index === 0
      ? "recipient-section recipient-section-first"
      : "recipient-section";

  return `<div class="${sectionClass}">
    <table class="section-heading" role="presentation">
      <tr>
        <td class="section-title">${escapeHtml(section.label)}</td>
        <td class="section-count-cell">
          <span class="section-count">${section.rows.length}</span>
        </td>
      </tr>
    </table>
    <table class="recipient-list" role="presentation" aria-label="${escapeHtml(section.label)} recipients">
      <tbody>${section.rows.map((row) => recipientCardHtml(row)).join("")}</tbody>
    </table>
  </div>`;
}

function recipientCardHtml(row: CompletionReportRow) {
  return `<tr>
    <td class="recipient-card-cell">
      <table class="recipient-card" role="presentation">
        <tr>
          <td class="avatar-cell">${avatarHtml(row)}</td>
          <td class="recipient-detail">
            <div class="recipient-topline">
              <span class="recipient-name">${escapeHtml(row.name)}</span>
            </div>
            <div class="recipient-email">${escapeHtml(row.email || "No email recorded")}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}
