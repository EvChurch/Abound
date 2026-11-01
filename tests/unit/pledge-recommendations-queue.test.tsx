import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PledgeRecommendationsQueue } from "@/components/settings/pledge-recommendations-queue";
import type { PledgeCandidate } from "@/lib/giving/pledges";

function candidate(personRockId: number): PledgeCandidate {
  return {
    account: { active: true, name: "Fixture Fund", rockId: 1 },
    activePledge: null,
    basisMonths: 10,
    confidence: "HIGH",
    draftPledge: null,
    explanation: "Synthetic recommendation",
    givingTrend: [],
    lastGiftAt: null,
    lastTwelveMonthsTotal: "1200.00",
    personDisplayName: `Fixture Person ${personRockId}`,
    personRockId,
    recommendedAmount: "100.00",
    recommendedMatchStreakCount: 6,
    recommendedMatchStreakStartedAt: null,
    recommendedPeriod: "MONTHLY",
    sourceExplanation: "Synthetic fixture",
    status: "RECOMMENDED",
  };
}

describe("PledgeRecommendationsQueue prop synchronization", () => {
  it("preserves optimistic removal on unchanged props and resets on refreshed candidates", async () => {
    const acceptAction = vi.fn<
      (formData: FormData) => Promise<{ result: "accepted" }>
    >(async () => ({ result: "accepted" }));
    const props = {
      candidates: [candidate(1)],
      acceptAction,
      denyAction: vi.fn(async () => ({ result: "denied" as const })),
      result: null,
    };
    const { rerender } = render(<PledgeRecommendationsQueue {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Accept" }));
    await waitFor(() => expect(acceptAction).toHaveBeenCalledOnce());
    expect(screen.getByText("0 outstanding")).toBeInTheDocument();
    const submitted = acceptAction.mock.calls[0]?.[0] as FormData | undefined;
    expect(submitted?.get("personRockId")).toBe("1");
    expect(submitted?.get("accountRockId")).toBe("1");

    rerender(<PledgeRecommendationsQueue {...props} result="accepted" />);
    expect(screen.getByText("0 outstanding")).toBeInTheDocument();

    rerender(
      <PledgeRecommendationsQueue {...props} candidates={[candidate(2)]} />,
    );
    expect(screen.getByText("1 outstanding")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Fixture Person 2" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Fixture Person 1" }),
    ).not.toBeInTheDocument();
  });

  it("restores an optimistically removed candidate after an action failure", async () => {
    let rejectAction: (error: Error) => void = () => {};
    const denyAction = vi.fn(
      () =>
        new Promise<{ result: "denied" }>((_resolve, reject) => {
          rejectAction = reject;
        }),
    );
    render(
      <PledgeRecommendationsQueue
        candidates={[candidate(1)]}
        acceptAction={vi.fn(async () => ({ result: "accepted" as const }))}
        denyAction={denyAction}
        result={null}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Deny" }));
    expect(screen.getByText("0 outstanding")).toBeInTheDocument();
    await act(async () => rejectAction(new Error("Fixture failure")));
    expect(screen.getByText("1 outstanding")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Fixture Person 1" }),
    ).toBeInTheDocument();
  });
});
