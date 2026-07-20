import type { AppUser, PrismaClient } from "@prisma/client";
import type { PgBoss } from "pg-boss";

import { APP_TIMEZONE } from "@/lib/app-timezone";
import { freezeCommunicationAutomationRun } from "@/lib/communications/automation-runs";
import { nextCommunicationCronDate } from "@/lib/communications/cron";
import {
  recordAcceptedAutomationRecipient,
  type EmailSender,
} from "@/lib/communications/email-sender";
import { createCommunicationEmailSender } from "@/lib/communications/sender-factory";
import {
  SYSTEM_EMAIL_HEADER_IMAGE_ALT,
  SYSTEM_EMAIL_HEADER_IMAGE_PATH,
} from "@/lib/communications/template-assets";
import {
  renderCommunicationTemplate,
  type CommunicationTemplateFieldValues,
} from "@/lib/communications/templates";
import { prisma } from "@/lib/db/prisma";
import { rockGetImageUrl } from "@/lib/rock/photos";
import {
  COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
  COMMUNICATION_AUTOMATION_NOTICE_QUEUE,
} from "@/lib/sync/job-constants";

export type CommunicationAutomationEvaluateJobData = {
  automationId: string;
  noticeDueAt?: string;
  scheduledSendAt?: string;
};

export type CommunicationAutomationRunJobData = {
  force?: boolean;
  runId: string;
};

export type CommunicationAutomationDueSendSweepResult = {
  processed: number;
  results: Array<{ runId: string; status: string }>;
};

type ReviewerNoticeRecipient = {
  avatarUrl: string | null;
  initials: string;
  name: string;
  type: "more" | "recipient";
};

export async function scheduleCommunicationAutomation(
  boss: PgBoss,
  automation: {
    id: string;
    preSendNoticeMinutes: number;
    scheduleCron: string;
    scheduleTimezone?: string | null;
  },
  after: Date = new Date(),
) {
  assertAutomationId(automation.id);

  await enqueueNextCommunicationAutomationEvaluation(boss, automation, after);
}

export async function enqueueNextCommunicationAutomationEvaluation(
  boss: PgBoss,
  automation: {
    id: string;
    preSendNoticeMinutes: number;
    scheduleCron: string;
  },
  after: Date = new Date(),
) {
  assertAutomationId(automation.id);

  const scheduledSendAt = nextCommunicationCronDate(
    automation.scheduleCron,
    after,
  );
  const noticeDueAt = new Date(
    scheduledSendAt.getTime() - automation.preSendNoticeMinutes * 60 * 1000,
  );

  return enqueueCommunicationAutomationEvaluation(
    boss,
    {
      automationId: automation.id,
      noticeDueAt: noticeDueAt.toISOString(),
      scheduledSendAt: scheduledSendAt.toISOString(),
    },
    noticeDueAt,
  );
}

export async function enqueueCommunicationAutomationEvaluation(
  boss: PgBoss,
  data: CommunicationAutomationEvaluateJobData,
  startAfter?: Date,
) {
  assertEvaluateJobData(data);

  return boss.send(COMMUNICATION_AUTOMATION_EVALUATE_QUEUE, data, {
    ...(startAfter ? { startAfter } : {}),
    singletonKey: evaluationSingletonKey(data),
  });
}

export async function enqueueCommunicationAutomationNotice(
  boss: PgBoss,
  data: CommunicationAutomationRunJobData,
) {
  assertRunJobData(data);

  return boss.send(COMMUNICATION_AUTOMATION_NOTICE_QUEUE, data, {
    singletonKey: data.runId,
  });
}

export async function performCommunicationAutomationEvaluationJob(
  data: CommunicationAutomationEvaluateJobData,
  dependencies: { boss?: PgBoss; prisma?: PrismaClient } = {},
) {
  assertEvaluateJobData(data);

  const client = dependencies.prisma ?? prisma;
  const automation = await client.communicationAutomation.findUnique({
    include: { createdBy: true },
    where: { id: data.automationId },
  });

  if (!automation || !isAutomationRunnable(automation)) {
    return { runId: null, status: "SKIPPED" as const };
  }

  const scheduledSendAt = data.scheduledSendAt
    ? new Date(data.scheduledSendAt)
    : (automation.nextSendAt ??
      nextCommunicationCronDate(automation.scheduleCron));
  const noticeDueAt = data.noticeDueAt
    ? new Date(data.noticeDueAt)
    : new Date(
        scheduledSendAt.getTime() - automation.preSendNoticeMinutes * 60 * 1000,
      );
  const run = await freezeCommunicationAutomationRun(
    {
      automationId: automation.id,
      noticeDueAt,
      scheduledSendAt,
    },
    actorFromAppUser(automation.createdBy),
    client,
  );

  if (!run) {
    if (dependencies.boss) {
      await enqueueNextCommunicationAutomationEvaluation(
        dependencies.boss,
        automation,
        scheduledSendAt,
      );
    }

    return { runId: null, status: "SKIPPED" as const };
  }

  if (dependencies.boss) {
    await enqueueCommunicationAutomationNotice(dependencies.boss, {
      runId: run.id,
    });
    await enqueueNextCommunicationAutomationEvaluation(
      dependencies.boss,
      automation,
      scheduledSendAt,
    );
  }

  return { runId: run.id, status: run.status };
}

export async function performCommunicationAutomationNoticeJob(
  data: CommunicationAutomationRunJobData,
  dependencies: { emailSender?: EmailSender; prisma?: PrismaClient } = {},
) {
  assertRunJobData(data);

  const client = dependencies.prisma ?? prisma;
  const run = await client.communicationAutomationRun.findUnique({
    include: {
      automation: {
        include: {
          reviewers: {
            include: {
              reviewer: {
                select: {
                  email: true,
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      recipients: {
        orderBy: [{ displayNameSnapshot: "asc" }, { id: "asc" }],
        select: {
          displayNameSnapshot: true,
          emailSnapshot: true,
          person: {
            select: {
              photoRockId: true,
            },
          },
          personRockId: true,
          status: true,
        },
        where: {
          status: { in: ["PENDING", "READY"] },
        },
      },
    },
    where: { id: data.runId },
  });

  if (!run) {
    throw new Error("Communication automation run was not found.");
  }

  if (run.status !== "PENDING_NOTICE") {
    return { runId: run.id, status: run.status };
  }

  await notifyCommunicationAutomationReviewers(
    run,
    dependencies.emailSender ?? createCommunicationEmailSender(),
    client,
  );

  const updated = await client.communicationAutomationRun.update({
    data: {
      noticeSentAt: new Date(),
      status: "NOTICE_SENT",
    },
    where: { id: run.id },
  });

  return { runId: updated.id, status: updated.status };
}

async function notifyCommunicationAutomationReviewers(
  run: NonNullable<
    Awaited<
      ReturnType<PrismaClient["communicationAutomationRun"]["findUnique"]>
    >
  > & {
    automation: {
      name: string;
      reviewers: Array<{
        reviewer: {
          email: string | null;
          id: string;
          name: string | null;
        };
        reviewerUserId: string;
      }>;
    };
    recipients: Array<{
      displayNameSnapshot: string;
      emailSnapshot: string | null;
      person: { photoRockId: number | null } | null;
      personRockId: number | null;
      status: string;
    }>;
  },
  emailSender: EmailSender,
  client: PrismaClient,
) {
  const reviewers = run.automation.reviewers;
  const reviewPath = `/communications/${run.automationId}/runs/${run.id}`;
  const reviewUrl = `${process.env.APP_BASE_URL ?? "http://localhost:7000"}${reviewPath}`;
  const subject = `Review communication: ${run.automation.name}`;
  const scheduledLabel = formatEmailDateTime(run.scheduledSendAt);
  const text = reviewerNoticeText({
    recipients: run.recipients,
    reviewUrl,
    scheduledLabel,
    workflowName: run.automation.name,
  });
  const html = reviewerNoticeHtml({
    recipients: run.recipients,
    reviewUrl,
    scheduledLabel,
    workflowName: run.automation.name,
  });

  await client.staffTask.createMany({
    data: reviewers.map((reviewer) => ({
      assignedToUserId: reviewer.reviewerUserId,
      description: `Review the scheduled communication run before it sends: ${reviewPath}`,
      dueAt: run.scheduledSendAt,
      priority: "HIGH",
      title: subject,
    })),
  });

  for (const reviewer of reviewers) {
    if (!reviewer.reviewer.email) {
      continue;
    }

    const result = await emailSender.send({
      automationId: run.automationId,
      from: "Ev Church <info@ev.church>",
      html,
      recipientEmail: reviewer.reviewer.email,
      recipientId: reviewer.reviewer.id,
      runId: run.id,
      subject,
      tags: {
        automationId: run.automationId,
        reviewerId: reviewer.reviewer.id,
        runId: run.id,
        type: "review-notice",
      },
      text,
    });

    if (result.status === "FAILED") {
      throw new Error(result.errorMessage);
    }
  }
}

export async function performCommunicationAutomationDueSendSweep(
  dependencies: {
    emailSender?: EmailSender;
    limit?: number;
    now?: Date;
    prisma?: PrismaClient;
  } = {},
): Promise<CommunicationAutomationDueSendSweepResult> {
  const now = dependencies.now ?? new Date();
  const client = dependencies.prisma ?? prisma;
  const limit = Math.min(Math.max(dependencies.limit ?? 25, 1), 100);
  const dueRuns = await client.communicationAutomationRun.findMany({
    orderBy: [{ scheduledSendAt: "asc" }, { updatedAt: "asc" }, { id: "asc" }],
    select: { id: true },
    take: limit,
    where: {
      automation: {
        archivedAt: null,
        pausedAt: null,
      },
      scheduledSendAt: { lte: now },
      status: "READY_TO_SEND",
    },
  });
  const results: CommunicationAutomationDueSendSweepResult["results"] = [];

  for (const run of dueRuns) {
    results.push(
      await performCommunicationAutomationSendJob(
        { runId: run.id },
        {
          emailSender: dependencies.emailSender,
          now,
          prisma: client,
        },
      ),
    );
  }

  return { processed: results.length, results };
}

export async function performCommunicationAutomationSendJob(
  data: CommunicationAutomationRunJobData,
  dependencies: {
    emailSender?: EmailSender;
    now?: Date;
    prisma?: PrismaClient;
  } = {},
) {
  assertRunJobData(data);

  const now = dependencies.now ?? new Date();
  const client = dependencies.prisma ?? prisma;
  const run = await client.communicationAutomationRun.findUnique({
    include: {
      automation: true,
    },
    where: { id: data.runId },
  });

  if (!run) {
    throw new Error("Communication automation run was not found.");
  }

  if (run.status !== "READY_TO_SEND") {
    return { runId: run.id, status: run.status };
  }

  if (!isAutomationRunnable(run.automation)) {
    const updated = await client.communicationAutomationRun.update({
      data: { status: "SKIPPED" },
      where: { id: run.id },
    });

    return { runId: updated.id, status: updated.status };
  }

  if (!data.force && run.scheduledSendAt > now) {
    return { runId: run.id, status: run.status };
  }

  if (run.deliverableCount === 0) {
    const updated = await client.communicationAutomationRun.update({
      data: {
        completedAt: now,
        status: "SKIPPED",
      },
      where: { id: run.id },
    });

    return { runId: updated.id, status: updated.status };
  }

  const claim = await client.communicationAutomationRun.updateMany({
    data: {
      sendStartedAt: now,
      status: "SENDING",
    },
    where: {
      id: run.id,
      status: "READY_TO_SEND",
      ...(data.force ? {} : { scheduledSendAt: { lte: now } }),
    },
  });

  if (claim.count === 0) {
    const currentRun = await client.communicationAutomationRun.findUnique({
      select: { id: true, status: true },
      where: { id: run.id },
    });

    return {
      runId: currentRun?.id ?? run.id,
      status: currentRun?.status ?? run.status,
    };
  }

  const sendRun = await client.communicationAutomationRun.findUnique({
    include: {
      automation: true,
      recipients: {
        where: { status: "READY" },
      },
    },
    where: { id: run.id },
  });

  if (!sendRun) {
    throw new Error("Communication automation run was not found.");
  }

  const sender = dependencies.emailSender ?? createCommunicationEmailSender();
  let acceptedCount = 0;
  let failedCount = 0;

  for (const recipient of sendRun.recipients) {
    if (recipient.status !== "READY") {
      continue;
    }

    if (!recipient.emailSnapshot) {
      continue;
    }

    const rendered = await renderCommunicationTemplate({
      fields: (sendRun.automation.templateFields ??
        {}) as CommunicationTemplateFieldValues,
      key: sendRun.automation.templateKey,
      tokenContext: {
        displayName: recipient.displayNameSnapshot,
        firstName: firstNameFromDisplayName(recipient.displayNameSnapshot),
      },
    });
    const result = await sender.send({
      automationId: sendRun.automationId,
      from: senderFromAutomation(sendRun.automation),
      html: rendered.html,
      recipientEmail: recipient.emailSnapshot,
      recipientId: recipient.id,
      replyTo: sendRun.automation.replyToEmail,
      runId: sendRun.id,
      subject: rendered.subject,
      tags: {
        automationId: sendRun.automationId,
        recipientId: recipient.id,
        runId: sendRun.id,
        templateKey: sendRun.automation.templateKey,
      },
      text: rendered.text,
    });

    if (result.status === "ACCEPTED") {
      acceptedCount += 1;
      await recordAcceptedAutomationRecipient(
        {
          acceptedAt: now,
          providerMessageId: result.providerMessageId,
          recipientId: recipient.id,
        },
        client,
      );
    } else {
      failedCount += 1;
      await client.$transaction([
        client.communicationAutomationRecipient.update({
          data: {
            failedAt: now,
            skipReason: result.errorMessage,
            status: "FAILED",
          },
          where: { id: recipient.id },
        }),
        client.communicationAutomationRecipientEvent.create({
          data: {
            automationId: sendRun.automationId,
            eventType: "FAILED",
            recipientId: recipient.id,
            runId: sendRun.id,
            summary: result.errorMessage,
          },
        }),
      ]);
    }
  }

  const status =
    acceptedCount === 0 && failedCount > 0
      ? "FAILED"
      : failedCount > 0
        ? "PARTIAL"
        : acceptedCount > 0
          ? "SENT"
          : "SKIPPED";
  const updated = await client.communicationAutomationRun.update({
    data: {
      acceptedCount: { increment: acceptedCount },
      completedAt: now,
      failedCount: { increment: failedCount },
      status,
    },
    where: { id: run.id },
  });

  return { runId: updated.id, status: updated.status };
}

export function scheduleKeyForAutomation(automationId: string) {
  assertAutomationId(automationId);
  return `communication-automation:${automationId}`;
}

function evaluationSingletonKey(data: CommunicationAutomationEvaluateJobData) {
  return data.scheduledSendAt
    ? `${data.automationId}:${data.scheduledSendAt}`
    : data.automationId;
}

function assertEvaluateJobData(data: CommunicationAutomationEvaluateJobData) {
  assertAutomationId(data.automationId);

  for (const value of [data.noticeDueAt, data.scheduledSendAt]) {
    if (value && Number.isNaN(new Date(value).getTime())) {
      throw new Error("Communication automation job dates must be ISO dates.");
    }
  }
}

function assertRunJobData(data: CommunicationAutomationRunJobData) {
  if (!data.runId || typeof data.runId !== "string") {
    throw new Error("Communication automation run jobs require a runId.");
  }
}

function assertAutomationId(automationId: string) {
  if (!automationId || typeof automationId !== "string") {
    throw new Error(
      "Communication automation evaluation jobs require an automationId.",
    );
  }
}

function actorFromAppUser(user: AppUser) {
  return {
    active: user.active,
    auth0Subject: user.auth0Subject,
    email: user.email,
    id: user.id,
    name: user.name,
    rockPersonId: user.rockPersonId,
    role: user.role,
  };
}

function isAutomationRunnable(automation: {
  archivedAt: Date | null;
  pausedAt: Date | null;
}) {
  return !automation.archivedAt && !automation.pausedAt;
}

function firstNameFromDisplayName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] ?? "";
}

function reviewerNoticeText({
  recipients,
  reviewUrl,
  scheduledLabel,
  workflowName,
}: {
  recipients: Array<{
    displayNameSnapshot: string;
    emailSnapshot: string | null;
    person?: { photoRockId: number | null } | null;
    personRockId?: number | null;
  }>;
  reviewUrl: string;
  scheduledLabel: string;
  workflowName: string;
}) {
  const recipientLines = reviewerNoticeRecipientLines(recipients);

  return [
    `${workflowName} is ready for review.`,
    "",
    `Scheduled send: ${scheduledLabel}`,
    "",
    `Open review: ${reviewUrl}`,
    "",
    `Recipients: ${recipients.length}`,
    ...recipientLines.map((recipient) => `- ${recipient.name}`),
  ].join("\n");
}

function reviewerNoticeHtml({
  recipients,
  reviewUrl,
  scheduledLabel,
  workflowName,
}: {
  recipients: Array<{
    displayNameSnapshot: string;
    emailSnapshot: string | null;
    person?: { photoRockId: number | null } | null;
    personRockId?: number | null;
  }>;
  reviewUrl: string;
  scheduledLabel: string;
  workflowName: string;
}) {
  const recipientLines = reviewerNoticeRecipientLines(recipients);
  const recipientRows = chunkArray(recipientLines, 2);

  return `<!doctype html>
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
        max-width: 600px;
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
        margin: 0 0 16px;
        color: #252923;
        font-size: 28px;
        font-weight: 700;
        line-height: 34px;
      }

      p {
        margin: 0 0 16px;
      }

      .meta {
        margin: 20px 0;
        padding: 14px 0;
        border-top: 1px solid #e8e2d7;
        border-bottom: 1px solid #e8e2d7;
      }

      .meta-label {
        margin: 0 0 4px;
        color: #66746e;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        line-height: 16px;
        text-transform: uppercase;
      }

      .meta-value {
        margin: 0;
        color: #252923;
        font-size: 15px;
        font-weight: 700;
        line-height: 22px;
      }

      .button {
        display: inline-block;
        margin-top: 4px;
        border-radius: 6px;
        background: #2f6f77;
        color: #ffffff !important;
        font-size: 13px;
        font-weight: 700;
        line-height: 18px;
        padding: 11px 16px;
        text-decoration: none;
      }

      .fallback {
        margin: 18px 0 0;
        color: #66746e;
        font-size: 12px;
        line-height: 20px;
        word-break: break-word;
      }

      .recipients {
        margin-top: 24px;
        padding-top: 18px;
        border-top: 1px solid #e8e2d7;
      }

      .recipients-title {
        margin: 0 0 10px;
        color: #252923;
        font-size: 15px;
        font-weight: 700;
        line-height: 22px;
      }

      .recipient-list {
        width: 100%;
        border-collapse: collapse;
      }

      .recipient-cell {
        width: 50%;
        padding: 8px 10px 8px 0;
        border-top: 1px solid #f0ebe2;
        vertical-align: middle;
      }

      .recipient-row:first-child .recipient-cell {
        border-top: 0;
      }

      .recipient-name {
        color: #252923;
        font-size: 14px;
        font-weight: 700;
        line-height: 20px;
      }

      .recipient-more {
        color: #66746e;
        font-size: 12px;
        line-height: 18px;
      }

      .avatar,
      .avatar-fallback {
        width: 32px;
        height: 32px;
        border-radius: 16px;
      }

      .avatar {
        display: block;
        object-fit: cover;
      }

      .avatar-fallback {
        background: #e7eee8;
        color: #2f6f77;
        font-size: 12px;
        font-weight: 700;
        line-height: 32px;
        text-align: center;
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
        <h1>Review ${escapeHtml(workflowName)}</h1>
        <p>This communication is ready for review before it sends.</p>
        <div class="meta">
          <p class="meta-label">Scheduled send</p>
          <p class="meta-value">${escapeHtml(scheduledLabel)}</p>
        </div>
        <a class="button" href="${escapeHtml(reviewUrl)}">Open review</a>
        <p class="fallback">If the button does not work, open this link: ${escapeHtml(reviewUrl)}</p>
        <div class="recipients">
          <p class="recipients-title">${recipients.length} ${recipients.length === 1 ? "recipient" : "recipients"} in this scheduled run</p>
          <table class="recipient-list" role="presentation" aria-label="Recipients">
            ${recipientRows
              .map((row) => reviewerNoticeRecipientRow(row))
              .join("")}
          </table>
        </div>
      </div>
      <div class="footer">
        <p>You are receiving this because you are a reviewer for this communication workflow.</p>
      </div>
    </div>
  </body>
</html>`;
}

function reviewerNoticeRecipientLines(
  recipients: Array<{
    displayNameSnapshot: string;
    emailSnapshot: string | null;
    person?: { photoRockId: number | null } | null;
    personRockId?: number | null;
  }>,
) {
  const visibleRecipients: ReviewerNoticeRecipient[] = recipients
    .slice(0, 50)
    .map((recipient) => ({
      avatarUrl: recipient.person?.photoRockId
        ? rockGetImageUrl(
            process.env.ROCK_BASE_URL ?? "https://rock.ev.church",
            recipient.person.photoRockId,
          ).toString()
        : null,
      initials: initialsForName(recipient.displayNameSnapshot),
      name: recipient.displayNameSnapshot,
      type: "recipient",
    }));
  const hiddenCount = recipients.length - visibleRecipients.length;

  if (hiddenCount > 0) {
    visibleRecipients.push({
      avatarUrl: null,
      initials: "+",
      name: `${hiddenCount} more ${hiddenCount === 1 ? "recipient" : "recipients"}`,
      type: "more" as const,
    });
  }

  return visibleRecipients;
}

function reviewerNoticeRecipientRow(
  recipients: ReturnType<typeof reviewerNoticeRecipientLines>,
) {
  const cells = recipients.map((recipient) =>
    reviewerNoticeRecipientCell(recipient),
  );

  if (cells.length === 1) {
    cells.push('<td class="recipient-cell">&nbsp;</td>');
  }

  return `<tr class="recipient-row">${cells.join("")}</tr>`;
}

function reviewerNoticeRecipientCell(
  recipient: ReturnType<typeof reviewerNoticeRecipientLines>[number],
) {
  const avatar = recipient.avatarUrl
    ? `<img class="avatar" src="${escapeHtml(recipient.avatarUrl)}" alt="" />`
    : `<div class="avatar-fallback">${escapeHtml(recipient.initials)}</div>`;
  const labelClass =
    recipient.type === "more" ? "recipient-more" : "recipient-name";

  return `<td class="recipient-cell">
    <table role="presentation" style="border-collapse: collapse;">
      <tr>
        <td style="padding: 0 10px 0 0; vertical-align: middle;">${avatar}</td>
        <td class="${labelClass}" style="vertical-align: middle;">${escapeHtml(recipient.name)}</td>
      </tr>
    </table>
  </td>`;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = [parts[0]?.[0], parts[1]?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return initials || "?";
}

function formatEmailDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: APP_TIMEZONE,
  }).format(value);
}

function systemEmailHeaderImageUrl() {
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:7000";
  return new URL(SYSTEM_EMAIL_HEADER_IMAGE_PATH, appBaseUrl).toString();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function senderFromAutomation(automation: {
  fromEmail: string | null;
  fromName: string | null;
}) {
  if (!automation.fromEmail) {
    return "";
  }

  return automation.fromName
    ? `${automation.fromName} <${automation.fromEmail}>`
    : automation.fromEmail;
}
