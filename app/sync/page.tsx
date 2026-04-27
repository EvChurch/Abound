import { redirect } from "next/navigation";

import { SyncStatus } from "@/components/sync/sync-status";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { auth0 } from "@/lib/auth/auth0";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { hasPermission } from "@/lib/auth/roles";
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
    <main className="min-h-screen bg-app-background">
      <AppTopNav
        active="settings"
        canManageSettings={hasPermission(
          accessState.user.role,
          "settings:manage",
        )}
        canManageTools={hasPermission(accessState.user.role, "pledges:manage")}
        settingsActiveItem="sync-status"
      />
      <SyncStatus summary={summary} />
    </main>
  );
}
