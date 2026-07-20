import nodemailer from "nodemailer";

import type {
  EmailSender,
  EmailSenderPayload,
  EmailSenderResult,
} from "@/lib/communications/email-sender";

export type MailDevSenderConfig = {
  fromEmail?: string;
  fromName?: string;
  host?: string;
  port?: number;
};

export class MailDevEmailSender implements EmailSender {
  private readonly config: Required<MailDevSenderConfig>;
  private readonly transport: Pick<
    ReturnType<typeof nodemailer.createTransport>,
    "sendMail"
  >;

  constructor(
    config: MailDevSenderConfig = mailDevConfigFromEnv(),
    transport = nodemailer.createTransport({
      host: config.host ?? "127.0.0.1",
      port: config.port ?? 1025,
      secure: false,
    }),
  ) {
    this.config = normalizeMailDevConfig(config);
    this.transport = transport;
  }

  async send(payload: EmailSenderPayload): Promise<EmailSenderResult> {
    try {
      const response = await this.transport.sendMail({
        from: payload.from || formatSender(this.config),
        html: payload.html,
        replyTo: payload.replyTo ?? undefined,
        subject: payload.subject,
        text: payload.text,
        to: payload.recipientEmail,
      });

      return {
        providerMessageId: String(response.messageId ?? payload.recipientId),
        status: "ACCEPTED",
      };
    } catch (error) {
      return {
        errorMessage:
          error instanceof Error ? error.message : "MailDev send failed.",
        status: "FAILED",
      };
    }
  }
}

export function mailDevConfigFromEnv(): MailDevSenderConfig {
  return {
    fromEmail: process.env.MAILDEV_FROM_EMAIL,
    fromName: process.env.MAILDEV_FROM_NAME,
    host: process.env.MAILDEV_SMTP_HOST,
    port: process.env.MAILDEV_SMTP_PORT
      ? Number(process.env.MAILDEV_SMTP_PORT)
      : undefined,
  };
}

function normalizeMailDevConfig(config: MailDevSenderConfig) {
  return {
    fromEmail: config.fromEmail ?? "info@ev.church",
    fromName: config.fromName ?? "Ev Church",
    host: config.host ?? "127.0.0.1",
    port: config.port ?? 1025,
  };
}

function formatSender(config: Required<MailDevSenderConfig>) {
  return `${config.fromName} <${config.fromEmail}>`;
}
