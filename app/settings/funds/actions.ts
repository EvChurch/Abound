"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { updatePlatformFundSettings } from "@/lib/settings/funds";

export async function updatePlatformFundSettingsAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const enabledAccountRockIds = formData
    .getAll("enabledAccountRockIds")
    .map((value) => Number(value));

  await updatePlatformFundSettings(
    {
      enabledAccountRockIds,
    },
    accessState.user,
  );

  revalidatePath("/settings/funds");
  redirect("/settings/funds?saved=1");
}

export async function rebuildFundScopedCalculationsAction() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const { requestFundScopedGivingRefresh } =
    await import("@/lib/giving/derived-refresh");

  await requestFundScopedGivingRefresh({
    requestedByUserId: accessState.user.id,
  });

  revalidatePath("/settings/funds");
  redirect("/settings/funds?refresh=1");
}
