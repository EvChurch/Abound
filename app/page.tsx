import { redirect } from "next/navigation";

import { AccessRequestForm } from "@/components/auth/access-request-form";
import { StaffDashboard } from "@/components/dashboard/staff-dashboard";
import { auth0 } from "@/lib/auth/auth0";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { getHouseholdDonorTrend } from "@/lib/giving/metrics";

export default async function HomePage() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    return (
      <main className="min-h-screen px-7 py-12 sm:px-12">
        <section className="grid max-w-3xl gap-5 py-8 sm:py-14">
          <p className="text-sm font-bold uppercase text-app-accent-strong">
            Access needed
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
            You need administrator approval to continue.
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-app-muted">
            Your Auth0 login worked, but this app requires a local user profile
            and role before sensitive data is visible.
          </p>
          <AccessRequestForm />
        </section>
      </main>
    );
  }

  const householdDonorTrend = await getHouseholdDonorTrend();

  return (
    <StaffDashboard
      householdDonorTrend={householdDonorTrend}
      user={accessState.user}
    />
  );
}
