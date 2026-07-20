import type { PrismaClient } from "@prisma/client";

import {
  eligibleAfterFor,
  recipientKeyFor,
} from "@/lib/communications/suppression";
import { prisma } from "@/lib/db/prisma";

export type EmailSenderPayload = {
  automationId: string;
  from: string;
  html: string;
  recipientEmail: string;
  recipientId: string;
  replyTo?: string | null;
  runId: string;
  subject: string;
  tags?: Record<string, string>;
  text: string;
};

export type EmailSenderResult =
  | {
      providerMessageId: string;
      status: "ACCEPTED";
    }
  | {
      errorMessage: string;
      status: "FAILED";
    };

export type EmailSender = {
  send(payload: EmailSenderPayload): Promise<EmailSenderResult>;
};

export async function recordAcceptedAutomationRecipient(
  input: {
    acceptedAt?: Date;
    providerMessageId: string;
    recipientId: string;
  },
  client: PrismaClient = prisma,
) {
  const acceptedAt = input.acceptedAt ?? new Date();
  const recipient = await client.communicationAutomationRecipient.findUnique({
    include: {
      automation: true,
    },
    where: { id: input.recipientId },
  });

  if (!recipient) {
    throw new Error("Automation recipient was not found.");
  }

  const resourceIdentity = {
    householdRockId: recipient.householdRockId,
    personRockId: recipient.personRockId,
    resource: recipient.resource,
  };
  const recipientKey = recipientKeyFor(resourceIdentity);

  await client.$transaction([
    client.communicationAutomationRecipient.update({
      data: {
        acceptedAt,
        providerMessageId: input.providerMessageId,
        status: "ACCEPTED",
      },
      where: { id: recipient.id },
    }),
    client.communicationAutomationSuppression.upsert({
      create: {
        acceptedAt,
        automationId: recipient.automationId,
        eligibleAfter: eligibleAfterFor(acceptedAt, {
          cooldownDays: recipient.automation.cooldownDays,
          mode: recipient.automation.suppressionMode,
        }),
        householdRockId: recipient.householdRockId,
        personRockId: recipient.personRockId,
        providerMessageId: input.providerMessageId,
        recipientKey,
        resource: recipient.resource,
      },
      update: {
        acceptedAt,
        eligibleAfter: eligibleAfterFor(acceptedAt, {
          cooldownDays: recipient.automation.cooldownDays,
          mode: recipient.automation.suppressionMode,
        }),
        providerMessageId: input.providerMessageId,
      },
      where: {
        automationId_recipientKey: {
          automationId: recipient.automationId,
          recipientKey,
        },
      },
    }),
    client.communicationAutomationRecipientEvent.create({
      data: {
        automationId: recipient.automationId,
        eventType: "PROVIDER_ACCEPTED",
        providerMessageId: input.providerMessageId,
        recipientId: recipient.id,
        runId: recipient.runId,
        summary: "Email accepted by provider.",
      },
    }),
  ]);
}
