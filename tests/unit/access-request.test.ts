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
        async upsertPending(input) {
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
          async upsertPending() {
            throw new Error("should not persist");
          },
        },
      ),
    ).rejects.toThrow("Auth0 subject is required");
  });
});
