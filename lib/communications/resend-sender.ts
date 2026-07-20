import { Resend, type WebhookEventPayload } from "resend";
import type { Prisma, PrismaClient } from "@prisma/client";

import type {
  EmailSender,
  EmailSenderPayload,
  EmailSenderResult,
} from "@/lib/communications/email-sender";
import { prisma } from "@/lib/db/prisma";

export type ResendSenderConfig = {
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
};

const DEFAULT_RESEND_FROM_EMAIL = "info@ev.church";
const DEFAULT_RESEND_FROM_NAME = "Ev Church";
const DEFAULT_RESEND_REPLY_TO_EMAIL = "info@ev.church";

const EVENT_STATUS = {
  "email.bounced": "BOUNCED",
  "email.clicked": null,
  "email.complained": "COMPLAINED",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "DELAYED",
  "email.failed": "FAILED",
  "email.opened": null,
  "email.received": null,
  "email.scheduled": null,
  "email.sent": "ACCEPTED",
  "email.suppressed": "SUPPRESSED",
} as const;

const EVENT_TYPE = {
  "email.bounced": "BOUNCED",
  "email.clicked": "CLICKED",
  "email.complained": "COMPLAINED",
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "DELAYED",
  "email.failed": "FAILED",
  "email.opened": "OPENED",
  "email.received": "RECEIVED",
  "email.scheduled": "SCHEDULED",
  "email.sent": "PROVIDER_ACCEPTED",
  "email.suppressed": "SUPPRESSED",
} as const;

export class ResendEmailSender implements EmailSender {
  private readonly config: Required<ResendSenderConfig>;
  private readonly resend: Pick<Resend, "emails">;

  constructor(
    config: ResendSenderConfig = resendConfigFromEnv(),
    resend: Pick<Resend, "emails"> = new Resend(config.apiKey),
  ) {
    this.config = normalizeResendConfig(config);
    this.resend = resend;
  }

  async send(payload: EmailSenderPayload): Promise<EmailSenderResult> {
    const response = await this.resend.emails.send(
      {
        from: payload.from || formatSender(this.config),
        html: payload.html,
        replyTo: payload.replyTo || this.config.replyToEmail,
        subject: payload.subject,
        tags: safeTags(payload.tags),
        text: payload.text,
        to: payload.recipientEmail,
      },
      {
        idempotencyKey: payload.recipientId,
      },
    );

    if (response.error) {
      return {
        errorMessage: response.error.message,
        status: "FAILED",
      };
    }

    return {
      providerMessageId: response.data.id,
      status: "ACCEPTED",
    };
  }
}

export function resendConfigFromEnv(): ResendSenderConfig {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromName: process.env.RESEND_FROM_NAME,
    replyToEmail: process.env.RESEND_REPLY_TO_EMAIL,
  };
}

export function verifyResendWebhook(
  payload: string,
  headers: {
    id: string;
    signature: string;
    timestamp: string;
  },
  webhookSecret = process.env.RESEND_WEBHOOK_SECRET,
  resend = new Resend(process.env.RESEND_API_KEY),
) {
  if (!webhookSecret) {
    throw new Error("RESEND_WEBHOOK_SECRET is required.");
  }

  return resend.webhooks.verify({
    headers,
    payload,
    webhookSecret,
  });
}

export async function recordResendWebhookEvent(
  event: WebhookEventPayload,
  client: PrismaClient = prisma,
) {
  if (!isAutomationEmailEvent(event)) {
    return { status: "IGNORED" as const };
  }

  const recipient = await client.communicationAutomationRecipient.findUnique({
    where: { providerMessageId: event.data.email_id },
  });

  if (!recipient) {
    return { status: "UNKNOWN_RECIPIENT" as const };
  }

  const status = EVENT_STATUS[event.type];
  const eventType = EVENT_TYPE[event.type];
  const occurredAt = new Date(event.created_at);

  await client.$transaction([
    ...(status
      ? [
          client.communicationAutomationRecipient.update({
            data: {
              acceptedAt:
                status === "ACCEPTED" ? occurredAt : recipient.acceptedAt,
              deliveredAt:
                status === "DELIVERED" ? occurredAt : recipient.deliveredAt,
              failedAt:
                status === "FAILED" ||
                status === "BOUNCED" ||
                status === "COMPLAINED"
                  ? occurredAt
                  : recipient.failedAt,
              status,
            },
            where: { id: recipient.id },
          }),
        ]
      : []),
    client.communicationAutomationRecipientEvent.upsert({
      create: {
        automationId: recipient.automationId,
        eventType,
        metadata: eventMetadata(event),
        providerEventId: providerEventId(event),
        providerMessageId: event.data.email_id,
        recipientId: recipient.id,
        runId: recipient.runId,
        summary: `Resend ${event.type} event.`,
      },
      update: {
        metadata: eventMetadata(event),
        occurredAt,
        summary: `Resend ${event.type} event.`,
      },
      where: {
        providerEventId: providerEventId(event),
      },
    }),
  ]);

  return { status: "RECORDED" as const };
}

function normalizeResendConfig(config: ResendSenderConfig) {
  if (!config.apiKey) {
    throw new Error("RESEND_API_KEY is required for Resend sender setup.");
  }

  return {
    apiKey: config.apiKey,
    fromEmail: config.fromEmail || DEFAULT_RESEND_FROM_EMAIL,
    fromName: config.fromName || DEFAULT_RESEND_FROM_NAME,
    replyToEmail: config.replyToEmail || DEFAULT_RESEND_REPLY_TO_EMAIL,
  };
}

function formatSender(config: Required<ResendSenderConfig>) {
  return `${config.fromName} <${config.fromEmail}>`;
}

function safeTags(tags: Record<string, string> | undefined) {
  return Object.entries(tags ?? {}).map(([name, value]) => ({
    name,
    value,
  }));
}

function isAutomationEmailEvent(
  event: WebhookEventPayload,
): event is WebhookEventPayload & {
  type: keyof typeof EVENT_STATUS;
  data: { email_id: string };
} {
  return event.type in EVENT_STATUS && "email_id" in event.data;
}

function providerEventId(event: WebhookEventPayload) {
  return `${event.type}:${event.created_at}:${"email_id" in event.data ? event.data.email_id : "unknown"}`;
}

function eventMetadata(event: WebhookEventPayload): Prisma.InputJsonObject {
  const data = event.data as unknown as Record<string, unknown>;
  const click = isRecord(data.click) ? data.click : null;

  return {
    broadcastId: stringOrNull(data.broadcast_id),
    click: click
      ? {
          link: stringOrNull(click.link),
          timestamp: stringOrNull(click.timestamp),
        }
      : null,
    messageId: stringOrNull(data.message_id),
    providerCreatedAt: stringOrNull(data.created_at),
    tags: stringRecordOrNull(data.tags),
    templateId: stringOrNull(data.template_id),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}

function stringRecordOrNull(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}
