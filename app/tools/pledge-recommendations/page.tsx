import { redirect } from "next/navigation";

import {
  acceptPledgeRecommendationAction,
  denyPledgeRecommendationAction,
} from "@/app/tools/pledge-recommendations/actions";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { PledgeRecommendationsQueue } from "@/components/settings/pledge-recommendations-queue";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import {
  listPledgeCandidates,
  type PledgeCandidate,
} from "@/lib/giving/pledges";

type PledgeRecommendationsPageProps = {
  searchParams: Promise<{
    result?: string;
  }>;
};

export default async function PledgeRecommendationsPage({
  searchParams,
}: PledgeRecommendationsPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  if (!hasPermission(accessState.user.role, "pledges:manage")) {
    return (
      <main className="min-h-screen bg-app-background">
        <div className="mx-auto grid max-w-3xl gap-4 px-7 py-12">
          <h1 className="text-3xl font-semibold tracking-normal">
            Pledge recommendations require finance or administrator access.
          </h1>
          <p className="text-sm leading-6 text-app-muted">
            Your local app role does not include pledge recommendation
            management.
          </p>
        </div>
      </main>
    );
  }

  const [candidates, params] = await Promise.all([
    listPledgeCandidates({ limit: 200 }, accessState.user),
    searchParams,
  ]);

  return (
    <main className="min-h-screen bg-app-background">
      <AppTopNav
        active="tools"
        canManageSettings={hasPermission(
          accessState.user.role,
          "settings:manage",
        )}
        canManageTools
        toolsActiveItem="pledge-recommendations"
      />
      <div className="mx-auto max-w-[1280px] px-7 py-7">
        <PledgeRecommendationsQueue
          acceptAction={acceptPledgeRecommendationAction}
          candidates={sortCandidates(candidates)}
          denyAction={denyPledgeRecommendationAction}
          result={params.result ?? null}
        />
      </div>
    </main>
  );
}

function sortCandidates(candidates: PledgeCandidate[]) {
  return [...candidates].sort((left, right) => {
    const confidenceDelta =
      confidenceRank(right.confidence) - confidenceRank(left.confidence);

    if (confidenceDelta !== 0) {
      return confidenceDelta;
    }

    const rightGiftAt = right.lastGiftAt ? right.lastGiftAt.getTime() : 0;
    const leftGiftAt = left.lastGiftAt ? left.lastGiftAt.getTime() : 0;

    if (rightGiftAt !== leftGiftAt) {
      return rightGiftAt - leftGiftAt;
    }

    return left.personDisplayName.localeCompare(right.personDisplayName);
  });
}

function confidenceRank(confidence: PledgeCandidate["confidence"]) {
  switch (confidence) {
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}
