import { describe, expect, it } from "vitest";

import { assertReadEndpoint } from "@/lib/rock/client";
import { redactForLog, redactText } from "@/lib/sync/redaction";

describe("sync reconciliation and Rock safety", () => {
  it("allows only documented read API paths", () => {
    expect(() => assertReadEndpoint("/api/People/8597")).not.toThrow();
    expect(() =>
      assertReadEndpoint("/api/FinancialTransactions?$top=1"),
    ).not.toThrow();
    expect(() => assertReadEndpoint("/api/WorkflowTypes")).toThrow(
      "not in the read allowlist",
    );
    expect(() => assertReadEndpoint("/Webhooks/thing")).toThrow(
      "only supports API paths",
    );
  });

  it("redacts tokens and sensitive payload keys", () => {
    expect(redactText("Authorization-Token=abc123")).toBe("[REDACTED]");
    expect(
      redactForLog({
        nested: {
          cardNumber: "4242424242424242",
          ok: "visible",
        },
      }),
    ).toEqual({
      nested: {
        cardNumber: "[REDACTED]",
        ok: "visible",
      },
    });
  });
});
