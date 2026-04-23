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

  it("classifies dropped giving after the at-risk window", () => {
    const result = classifyGivingLifecycle(
      [
        fact("2025-01-15"),
        fact("2025-03-15"),
        fact("2025-05-15"),
        fact("2025-10-15"),
      ],
      {
        referenceDate,
      },
    );

    expect(result.kind).toBe("DROPPED");
    expect(result.summary).toBe(
      "Previously at-risk giving now appears dropped.",
    );
  });

  it("does not keep long-stale giving history in the dropped lifecycle", () => {
    const result = classifyGivingLifecycle(
      [
        fact("2024-07-15"),
        fact("2024-08-15"),
        fact("2024-09-15"),
        fact("2024-10-15"),
      ],
      {
        referenceDate,
      },
    );

    expect(result.kind).toBeNull();
  });

  it("does not classify one-off giving in the drop window as dropped", () => {
    const result = classifyGivingLifecycle([fact("2025-09-15")], {
      referenceDate,
    });

    expect(result.kind).toBeNull();
  });

  it("classifies recently interrupted giving as at-risk before it is confirmed dropped", () => {
    const result = classifyGivingLifecycle(
      [
        fact("2025-08-15"),
        fact("2025-09-15"),
        fact("2025-10-15"),
        fact("2025-11-15"),
        fact("2025-12-15"),
        fact("2026-01-15"),
      ],
      {
        referenceDate,
      },
    );

    expect(result.kind).toBe("AT_RISK");
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

  it("does not classify steady baseline giving as at-risk because of prior one-off spikes", () => {
    const result = classifyGivingLifecycle(
      [
        fact("2025-09-17", { amount: "800.00" }),
        fact("2025-10-17", { amount: "800.00" }),
        fact("2025-11-17", { amount: "800.00" }),
        fact("2025-11-27", { amount: "1000.00" }),
        fact("2025-12-17", { amount: "800.00" }),
        fact("2025-12-29", { amount: "2000.00" }),
        fact("2026-01-17", { amount: "835.00" }),
        fact("2026-02-17", { amount: "800.00" }),
        fact("2026-03-17", { amount: "900.00" }),
        fact("2026-04-17", { amount: "900.00" }),
      ],
      {
        referenceDate,
      },
    );

    expect(result).toMatchObject({
      financeDetail: expect.objectContaining({
        currentWindowTotal: "2600.00",
        priorWindowTotal: "5435.00",
      }),
      kind: null,
    });
  });

  it("uses an active pledge as the accepted baseline for adjusted giving", () => {
    const adjustedGivingFacts = [
      fact("2025-03-15", { amount: "500.00" }),
      fact("2025-04-15", { amount: "500.00" }),
      fact("2025-05-15", { amount: "500.00" }),
      fact("2025-06-15", { amount: "500.00" }),
      fact("2025-07-15", { amount: "500.00" }),
      fact("2025-08-15", { amount: "500.00" }),
      fact("2025-09-15", { amount: "500.00" }),
      fact("2025-10-15", { amount: "500.00" }),
      fact("2025-11-15", { amount: "500.00" }),
      fact("2025-12-15", { amount: "500.00" }),
      fact("2026-01-15", { amount: "300.00" }),
      fact("2026-02-15", { amount: "300.00" }),
      fact("2026-03-15", { amount: "300.00" }),
    ];

    expect(
      classifyGivingLifecycle(adjustedGivingFacts, {
        referenceDate,
      }).kind,
    ).toBe("AT_RISK");

    expect(
      classifyGivingLifecycle(adjustedGivingFacts, {
        activePledges: [{ amount: "300.00", period: "MONTHLY" }],
        referenceDate,
      }),
    ).toMatchObject({
      financeDetail: expect.objectContaining({
        currentWindowTotal: "600.00",
        priorWindowTotal: "1300.00",
      }),
      kind: null,
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
