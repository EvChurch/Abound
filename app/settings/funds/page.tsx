import { redirect } from "next/navigation";

import {
  rebuildFundScopedCalculationsAction,
  updatePlatformFundSettingsAction,
} from "@/app/settings/funds/actions";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { FundSettings } from "@/components/settings/fund-settings";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { listPlatformFundSettings } from "@/lib/settings/funds";

type FundSettingsPageProps = {
  searchParams: Promise<{
    refresh?: string;
    saved?: string;
  }>;
};

export default async function FundSettingsPage({
  searchParams,
}: FundSettingsPageProps) {
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
            Your local app role does not include settings management.
          </p>
        </div>
      </main>
    );
  }

  const [summary, params] = await Promise.all([
    listPlatformFundSettings(accessState.user),
    searchParams,
  ]);

  return (
    <main className="min-h-screen bg-app-background">
      <AppTopNav active="settings" canManageSettings />
      <div className="mx-auto max-w-[1280px] px-7 py-7">
        <FundSettings
          onRebuild={rebuildFundScopedCalculationsAction}
          onSave={updatePlatformFundSettingsAction}
          saved={params.saved === "1"}
          refreshRequested={params.refresh === "1"}
          summary={summary}
        />
      </div>
    </main>
  );
}
