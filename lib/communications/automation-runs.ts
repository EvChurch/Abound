import type {
  CommunicationAutomationRecipientStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import type { LocalAppUser } from "@/lib/auth/types";
import {
  resolveCommunicationAudienceMembers,
  type CommunicationAudienceMember,
} from "@/lib/communications/segments";
import { nextCommunicationCronDate } from "@/lib/communications/cron";
import {
  findActiveSuppression,
  findPermanentExclusionSuppression,
  recipientKeyFor,
  type RecipientIdentity,
} from "@/lib/communications/suppression";
import { prisma } from "@/lib/db/prisma";

export type FreezeCommunicationAutomationRunInput = {
  automationId: string;
  noticeDueAt: Date;
  scheduledSendAt: Date;
};

export type RunCommunicationAutomationNowInput = {
  automationId: string;
  now?: Date;
};

export type ExcludeAutomationRecipientInput = {
  recipientId: string;
  reason?: string | null;
};

export type AutomationRecipientReviewDecision =
  | "SEND"
  | "SKIP_BATCH"
  | "PERMANENTLY_EXCLUDE";

export type UpdateAutomationRecipientReviewDecisionInput = {
  decision: AutomationRecipientReviewDecision;
  recipientId: string;
};

export type CompleteAutomationRunReviewInput = {
  decisions: UpdateAutomationRecipientReviewDecisionInput[];
  runId: string;
};

export type CancelAutomationRunReviewInput = {
  runId: string;
};

export type CancelAutomationRunInput = {
  runId: string;
};

export type PrepareAutomationRunSendNowInput = {
  now?: Date;
  runId: string;
};

const ACTIVE_RUN_STATUSES = [
  "PENDING_NOTICE",
  "NOTICE_SENT",
  "READY_TO_SEND",
  "SENDING",
] as const;

type ReviewedAutomationRecipient =
  Prisma.CommunicationAutomationRecipientGetPayload<{
    include: {
      run: {
        include: {
          automation: {
            include: { reviewers: true };
          };
        };
      };
    };
  }>;

export async function runCommunicationAutomationNow(
  input: RunCommunicationAutomationNowInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const now = input.now ?? new Date();
  const automation = await client.communicationAutomation.findUnique({
    select: {
      scheduleCron: true,
    },
    where: { id: input.automationId },
  });

  if (!automation) {
    throw notFound("Communication automation was not found.");
  }

  const existingActiveRun = await client.communicationAutomationRun.findFirst({
    include: { recipients: true },
    orderBy: [{ scheduledSendAt: "desc" }, { id: "asc" }],
    where: {
      automationId: input.automationId,
      status: { in: [...ACTIVE_RUN_STATUSES] },
    },
  });

  if (existingActiveRun) {
    return existingActiveRun;
  }

  const scheduledSendAt = nextCommunicationCronDate(
    automation.scheduleCron,
    now,
  );

  return freezeCommunicationAutomationRun(
    {
      automationId: input.automationId,
      noticeDueAt: now,
      scheduledSendAt,
    },
    actor,
    client,
  );
}

export async function freezeCommunicationAutomationRun(
  input: FreezeCommunicationAutomationRunInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const existing = await client.communicationAutomationRun.findFirst({
    include: { recipients: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    where: {
      automationId: input.automationId,
      scheduledSendAt: input.scheduledSendAt,
      status: { in: [...ACTIVE_RUN_STATUSES] },
    },
  });

  if (existing) {
    return existing;
  }

  const automation = await client.communicationAutomation.findUnique({
    where: { id: input.automationId },
  });

  if (!automation) {
    throw notFound("Communication automation was not found.");
  }

  if (automation.pausedAt || automation.archivedAt) {
    throw badInput(
      "Paused or archived communication automations cannot create runs.",
    );
  }

  const audience = await resolveCommunicationAudienceMembers(
    {
      resource: automation.audienceResource,
      savedViewId: automation.savedListViewId,
    },
    actor,
    client,
  );

  const recipients = await Promise.all(
    audience.preview.map((member) =>
      buildFrozenRecipient(automation, member, client),
    ),
  ).then((items) =>
    items.filter(
      (
        recipient,
      ): recipient is Prisma.CommunicationAutomationRecipientCreateWithoutRunInput =>
        Boolean(recipient),
    ),
  );
  const counts = countRecipients(recipients);

  if (recipients.length === 0) {
    return null;
  }

  return client.communicationAutomationRun.create({
    data: {
      automationId: automation.id,
      deliverableCount: counts.deliverableCount,
      noticeDueAt: input.noticeDueAt,
      recipientCount: recipients.length,
      scheduledSendAt: input.scheduledSendAt,
      skippedCount: counts.skippedCount,
      status: "PENDING_NOTICE",
      recipients: {
        create: recipients,
      },
    },
    include: { recipients: true },
  });
}

export async function excludeAutomationRecipient(
  input: ExcludeAutomationRecipientInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const recipient = await client.communicationAutomationRecipient.findUnique({
    include: {
      run: {
        include: {
          automation: {
            include: { reviewers: true },
          },
        },
      },
    },
    where: { id: input.recipientId },
  });

  if (!recipient) {
    throw notFound("Automation recipient was not found.");
  }

  const reviewerIds = new Set(
    recipient.run.automation.reviewers.map(
      (reviewer) => reviewer.reviewerUserId,
    ),
  );
  const canOverrideReviewerList = true;

  if (!reviewerIds.has(actor.id) && !canOverrideReviewerList) {
    throw forbidden("Only selected reviewers can exclude recipients.");
  }

  if (recipient.status === "ACCEPTED" || recipient.status === "DELIVERED") {
    throw badInput("Accepted recipients cannot be excluded.");
  }

  const wasExcluded = recipient.status === "EXCLUDED";
  const wasReady = recipient.status === "READY";

  return client.$transaction(async (tx) => {
    const updated = await tx.communicationAutomationRecipient.update({
      data: {
        excludedAt: new Date(),
        excludedByUserId: actor.id,
        exclusionReason: normalizeOptionalText(input.reason),
        status: "EXCLUDED",
      },
      where: { id: input.recipientId },
    });

    if (!wasExcluded || wasReady) {
      await tx.communicationAutomationRun.update({
        data: {
          ...(wasReady ? { deliverableCount: { decrement: 1 } } : {}),
          ...(!wasExcluded ? { excludedCount: { increment: 1 } } : {}),
        },
        where: { id: recipient.runId },
      });
    }

    return updated;
  });
}

export async function updateAutomationRecipientReviewDecision(
  input: UpdateAutomationRecipientReviewDecisionInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const recipient = await client.communicationAutomationRecipient.findUnique({
    include: {
      run: {
        include: {
          automation: {
            include: { reviewers: true },
          },
        },
      },
    },
    where: { id: input.recipientId },
  });

  if (!recipient) {
    throw notFound("Automation recipient was not found.");
  }

  assertCanReviewRecipient(recipient.run.automation.reviewers, actor);

  if (recipient.status === "ACCEPTED" || recipient.status === "DELIVERED") {
    throw badInput("Accepted recipients cannot be changed.");
  }

  if (input.decision === "SEND") {
    return setRecipientSendDecision(recipient, actor, client);
  }

  if (input.decision === "PERMANENTLY_EXCLUDE") {
    return setRecipientPermanentExclusion(recipient, actor, client);
  }

  return setRecipientBatchExclusion(recipient, actor, client);
}

export async function completeAutomationRunReview(
  input: CompleteAutomationRunReviewInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const run = await client.communicationAutomationRun.findUnique({
    include: {
      automation: {
        include: { reviewers: true },
      },
      recipients: true,
    },
    where: { id: input.runId },
  });

  if (!run) {
    throw notFound("Communication automation run was not found.");
  }

  assertCanReviewRecipient(run.automation.reviewers, actor);

  if (run.status !== "PENDING_NOTICE" && run.status !== "NOTICE_SENT") {
    throw badInput("Only pending reviews can be completed.");
  }

  const runRecipientIds = new Set(
    run.recipients.map((recipient) => recipient.id),
  );

  for (const decision of input.decisions) {
    if (!runRecipientIds.has(decision.recipientId)) {
      throw badInput("Review decision does not belong to this run.");
    }

    await updateAutomationRecipientReviewDecision(decision, actor, client);
  }

  const [deliverableCount, excludedCount, skippedCount] = await Promise.all([
    client.communicationAutomationRecipient.count({
      where: { runId: run.id, status: "READY" },
    }),
    client.communicationAutomationRecipient.count({
      where: { runId: run.id, status: "EXCLUDED" },
    }),
    client.communicationAutomationRecipient.count({
      where: { runId: run.id, status: { in: ["SKIPPED", "SUPPRESSED"] } },
    }),
  ]);

  return client.communicationAutomationRun.update({
    data: {
      deliverableCount,
      excludedCount,
      skippedCount,
      status: "READY_TO_SEND",
    },
    where: { id: run.id },
  });
}

export async function cancelAutomationRunReview(
  input: CancelAutomationRunReviewInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const run = await client.communicationAutomationRun.findUnique({
    include: {
      automation: {
        include: { reviewers: true },
      },
    },
    where: { id: input.runId },
  });

  if (!run) {
    throw notFound("Communication automation run was not found.");
  }

  assertCanReviewRecipient(run.automation.reviewers, actor);

  if (run.status !== "PENDING_NOTICE" && run.status !== "NOTICE_SENT") {
    throw badInput("Only pending reviews can be rejected.");
  }

  return client.communicationAutomationRun.update({
    data: {
      completedAt: new Date(),
      status: "CANCELED",
    },
    where: { id: run.id },
  });
}

export async function cancelAutomationRun(
  input: CancelAutomationRunInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const run = await client.communicationAutomationRun.findUnique({
    include: {
      automation: {
        include: { reviewers: true },
      },
    },
    where: { id: input.runId },
  });

  if (!run) {
    throw notFound("Communication automation run was not found.");
  }

  assertCanReviewRecipient(run.automation.reviewers, actor);

  if (
    run.status !== "PENDING_NOTICE" &&
    run.status !== "NOTICE_SENT" &&
    run.status !== "READY_TO_SEND"
  ) {
    throw badInput("Only unsent scheduled runs can be canceled.");
  }

  return client.communicationAutomationRun.update({
    data: {
      completedAt: new Date(),
      status: "CANCELED",
    },
    where: { id: run.id },
  });
}

export async function prepareAutomationRunSendNow(
  input: PrepareAutomationRunSendNowInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
) {
  const now = input.now ?? new Date();

  const run = await client.communicationAutomationRun.findUnique({
    include: {
      automation: {
        include: { reviewers: true },
      },
    },
    where: { id: input.runId },
  });

  if (!run) {
    throw notFound("Communication automation run was not found.");
  }

  assertCanReviewRecipient(run.automation.reviewers, actor);

  if (run.status !== "READY_TO_SEND") {
    throw badInput("Only ready scheduled runs can be sent.");
  }

  return client.communicationAutomationRun.update({
    data: {
      scheduledSendAt: now,
    },
    where: { id: run.id },
  });
}

async function buildFrozenRecipient(
  automation: {
    id: string;
    cooldownDays: number | null;
    suppressionMode: "NEVER_RESEND" | "COOLDOWN" | "EVERY_RUN";
  },
  member: CommunicationAudienceMember,
  client: PrismaClient,
): Promise<Prisma.CommunicationAutomationRecipientCreateWithoutRunInput | null> {
  const identity = identityFromMember(member);
  const recipientKey = recipientKeyFor(identity);
  let status: CommunicationAutomationRecipientStatus = "READY";
  let skipReason: string | null = null;

  if (!member.contactReady || !member.email) {
    status = "SKIPPED";
    skipReason = member.contactState;
  } else if (
    await findPermanentExclusionSuppression(automation.id, identity, client)
  ) {
    return null;
  } else {
    const suppression = await findActiveSuppression(
      automation.id,
      identity,
      {
        cooldownDays: automation.cooldownDays,
        mode: automation.suppressionMode,
      },
      new Date(),
      client,
    );

    if (suppression) {
      return null;
    }
  }

  return {
    automation: { connect: { id: automation.id } },
    contactState: member.contactState,
    displayNameSnapshot: member.displayName,
    emailSnapshot: member.email,
    household: identity.householdRockId
      ? { connect: { rockId: identity.householdRockId } }
      : undefined,
    person: identity.personRockId
      ? { connect: { rockId: identity.personRockId } }
      : undefined,
    recipientKey,
    resource: identity.resource,
    skipReason,
    status,
  };
}

function assertCanReviewRecipient(
  reviewers: Array<{ reviewerUserId: string }>,
  actor: LocalAppUser,
) {
  const reviewerIds = new Set(
    reviewers.map((reviewer) => reviewer.reviewerUserId),
  );
  const canOverrideReviewerList = true;

  if (!reviewerIds.has(actor.id) && !canOverrideReviewerList) {
    throw forbidden("Only selected reviewers can change recipients.");
  }
}

async function setRecipientSendDecision(
  recipient: ReviewedAutomationRecipient,
  _actor: LocalAppUser,
  client: PrismaClient,
) {
  const wasExcluded = recipient.status === "EXCLUDED";
  const recipientKey = recipientKeyFor({
    householdRockId: recipient.householdRockId,
    personRockId: recipient.personRockId,
    resource: recipient.resource,
  });

  return client.$transaction(async (tx) => {
    if (recipient.status === "EXCLUDED" && recipient.excludedAt) {
      await tx.communicationAutomationSuppression.deleteMany({
        where: {
          acceptedAt: recipient.excludedAt,
          automationId: recipient.automationId,
          providerMessageId: null,
          recipientKey,
        },
      });
    }

    const updated = await tx.communicationAutomationRecipient.update({
      data: {
        excludedAt: null,
        excludedByUserId: null,
        exclusionReason: null,
        status: "READY",
      },
      where: { id: recipient.id },
    });

    if (wasExcluded) {
      await tx.communicationAutomationRun.update({
        data: {
          deliverableCount: { increment: 1 },
          excludedCount: { decrement: 1 },
        },
        where: { id: recipient.runId },
      });
    }

    return updated;
  });
}

async function setRecipientBatchExclusion(
  recipient: ReviewedAutomationRecipient,
  actor: LocalAppUser,
  client: PrismaClient,
) {
  return setRecipientExcluded(
    recipient,
    actor,
    "Excluded from this batch.",
    false,
    client,
  );
}

async function setRecipientPermanentExclusion(
  recipient: ReviewedAutomationRecipient,
  actor: LocalAppUser,
  client: PrismaClient,
) {
  return setRecipientExcluded(
    recipient,
    actor,
    "Permanently excluded from this workflow.",
    true,
    client,
  );
}

async function setRecipientExcluded(
  recipient: ReviewedAutomationRecipient,
  actor: LocalAppUser,
  reason: string,
  permanent: boolean,
  client: PrismaClient,
) {
  const now = new Date();
  const wasExcluded = recipient.status === "EXCLUDED";
  const recipientKey = recipientKeyFor({
    householdRockId: recipient.householdRockId,
    personRockId: recipient.personRockId,
    resource: recipient.resource,
  });

  return client.$transaction(async (tx) => {
    const updated = await tx.communicationAutomationRecipient.update({
      data: {
        excludedAt: now,
        excludedByUserId: actor.id,
        exclusionReason: reason,
        status: "EXCLUDED",
      },
      where: { id: recipient.id },
    });

    if (permanent) {
      await tx.communicationAutomationSuppression.upsert({
        create: {
          acceptedAt: now,
          automationId: recipient.automationId,
          eligibleAfter: null,
          householdRockId: recipient.householdRockId,
          personRockId: recipient.personRockId,
          providerMessageId: null,
          recipientKey,
          resource: recipient.resource,
        },
        update: {
          acceptedAt: now,
          eligibleAfter: null,
          providerMessageId: null,
        },
        where: {
          automationId_recipientKey: {
            automationId: recipient.automationId,
            recipientKey,
          },
        },
      });
    } else {
      if (recipient.status === "EXCLUDED" && recipient.excludedAt) {
        await tx.communicationAutomationSuppression.deleteMany({
          where: {
            acceptedAt: recipient.excludedAt,
            automationId: recipient.automationId,
            providerMessageId: null,
            recipientKey,
          },
        });
      }
    }

    if (!wasExcluded) {
      await tx.communicationAutomationRun.update({
        data: {
          deliverableCount: { decrement: 1 },
          excludedCount: { increment: 1 },
        },
        where: { id: recipient.runId },
      });
    }

    return updated;
  });
}

function identityFromMember(
  member: CommunicationAudienceMember,
): RecipientIdentity {
  if (member.resource === "PERSON") {
    return {
      personRockId: member.rockId,
      resource: "PERSON",
    };
  }

  return {
    householdRockId: member.rockId,
    resource: "HOUSEHOLD",
  };
}

function countRecipients(
  recipients: Prisma.CommunicationAutomationRecipientCreateWithoutRunInput[],
) {
  return recipients.reduce(
    (counts, recipient) => {
      if (recipient.status === "READY") {
        counts.deliverableCount += 1;
      }

      if (recipient.status === "SKIPPED" || recipient.status === "SUPPRESSED") {
        counts.skippedCount += 1;
      }

      return counts;
    },
    { deliverableCount: 0, skippedCount: 0 },
  );
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

function badInput(message: string) {
  return new GraphQLError(message, {
    extensions: { code: "BAD_USER_INPUT" },
  });
}

function forbidden(message: string) {
  return new GraphQLError(message, {
    extensions: { code: "FORBIDDEN" },
  });
}

function notFound(message: string) {
  return new GraphQLError(message, {
    extensions: { code: "NOT_FOUND" },
  });
}
