import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  getSession: vi.fn(),
  quickCreateGivingPledge: vi.fn(),
  redirect: vi.fn(),
  rejectGivingPledgeRecommendation: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: mocks.getSession,
  },
}));

vi.mock("@/lib/auth/access-control", () => ({
  getCurrentAccessState: vi.fn(async () => mocks.accessState),
}));

vi.mock("@/lib/giving/pledges", () => ({
  quickCreateGivingPledge: mocks.quickCreateGivingPledge,
  rejectGivingPledgeRecommendation: mocks.rejectGivingPledgeRecommendation,
}));

import {
  acceptPledgeRecommendationAction,
  denyPledgeRecommendationAction,
} from "@/app/tools/pledge-recommendations/actions";

describe("tools pledge recommendation actions", () => {
  beforeEach(() => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|finance",
        email: "finance@example.com",
        id: "user_1",
        name: "Finance",
        rockPersonId: null,
        role: "FINANCE",
      },
    };
    mocks.getSession.mockResolvedValue(null);
    mocks.quickCreateGivingPledge.mockResolvedValue(undefined);
    mocks.rejectGivingPledgeRecommendation.mockResolvedValue(undefined);
    mocks.revalidatePath.mockReset();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("accepts a recommendation and revalidates the queue without redirecting", async () => {
    const formData = new FormData();
    formData.set("personRockId", "8597");
    formData.set("accountRockId", "1");

    await expect(acceptPledgeRecommendationAction(formData)).resolves.toEqual({
      result: "accepted",
    });

    expect(mocks.quickCreateGivingPledge).toHaveBeenCalledWith(
      {
        accountRockId: 1,
        personRockId: 8597,
        startDate: null,
      },
      (mocks.accessState as { status: "authorized"; user: unknown }).user,
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/tools/pledge-recommendations",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/people/8597");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("denies a recommendation and revalidates the queue without redirecting", async () => {
    const formData = new FormData();
    formData.set("personRockId", "8597");
    formData.set("accountRockId", "1");

    await expect(denyPledgeRecommendationAction(formData)).resolves.toEqual({
      result: "denied",
    });

    expect(mocks.rejectGivingPledgeRecommendation).toHaveBeenCalledWith(
      {
        accountRockId: 1,
        personRockId: 8597,
        reason: null,
      },
      (mocks.accessState as { status: "authorized"; user: unknown }).user,
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/tools/pledge-recommendations",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/people/8597");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
