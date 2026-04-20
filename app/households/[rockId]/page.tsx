import { notFound, redirect } from "next/navigation";

import { HouseholdProfile } from "@/components/people/household-profile";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { getRockHouseholdProfile } from "@/lib/people/profiles";

type HouseholdPageProps = {
  params: Promise<{
    rockId: string;
  }>;
  searchParams: Promise<{
    person?: string;
  }>;
};

export default async function HouseholdPage({
  params,
  searchParams,
}: HouseholdPageProps) {
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

  const profile = await getRockHouseholdProfile({ rockId }, accessState.user);

  if (!profile) {
    notFound();
  }

  const personRockId = Number((await searchParams).person);

  return (
    <HouseholdProfile
      currentPersonRockId={
        Number.isInteger(personRockId) && personRockId > 0
          ? personRockId
          : undefined
      }
      profile={profile}
    />
  );
}
