import type {
  CommunicationAutomationSuppressionMode,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import type { LocalAppUser } from "@/lib/auth/types";
import { APP_TIMEZONE } from "@/lib/app-timezone";
import { ensureJoiningNeverGivenSavedView } from "@/lib/communications/automation-seeds";
import {
  describeCommunicationCron,
  nextCommunicationCronDate,
} from "@/lib/communications/cron";
import {
  DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE,
  JOINING_NEVER_GIVEN_TEMPLATE_KEY,
  normalizeTemplateFields,
  type CommunicationTemplateFieldValues,
} from "@/lib/communications/templates";
import { prisma } from "@/lib/db/prisma";
import { getSavedListView } from "@/lib/list-views/saved-views";

const DEFAULT_AUTOMATION_LIMIT = 25;
const MAX_AUTOMATION_LIMIT = 50;
const ACTIVE_RUN_STATUSES = [
  "PENDING_NOTICE",
  "NOTICE_SENT",
  "READY_TO_SEND",
  "SENDING",
] as const;

export type CommunicationAutomationRecord =
  Prisma.CommunicationAutomationGetPayload<{
    include: {
      reviewers: {
        include: {
          reviewer: {
            select: {
              email: true;
              id: true;
              name: true;
            };
          };
        };
      };
      runs: {
        include: {
          events: true;
          recipients: true;
        };
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }];
        take: 5;
      };
      savedListView: {
        select: {
          id: true;
          name: true;
          resource: true;
        };
      };
    };
  }>;

export type CommunicationAutomationRunRecord =
  Prisma.CommunicationAutomationRunGetPayload<{
    include: {
      events: true;
      recipients: true;
    };
  }>;

export type CommunicationAutomationReviewerOption = {
  id: string;
  label: string;
};

export type CreateCommunicationAutomationInput = {
  cooldownDays?: number | null;
  fromEmail?: string | null;
  fromName?: string | null;
  name: string;
  preSendNoticeMinutes?: number | null;
  replyToEmail?: string | null;
  reviewerUserIds: string[];
  savedListViewId: string;
  scheduleCron: string;
  scheduleTimezone?: string | null;
  suppressionMode?: CommunicationAutomationSuppressionMode | null;
  templateFields?: CommunicationTemplateFieldValues;
  templateKey: string;
  templateVersion?: number | null;
};

export type ListCommunicationAutomationsInput = {
  limit?: number | null;
};

export type UpdateCommunicationAutomationTemplateInput = {
  id: string;
  templateFields: CommunicationTemplateFieldValues;
};

export type UpdateCommunicationAutomationInput = {
  cooldownDays?: number | null;
  id: string;
  name: string;
  reviewerUserIds: string[];
  savedListViewId: string;
  scheduleCron: string;
  suppressionMode?: CommunicationAutomationSuppressionMode | null;
  templateFields: CommunicationTemplateFieldValues;
};

export type CommunicationAutomationLifecycleAction =
  | {
      action: "delete";
      hasRuns: false;
      hasSentEmails: false;
    }
  | {
      action: "archive";
      hasRuns: boolean;
      hasSentEmails: boolean;
    }
  | {
      action: "unarchive";
      hasRuns: boolean;
      hasSentEmails: boolean;
    };

export async function listCommunicationAutomations(
  input: ListCommunicationAutomationsInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<CommunicationAutomationRecord[]> {
  return client.communicationAutomation.findMany({
    include: automationRecordInclude,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: clampAutomationLimit(input.limit),
  });
}

export async function getCommunicationAutomation(
  id: string,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<CommunicationAutomationRecord> {
  const automation = await client.communicationAutomation.findUnique({
    include: automationRecordInclude,
    where: { id },
  });

  if (!automation) {
    throw notFound("Communication automation was not found.");
  }

  return mergeActiveRuns(
    automation,
    await findMissingActiveRuns(id, automation.runs, client),
  );
}

export async function getCommunicationAutomationRun(
  automationId: string,
  runId: string,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<CommunicationAutomationRunRecord | null> {
  return client.communicationAutomationRun.findFirst({
    include: {
      events: true,
      recipients: true,
    },
    where: {
      automationId,
      id: runId,
    },
  });
}

export async function getCommunicationAutomationLifecycleAction(
  id: string,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<CommunicationAutomationLifecycleAction> {
  const automation = await client.communicationAutomation.findUnique({
    select: {
      archivedAt: true,
      id: true,
    },
    where: { id },
  });

  if (!automation) {
    throw notFound("Communication automation was not found.");
  }

  const [runCount, sentRecipientCount] = await Promise.all([
    client.communicationAutomationRun.count({
      where: { automationId: id },
    }),
    countSentAutomationRecipients(id, client),
  ]);
  const hasRuns = runCount > 0;
  const hasSentEmails = sentRecipientCount > 0;

  if (automation.archivedAt) {
    return { action: "unarchive", hasRuns, hasSentEmails };
  }

  if (!hasRuns && !hasSentEmails) {
    return { action: "delete", hasRuns: false, hasSentEmails: false };
  }

  return { action: "archive", hasRuns, hasSentEmails };
}

export async function listCommunicationAutomationReviewerOptions(
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<CommunicationAutomationReviewerOption[]> {
  const users = await client.appUser.findMany({
    orderBy: [{ name: "asc" }, { email: "asc" }, { id: "asc" }],
    select: {
      email: true,
      id: true,
      name: true,
    },
    where: {
      active: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    label: user.name ?? user.email ?? user.id,
  }));
}

export async function createJoiningNeverGivenAutomation(
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const savedView = await ensureJoiningNeverGivenSavedView(actor, client);

  const automation = await createCommunicationAutomation(
    {
      name: "Joining never-given follow-up",
      reviewerUserIds: [actor.id],
      savedListViewId: savedView.id,
      scheduleCron: "0 9 * * 2",
      scheduleTimezone: APP_TIMEZONE,
      suppressionMode: "NEVER_RESEND",
      templateFields: {
        ...DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE,
        format: "react-email-editor",
      },
      templateKey: JOINING_NEVER_GIVEN_TEMPLATE_KEY,
    },
    actor,
    client,
  );

  return getCommunicationAutomation(automation.id, actor, client);
}

export async function createCommunicationAutomation(
  input: CreateCommunicationAutomationInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const savedView = await getSavedListView(
    input.savedListViewId,
    actor,
    client,
  );
  const reviewerUserIds = uniqueStrings(input.reviewerUserIds);

  if (reviewerUserIds.length === 0) {
    throw badInput("Communication automation requires at least one reviewer.");
  }

  await validateReviewers(reviewerUserIds, client);

  const scheduleCron = normalizeScheduleCron(input.scheduleCron);

  const data = {
    audienceResource: savedView.resource,
    cooldownDays: normalizeCooldownDays(
      input.suppressionMode ?? "NEVER_RESEND",
      input.cooldownDays,
    ),
    createdByUserId: actor.id,
    fromEmail: normalizeOptionalText(input.fromEmail),
    fromName: normalizeOptionalText(input.fromName),
    name: normalizeRequiredText(input.name, "Automation name"),
    preSendNoticeMinutes: normalizeNoticeMinutes(
      input.preSendNoticeMinutes ?? 1440,
    ),
    replyToEmail: normalizeOptionalText(input.replyToEmail),
    savedListViewId: savedView.id,
    scheduleCron,
    scheduleTimezone: APP_TIMEZONE,
    segmentSummary: `Saved view: ${savedView.name}`,
    activatedAt: new Date(),
    activatedByUserId: actor.id,
    suppressionMode: input.suppressionMode ?? "NEVER_RESEND",
    templateFields: normalizeTemplateFields(
      input.templateKey,
      input.templateFields ?? {},
    ) as Prisma.InputJsonObject,
    templateKey: normalizeRequiredText(input.templateKey, "Template"),
    templateVersion: normalizeTemplateVersion(input.templateVersion ?? 1),
  } satisfies Prisma.CommunicationAutomationUncheckedCreateInput;

  return client.$transaction(async (tx) =>
    tx.communicationAutomation.create({
      data: {
        ...data,
        reviewers: {
          create: reviewerUserIds.map((reviewerUserId) => ({
            reviewerUserId,
          })),
        },
      },
      include: {
        reviewers: true,
      },
    }),
  );
}

export async function updateCommunicationAutomationTemplate(
  input: UpdateCommunicationAutomationTemplateInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const automation = await client.communicationAutomation.findUnique({
    where: { id: input.id },
  });

  if (!automation) {
    throw notFound("Communication automation was not found.");
  }

  return client.communicationAutomation.update({
    data: {
      templateFields: normalizeTemplateFields(
        automation.templateKey,
        input.templateFields,
      ) as Prisma.InputJsonObject,
    },
    include: automationRecordInclude,
    where: { id: input.id },
  });
}

export async function updateCommunicationAutomation(
  input: UpdateCommunicationAutomationInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const automation = await client.communicationAutomation.findUnique({
    where: { id: input.id },
  });

  if (!automation) {
    throw notFound("Communication automation was not found.");
  }

  const savedView = await getSavedListView(
    input.savedListViewId,
    actor,
    client,
  );
  const reviewerUserIds = uniqueStrings(input.reviewerUserIds);

  if (reviewerUserIds.length === 0) {
    throw badInput("Communication automation requires at least one reviewer.");
  }

  await validateReviewers(reviewerUserIds, client);

  const scheduleCron = normalizeScheduleCron(input.scheduleCron);
  const scheduleChanged = scheduleCron !== automation.scheduleCron;
  const nextScheduledSendAt = scheduleChanged
    ? nextCommunicationCronDate(scheduleCron)
    : null;
  const nextNoticeDueAt = nextScheduledSendAt
    ? new Date(
        nextScheduledSendAt.getTime() -
          automation.preSendNoticeMinutes * 60 * 1000,
      )
    : null;

  return client.$transaction(async (tx) => {
    await tx.communicationAutomationReviewer.deleteMany({
      where: { automationId: input.id },
    });

    if (nextScheduledSendAt && nextNoticeDueAt) {
      await tx.communicationAutomationRun.updateMany({
        data: {
          noticeDueAt: nextNoticeDueAt,
          scheduledSendAt: nextScheduledSendAt,
        },
        where: {
          automationId: input.id,
          status: {
            in: ["PENDING_NOTICE", "NOTICE_SENT", "READY_TO_SEND"],
          },
        },
      });
    }

    return tx.communicationAutomation.update({
      data: {
        audienceResource: savedView.resource,
        name: normalizeRequiredText(input.name, "Workflow name"),
        reviewers: {
          create: reviewerUserIds.map((reviewerUserId) => ({
            reviewerUserId,
          })),
        },
        savedListViewId: savedView.id,
        scheduleCron,
        scheduleTimezone: APP_TIMEZONE,
        segmentSummary: `Saved view: ${savedView.name}`,
        cooldownDays: normalizeCooldownDays(
          input.suppressionMode ?? "NEVER_RESEND",
          input.cooldownDays,
        ),
        suppressionMode: input.suppressionMode ?? "NEVER_RESEND",
        templateFields: normalizeTemplateFields(
          automation.templateKey,
          input.templateFields,
        ) as Prisma.InputJsonObject,
      },
      include: automationRecordInclude,
      where: { id: input.id },
    });
  });
}

export async function deleteCommunicationAutomation(
  id: string,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const lifecycleAction = await getCommunicationAutomationLifecycleAction(
    id,
    actor,
    client,
  );

  if (lifecycleAction.action !== "delete") {
    throw badInput(
      "Only communication workflows without scheduled runs or sent emails can be deleted.",
    );
  }

  await client.communicationAutomation.delete({
    where: { id },
  });

  return true;
}

export async function archiveCommunicationAutomation(
  id: string,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  await assertCommunicationAutomationExists(id, client);

  return client.communicationAutomation.update({
    data: {
      archivedAt: new Date(),
      nextNoticeAt: null,
      nextSendAt: null,
    },
    include: automationRecordInclude,
    where: { id },
  });
}

export async function unarchiveCommunicationAutomation(
  id: string,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  await assertCommunicationAutomationExists(id, client);

  return client.communicationAutomation.update({
    data: {
      archivedAt: null,
    },
    include: automationRecordInclude,
    where: { id },
  });
}

export function activationReadinessIssues(automation: {
  savedListViewId: string | null;
  scheduleCron: string | null;
  scheduleTimezone: string | null;
  templateKey: string | null;
  reviewers?: unknown[];
}) {
  const issues: string[] = [];

  if (!automation.savedListViewId) {
    issues.push("saved_view_required");
  }

  if (!automation.scheduleCron || !automation.scheduleTimezone) {
    issues.push("schedule_required");
  }

  if (!automation.templateKey) {
    issues.push("template_required");
  }

  if (!automation.reviewers || automation.reviewers.length === 0) {
    issues.push("reviewer_required");
  }

  return issues;
}

export function automationReadinessLabels(issues: string[]) {
  const labels: Record<string, string> = {
    reviewer_required: "At least one reviewer is selected",
    saved_view_required: "A saved segment is selected",
    schedule_required: "A recurring schedule is configured",
    template_required: "A structured email template is selected",
  } satisfies Record<string, string>;

  return issues.map((issue) => labels[issue] ?? issue);
}

export function clampAutomationLimit(limit: number | null | undefined) {
  if (!limit || limit < 1) {
    return DEFAULT_AUTOMATION_LIMIT;
  }

  return Math.min(Math.trunc(limit), MAX_AUTOMATION_LIMIT);
}

const automationRecordInclude = {
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
  runs: {
    include: {
      events: true,
      recipients: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 5,
  },
  savedListView: {
    select: {
      id: true,
      name: true,
      resource: true,
    },
  },
} satisfies Prisma.CommunicationAutomationInclude;

async function findMissingActiveRuns(
  automationId: string,
  summaryRuns: CommunicationAutomationRecord["runs"],
  client: PrismaClient,
) {
  const summaryRunIds = new Set(summaryRuns.map((run) => run.id));
  const activeRuns = await client.communicationAutomationRun.findMany({
    include: {
      events: true,
      recipients: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    where: {
      automationId,
      status: { in: [...ACTIVE_RUN_STATUSES] },
    },
  });

  return activeRuns.filter((run) => !summaryRunIds.has(run.id));
}

function mergeActiveRuns(
  automation: CommunicationAutomationRecord,
  activeRuns: CommunicationAutomationRunRecord[],
): CommunicationAutomationRecord {
  if (activeRuns.length === 0) {
    return automation;
  }

  return {
    ...automation,
    runs: [...automation.runs, ...activeRuns].sort(
      (left, right) =>
        right.updatedAt.getTime() - left.updatedAt.getTime() ||
        left.id.localeCompare(right.id),
    ),
  };
}

async function validateReviewers(
  reviewerUserIds: string[],
  client: PrismaClient,
) {
  const reviewers = await client.appUser.findMany({
    select: { id: true },
    where: {
      active: true,
      id: { in: reviewerUserIds },
    },
  });

  if (reviewers.length !== reviewerUserIds.length) {
    throw badInput("Automation reviewers must be active local app users.");
  }
}

async function assertCommunicationAutomationExists(
  id: string,
  client: PrismaClient,
) {
  const automation = await client.communicationAutomation.findUnique({
    select: { id: true },
    where: { id },
  });

  if (!automation) {
    throw notFound("Communication automation was not found.");
  }
}

function countSentAutomationRecipients(id: string, client: PrismaClient) {
  return client.communicationAutomationRecipient.count({
    where: {
      automationId: id,
      OR: [
        { acceptedAt: { not: null } },
        { deliveredAt: { not: null } },
        { providerMessageId: { not: null } },
      ],
    },
  });
}

function normalizeRequiredText(value: string, label: string) {
  const text = value.trim();

  if (!text) {
    throw badInput(`${label} is required.`);
  }

  return text;
}

function normalizeScheduleCron(value: string) {
  const result = describeCommunicationCron(value);

  if (!result.isValid) {
    throw badInput(result.message);
  }

  return result.value;
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

function normalizeNoticeMinutes(value: number) {
  if (!Number.isInteger(value) || value < 60 || value > 60 * 24 * 14) {
    throw badInput("Pre-send notice must be between 1 hour and 14 days.");
  }

  return value;
}

function normalizeCooldownDays(
  mode: CommunicationAutomationSuppressionMode,
  value: number | null | undefined,
) {
  if (mode === "NEVER_RESEND" || mode === "EVERY_RUN") {
    return null;
  }

  if (!Number.isInteger(value) || !value || value < 1) {
    throw badInput("Repeat delay requires a positive day count.");
  }

  return value;
}

function normalizeTemplateVersion(value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw badInput("Template version must be a positive integer.");
  }

  return value;
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function badInput(message: string) {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT" },
  });
}

function notFound(message: string) {
  return new GraphQLError(message, {
    extensions: { code: "NOT_FOUND" },
  });
}
