import type {
  CommunicationAutomationRecipientResource,
  CommunicationAutomationSuppressionMode,
  PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type SuppressionClient = Pick<
  PrismaClient,
  "communicationAutomationSuppression"
>;

export type RecipientIdentity = {
  householdRockId?: number | null;
  personRockId?: number | null;
  resource: CommunicationAutomationRecipientResource;
};

export type SuppressionPolicy = {
  cooldownDays?: number | null;
  mode: CommunicationAutomationSuppressionMode;
};

export function recipientKeyFor(identity: RecipientIdentity) {
  if (identity.resource === "PERSON") {
    if (!Number.isInteger(identity.personRockId) || !identity.personRockId) {
      throw new Error("Person automation recipients require a personRockId.");
    }

    return `PERSON:${identity.personRockId}`;
  }

  if (
    !Number.isInteger(identity.householdRockId) ||
    !identity.householdRockId
  ) {
    throw new Error(
      "Household automation recipients require a householdRockId.",
    );
  }

  return `HOUSEHOLD:${identity.householdRockId}`;
}

export async function findActiveSuppression(
  automationId: string,
  identity: RecipientIdentity,
  policy: SuppressionPolicy,
  now = new Date(),
  client: SuppressionClient = prisma,
) {
  const suppression =
    await client.communicationAutomationSuppression.findUnique({
      where: {
        automationId_recipientKey: {
          automationId,
          recipientKey: recipientKeyFor(identity),
        },
      },
    });

  if (!suppression) {
    return null;
  }

  if (policy.mode === "EVERY_RUN") {
    return null;
  }

  if (policy.mode === "NEVER_RESEND") {
    return suppression;
  }

  if (!suppression.eligibleAfter || suppression.eligibleAfter > now) {
    return suppression;
  }

  return null;
}

export async function findPermanentExclusionSuppression(
  automationId: string,
  identity: RecipientIdentity,
  client: SuppressionClient = prisma,
) {
  const suppression =
    await client.communicationAutomationSuppression.findUnique({
      where: {
        automationId_recipientKey: {
          automationId,
          recipientKey: recipientKeyFor(identity),
        },
      },
    });

  if (!suppression) {
    return null;
  }

  return suppression.providerMessageId === null &&
    suppression.eligibleAfter === null
    ? suppression
    : null;
}

export function eligibleAfterFor(acceptedAt: Date, policy: SuppressionPolicy) {
  if (policy.mode !== "COOLDOWN") {
    return null;
  }

  const cooldownDays = policy.cooldownDays ?? 0;

  if (!Number.isInteger(cooldownDays) || cooldownDays < 1) {
    throw new Error("Repeat delay requires a positive day count.");
  }

  return new Date(acceptedAt.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
}
