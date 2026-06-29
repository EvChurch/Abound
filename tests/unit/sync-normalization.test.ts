import { describe, expect, it } from "vitest";

import { normalizeRockText } from "@/lib/sync/run-sync";

describe("sync normalization", () => {
  it("normalizes blank Rock text fields to null", () => {
    expect(normalizeRockText("")).toBeNull();
    expect(normalizeRockText("   ")).toBeNull();
    expect(normalizeRockText(null)).toBeNull();
    expect(normalizeRockText(undefined)).toBeNull();
    expect(normalizeRockText(" Amy ")).toBe("Amy");
  });
});
