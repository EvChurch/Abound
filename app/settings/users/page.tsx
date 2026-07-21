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
import { listUserManagementSummary } from "@/lib/settings/users";

type UserSettingsPageProps = {
  searchParams: Promise<{
    saved?: string;
  }>;
};

export const metadata = {
  title: "User Settings",
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
      <div className="mx-auto max-w-[1280px] px-4 py-5 sm:px-7 sm:py-7">
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
