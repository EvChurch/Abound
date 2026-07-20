import { describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/webhooks/resend/route";
import { recordResendWebhookEvent } from "@/lib/communications/resend-sender";

describe("Resend webhook event recording", () => {
  it("updates recipient state from signed Resend email events", async () => {
    const transaction = vi.fn(async () => undefined);
    const client = {
      $transaction: transaction,
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          acceptedAt: null,
          automationId: "automation_1",
          deliveredAt: null,
          failedAt: null,
          id: "recipient_1",
          runId: "run_1",
        })),
        update: vi.fn((args) => args),
      },
      communicationAutomationRecipientEvent: {
        upsert: vi.fn((args) => args),
      },
    };

    await expect(
      recordResendWebhookEvent(
        {
          created_at: "2026-07-07T09:01:00.000Z",
          data: {
            created_at: "2026-07-07T09:01:00.000Z",
            email_id: "email_123",
            from: "hello@example.org",
            subject: "Hello",
            to: ["jane@example.com"],
          },
          type: "email.sent",
        },
        client as never,
      ),
    ).resolves.toEqual({ status: "RECORDED" });

    expect(transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          data: expect.objectContaining({
            status: "ACCEPTED",
          }),
        }),
        expect.objectContaining({
          create: expect.objectContaining({
            eventType: "PROVIDER_ACCEPTED",
            providerMessageId: "email_123",
          }),
        }),
      ]),
    );
  });

  it("ignores non-email automation events", async () => {
    await expect(
      recordResendWebhookEvent(
        {
          created_at: "2026-07-07T09:01:00.000Z",
          data: {
            audience_id: "audience_1",
            created_at: "2026-07-07T09:01:00.000Z",
            email: "jane@example.com",
            id: "contact_1",
            segment_ids: [],
            unsubscribed: false,
            updated_at: "2026-07-07T09:01:00.000Z",
          },
          type: "contact.created",
        },
        {} as never,
      ),
    ).resolves.toEqual({ status: "IGNORED" });
  });

  it("records open events without changing recipient status", async () => {
    const transaction = vi.fn(async () => undefined);
    const client = {
      $transaction: transaction,
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => ({
          acceptedAt: new Date("2026-07-07T09:01:00.000Z"),
          automationId: "automation_1",
          deliveredAt: new Date("2026-07-07T09:02:00.000Z"),
          failedAt: null,
          id: "recipient_1",
          runId: "run_1",
        })),
        update: vi.fn((args) => args),
      },
      communicationAutomationRecipientEvent: {
        upsert: vi.fn((args) => args),
      },
    };

    await expect(
      recordResendWebhookEvent(
        {
          created_at: "2026-07-07T09:03:00.000Z",
          data: {
            created_at: "2026-07-07T09:03:00.000Z",
            email_id: "email_123",
            from: "exec@ev.church",
            subject: "Hello",
            to: ["jane@example.com"],
          },
          type: "email.opened",
        },
        client as never,
      ),
    ).resolves.toEqual({ status: "RECORDED" });

    expect(
      client.communicationAutomationRecipient.update,
    ).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledWith([
      expect.objectContaining({
        create: expect.objectContaining({
          eventType: "OPENED",
          providerMessageId: "email_123",
        }),
      }),
    ]);
  });

  it("returns unknown recipient for provider ids that are not local", async () => {
    const client = {
      communicationAutomationRecipient: {
        findUnique: vi.fn(async () => null),
      },
    };

    await expect(
      recordResendWebhookEvent(
        {
          created_at: "2026-07-07T09:01:00.000Z",
          data: {
            created_at: "2026-07-07T09:01:00.000Z",
            email_id: "email_unknown",
            from: "hello@example.org",
            subject: "Hello",
            to: ["jane@example.com"],
          },
          type: "email.delivered",
        },
        client as never,
      ),
    ).resolves.toEqual({ status: "UNKNOWN_RECIPIENT" });
  });
});

describe("Resend webhook route", () => {
  it("rejects missing signature headers", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/resend", {
        body: "{}",
        method: "POST",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects invalid signatures or missing webhook configuration", async () => {
    const response = await POST(
      new Request("http://localhost/api/webhooks/resend", {
        body: "{}",
        headers: {
          "svix-id": "msg_1",
          "svix-signature": "sig",
          "svix-timestamp": "123",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
  });
});
