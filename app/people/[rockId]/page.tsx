import { notFound, redirect } from "next/navigation";

import { PersonProfile } from "@/components/people/person-profile";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { getRockPersonProfile } from "@/lib/people/profiles";
import {
  createDraftPersonPledgeAction,
  quickCreatePersonPledgeAction,
  rejectPersonPledgeRecommendationAction,
  updatePersonPledgeAction,
} from "@/app/people/[rockId]/actions";

type PersonPageProps = {
  params: Promise<{
    rockId: string;
  }>;
};

export default async function PersonPage({ params }: PersonPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const rockId = Number((await params).rockId);

  if (!Number.isInteger(rockId) || rockId <= 0) {
    notFound();
  }

  const profile = await getRockPersonProfile({ rockId }, accessState.user);

  if (!profile) {
    notFound();
  }

  return (
    <PersonProfile
      canManageSettings={hasPermission(
        accessState.user.role,
        "settings:manage",
      )}
      canManageTools={hasPermission(accessState.user.role, "pledges:manage")}
      pledgeActions={{
        createDraft: createDraftPersonPledgeAction,
        quickCreate: quickCreatePersonPledgeAction,
        reject: rejectPersonPledgeRecommendationAction,
        update: updatePersonPledgeAction,
      }}
      profile={profile}
    />
  );
}
