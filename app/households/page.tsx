import { redirect } from "next/navigation";

import { LookupPage } from "@/components/people/record-lookup";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";

type HouseholdLookupPageProps = {
  searchParams: Promise<{
    rockId?: string;
  }>;
};

export default async function HouseholdLookupPage({
  searchParams,
}: HouseholdLookupPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const rockId = (await searchParams).rockId?.trim();

  if (rockId) {
    redirect(`/households/${rockId}`);
  }

  return <LookupPage kind="household" />;
}
