import { describe, expect, it } from "vitest";

import { requestAccess } from "@/lib/auth/access-requests";
import type { AccessRequestInput, AccessRequestRecord } from "@/lib/auth/types";

describe("requestAccess", () => {
  it("persists a normalized pending request", async () => {
    const calls: AccessRequestInput[] = [];

    const record = await requestAccess(
      {
        auth0Subject: " auth0|123 ",
        email: " user@example.com ",
        name: " Test User ",
      },
      {
        async createPending(input) {
          calls.push(input);
          return {
            id: "request_1",
            auth0Subject: input.auth0Subject,
            email: input.email ?? null,
            name: input.name ?? null,
            status: "PENDING",
            createdAt: new Date("2026-04-17T00:00:00.000Z"),
            updatedAt: new Date("2026-04-17T00:00:00.000Z"),
          } satisfies AccessRequestRecord;
        },
        async findByAuth0Subject() {
          return null;
        },
        async updatePendingContact() {
          throw new Error("should not update");
        },
      },
    );

    expect(calls).toEqual([
      {
        auth0Subject: "auth0|123",
        email: "user@example.com",
        name: "Test User",
      },
    ]);
    expect(record.status).toBe("PENDING");
  });

  it("rejects requests without an Auth0 subject", async () => {
    await expect(
      requestAccess(
        { auth0Subject: " " },
        {
          async createPending() {
            throw new Error("should not persist");
          },
          async findByAuth0Subject() {
            throw new Error("should not query");
          },
          async updatePendingContact() {
            throw new Error("should not update");
          },
        },
      ),
    ).rejects.toThrow("Auth0 subject is required");
  });

  it("updates contact details for existing pending requests", async () => {
    const updates: AccessRequestInput[] = [];

    await requestAccess(
      {
        auth0Subject: "auth0|pending",
        email: "new@example.com",
        name: "New Name",
      },
      {
        async createPending() {
          throw new Error("should not create");
        },
        async findByAuth0Subject() {
          return {
            id: "request_1",
            auth0Subject: "auth0|pending",
            email: "old@example.com",
            name: "Old Name",
            status: "PENDING",
            createdAt: new Date("2026-04-17T00:00:00.000Z"),
            updatedAt: new Date("2026-04-17T00:00:00.000Z"),
          };
        },
        async updatePendingContact(input) {
          updates.push(input);
          return {
            id: "request_1",
            auth0Subject: input.auth0Subject,
            email: input.email ?? null,
            name: input.name ?? null,
            status: "PENDING",
            createdAt: new Date("2026-04-17T00:00:00.000Z"),
            updatedAt: new Date("2026-04-17T00:00:00.000Z"),
          };
        },
      },
    );

    expect(updates).toEqual([
      {
        auth0Subject: "auth0|pending",
        email: "new@example.com",
        name: "New Name",
      },
    ]);
  });

  it("preserves terminal access request statuses on resubmission", async () => {
    const deniedRequest: AccessRequestRecord = {
      id: "request_1",
      auth0Subject: "auth0|denied",
      email: "denied@example.com",
      name: "Denied User",
      status: "DENIED",
      createdAt: new Date("2026-04-17T00:00:00.000Z"),
      updatedAt: new Date("2026-04-17T00:00:00.000Z"),
    };

    await expect(
      requestAccess(
        {
          auth0Subject: "auth0|denied",
          email: "changed@example.com",
          name: "Changed Name",
        },
        {
          async createPending() {
            throw new Error("should not create");
          },
          async findByAuth0Subject() {
            return deniedRequest;
          },
          async updatePendingContact() {
            throw new Error("should not update terminal requests");
          },
        },
      ),
    ).resolves.toBe(deniedRequest);
  });
});
