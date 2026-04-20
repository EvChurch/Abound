import { describe, expect, it } from "vitest";

import {
  classifyGivingLifecycle,
  lifecycleExplanationForRole,
  type GivingLifecycleFact,
} from "@/lib/giving/lifecycle";

const referenceDate = new Date("2026-04-20T00:00:00.000Z");

function fact(
  date: string,
  {
    amount = "100.00",
    reliabilityKind = "ONE_OFF",
  }: {
    amount?: string;
    reliabilityKind?: GivingLifecycleFact["reliabilityKind"];
  } = {},
): GivingLifecycleFact {
  return {
    amount,
    effectiveMonth: new Date(`${date.slice(0, 7)}-01T00:00:00.000Z`),
    occurredAt: new Date(`${date}T00:00:00.000Z`),
    reliabilityKind,
  };
}

describe("giving lifecycle", () => {
  it("classifies new giving when first activity is in the current window", () => {
    const result = classifyGivingLifecycle([fact("2026-03-15")], {
      referenceDate,
    });

    expect(result).toMatchObject({
      financeDetail: expect.objectContaining({
        currentWindowTotal: "100.00",
        priorWindowTotal: "0.00",
      }),
      kind: "NEW",
      summary: "First giving activity appears in the current window.",
    });
  });

  it("classifies reactivated giving after a dormant period", () => {
    const result = classifyGivingLifecycle(
      [fact("2025-03-15"), fact("2026-03-15")],
      {
        referenceDate,
      },
    );

    expect(result.kind).toBe("REACTIVATED");
  });

  it("classifies dropped giving beyond the drop window", () => {
    const result = classifyGivingLifecycle(
      [fact("2025-01-15"), fact("2025-09-15")],
      {
        referenceDate,
      },
    );

    expect(result.kind).toBe("DROPPED");
  });

  it("classifies at-risk giving when recurring activity is materially reduced", () => {
    const result = classifyGivingLifecycle(
      [
        fact("2025-11-15", { amount: "250.00" }),
        fact("2025-12-15", { amount: "250.00" }),
        fact("2026-01-15", { amount: "250.00" }),
        fact("2026-03-15", {
          amount: "50.00",
          reliabilityKind: "SCHEDULED_RECURRING",
        }),
      ],
      {
        referenceDate,
      },
    );

    expect(result).toMatchObject({
      financeDetail: expect.objectContaining({
        currentWindowTotal: "50.00",
        priorWindowTotal: "750.00",
      }),
      kind: "AT_RISK",
    });
  });

  it("returns no lifecycle for records without giving facts", () => {
    expect(
      classifyGivingLifecycle([], {
        referenceDate,
      }),
    ).toEqual({
      financeDetail: null,
      kind: null,
      summary: null,
    });
  });

  it("keeps pastoral explanations free of amount details", () => {
    const result = classifyGivingLifecycle(
      [
        fact("2025-11-15", { amount: "250.00" }),
        fact("2025-12-15", { amount: "250.00" }),
        fact("2026-01-15", { amount: "250.00" }),
        fact("2026-03-15", {
          amount: "50.00",
          reliabilityKind: "SCHEDULED_RECURRING",
        }),
      ],
      {
        referenceDate,
      },
    );

    expect(lifecycleExplanationForRole(result, "FINANCE")).toContain("50.00");
    expect(lifecycleExplanationForRole(result, "PASTORAL_CARE")).toBe(
      "Previously consistent giving appears interrupted or reduced.",
    );
    expect(lifecycleExplanationForRole(result, "PASTORAL_CARE")).not.toMatch(
      /\d+\.\d{2}/,
    );
  });
});
