import { redirect } from "next/navigation";

import {
  enqueueFundRefreshAction,
  enqueueRockFullSyncAction,
  enqueueRockPersonSyncAction,
  runJobActionById,
  scheduleRockFullSyncAction,
  scheduleRockPersonSyncAction,
  unscheduleRockFullSyncAction,
  unscheduleRockPersonSyncAction,
} from "@/app/settings/jobs/actions";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { JobsDashboard } from "@/components/settings/jobs-dashboard";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { listJobsDashboardSummary } from "@/lib/settings/jobs";

type JobsSettingsPageProps = {
  searchParams: Promise<{
    result?: string;
  }>;
};

export default async function JobsSettingsPage({
  searchParams,
}: JobsSettingsPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  if (!hasPermission(accessState.user.role, "settings:manage")) {
    return (
      <main className="min-h-screen bg-app-background">
        <div className="mx-auto grid max-w-3xl gap-4 px-7 py-12">
          <h1 className="text-3xl font-semibold tracking-normal">
            Settings require administrator access.
          </h1>
          <p className="text-sm leading-6 text-app-muted">
            Your local app role does not include jobs management.
          </p>
        </div>
      </main>
    );
  }

  const [summary, params] = await Promise.all([
    listJobsDashboardSummary(accessState.user),
    searchParams,
  ]);

  return (
    <main className="min-h-screen bg-app-background">
      <AppTopNav
        active="settings"
        canManageSettings
        settingsActiveItem="jobs"
      />
      <div className="mx-auto max-w-[1280px] px-7 py-7">
        <JobsDashboard
          enqueueFundRefresh={enqueueFundRefreshAction}
          enqueueRockFullSync={enqueueRockFullSyncAction}
          enqueueRockPersonSync={enqueueRockPersonSyncAction}
          result={params.result ?? null}
          runJobActionById={runJobActionById}
          scheduleRockFullSync={scheduleRockFullSyncAction}
          scheduleRockPersonSync={scheduleRockPersonSyncAction}
          summary={summary}
          unscheduleRockFullSync={unscheduleRockFullSyncAction}
          unscheduleRockPersonSync={unscheduleRockPersonSyncAction}
        />
      </div>
    </main>
  );
}
