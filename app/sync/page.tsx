import { redirect } from "next/navigation";

import { SyncStatus } from "@/components/sync/sync-status";
import { auth0 } from "@/lib/auth/auth0";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { getSyncStatusSummary } from "@/lib/sync/status";

export default async function SyncPage() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const summary = await getSyncStatusSummary();

  return (
    <main className="min-h-screen px-7 py-12 sm:px-12">
      <div className="mx-auto max-w-6xl">
        <SyncStatus summary={summary} />
      </div>
    </main>
  );
}
