import { redirect } from "next/navigation";

import {
  approveAccessRequestAction,
  denyAccessRequestAction,
  updateAppUserAction,
} from "@/app/settings/users/actions";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { UserManagementSettings } from "@/components/settings/user-management-settings";
import { QueryResultToast } from "@/components/ui/query-result-toast";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { listUserManagementSummary } from "@/lib/settings/users";

type UserSettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

export default async function UserSettingsPage({
  searchParams,
}: UserSettingsPageProps) {
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
            Your local app role does not include user management.
          </p>
        </div>
      </main>
    );
  }

  const [summary, params] = await Promise.all([
    listUserManagementSummary(accessState.user),
    searchParams,
  ]);
  const toastMessages =
    params.saved === "1" ? ["User access settings saved."] : [];

  return (
    <main className="min-h-screen bg-app-background">
      <AppTopNav
        active="settings"
        canManageSettings
        canManageTools
        settingsActiveItem="users"
      />
      <div className="mx-auto max-w-[1280px] px-7 py-7">
        <QueryResultToast
          clearHref="/settings/users"
          messages={toastMessages}
        />
        <UserManagementSettings
          approveAction={approveAccessRequestAction}
          denyAction={denyAccessRequestAction}
          summary={summary}
          updateUserAction={updateAppUserAction}
        />
      </div>
    </main>
  );
}
