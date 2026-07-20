import { describe, expect, it, vi } from "vitest";

import { recordAcceptedAutomationRecipient } from "@/lib/communications/email-sender";
import { MailDevEmailSender } from "@/lib/communications/maildev-sender";
import { ResendEmailSender } from "@/lib/communications/resend-sender";

describe("communication email senders", () => {
  const payload = {
    automationId: "automation_1",
    from: "Church Team <hello@example.org>",
    html: "<p>Hello</p>",
    recipientEmail: "jane@example.com",
    recipientId: "recipient_1",
    replyTo: "reply@example.org",
    runId: "run_1",
    subject: "Hello",
    tags: {
      automationId: "automation_1",
      recipientId: "recipient_1",
      runId: "run_1",
      templateKey: "joining-never-given",
    },
    text: "Hello",
  };

  it("fails closed when live Resend sending is not enabled", async () => {
    const resend = {
      emails: {
        send: vi.fn(),
      },
    };
    const sender = new ResendEmailSender(
      {
        apiKey: "resend_key",
        fromEmail: "hello@example.org",
        liveEnabled: false,
        preferenceOwnerVerified: true,
      },
      resend as never,
    );

    await expect(sender.send(payload)).resolves.toMatchObject({
      status: "FAILED",
    });
    expect(resend.emails.send).not.toHaveBeenCalled();
  });

  it("sends through Resend when production gates are enabled", async () => {
    const resend = {
      emails: {
        send: vi.fn(async () => ({
          data: { id: "email_123" },
          error: null,
          headers: null,
        })),
      },
    };
    const sender = new ResendEmailSender(
      {
        apiKey: "resend_key",
        fromEmail: "hello@example.org",
        liveEnabled: true,
        preferenceOwnerVerified: true,
        replyToEmail: "reply@example.org",
      },
      resend as never,
    );

    await expect(sender.send(payload)).resolves.toEqual({
      providerMessageId: "email_123",
      status: "ACCEPTED",
    });
    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: "<p>Hello</p>",
        subject: "Hello",
        to: "jane@example.com",
      }),
      { idempotencyKey: "recipient_1" },
    );
  });

  it("sends through MailDev SMTP for local development", async () => {
    const transport = {
      sendMail: vi.fn(async () => ({ messageId: "maildev_123" })),
    };
    const sender = new MailDevEmailSender(
      {
        fromEmail: "exec@ev.church",
        fromName: "Exec Team",
      },
      transport as never,
    );

    await expect(sender.send({ ...payload, from: "" })).resolves.toEqual({
      providerMessageId: "maildev_123",
      status: "ACCEPTED",
    });
    expect(transport.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Exec Team <exec@ev.church>",
        html: "<p>Hello</p>",
        subject: "Hello",
        to: "jane@example.com",
      }),
    );
  });

  it("records accepted recipients and creates suppression", async () => {
    const transaction = vi.fn(async () => undefined);
    const client = {
      $transaction: transaction,
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          automation: {
            cooldownDays: null,
            suppressionMode: "NEVER_RESEND",
          },
          automationId: "automation_1",
          householdRockId: null,
          id: "recipient_1",
          personRockId: 101,
          resource: "PERSON",
          runId: "run_1",
        })),
        update: vi.fn((args) => args),
      },
      communicationAutomationRecipientEvent: {
        create: vi.fn((args) => args),
      },
      communicationAutomationSuppression: {
        upsert: vi.fn((args) => args),
      },
    };

    await recordAcceptedAutomationRecipient(
      {
        acceptedAt: new Date("2026-07-07T09:00:00.000Z"),
        providerMessageId: "email_123",
        recipientId: "recipient_1",
      },
      client as never,
    );

    expect(transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            providerMessageId: "email_123",
            status: "ACCEPTED",
          }),
        }),
        expect.objectContaining({
          create: expect.objectContaining({
            automationId: "automation_1",
            recipientKey: "PERSON:101",
          }),
        }),
      ]),
    );
  });
});
