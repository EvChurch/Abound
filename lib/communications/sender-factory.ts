import type { EmailSender } from "@/lib/communications/email-sender";
import { MailDevEmailSender } from "@/lib/communications/maildev-sender";
import { ResendEmailSender } from "@/lib/communications/resend-sender";

export function createCommunicationEmailSender(): EmailSender {
  if (process.env.COMMUNICATION_EMAIL_SENDER === "maildev") {
    return new MailDevEmailSender();
  }

  return new ResendEmailSender();
}
