"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import type { AppRole } from "@/lib/auth/roles";
import {
  approveAccessRequest,
  denyAccessRequest,
  updateAppUser,
} from "@/lib/settings/users";

export async function approveAccessRequestAction(formData: FormData) {
  const actor = await requireAdminActor();

  await approveAccessRequest(
    {
      requestId: requiredString(formData, "requestId"),
      role: requiredString(formData, "role") as AppRole,
    },
    actor,
  );

  revalidatePath("/settings/users");
  redirect("/settings/users?saved=1");
}

export async function denyAccessRequestAction(formData: FormData) {
  const actor = await requireAdminActor();

  await denyAccessRequest(
    {
      requestId: requiredString(formData, "requestId"),
    },
    actor,
  );

  revalidatePath("/settings/users");
  redirect("/settings/users?saved=1");
}

export async function updateAppUserAction(formData: FormData) {
  const actor = await requireAdminActor();

  await updateAppUser(
    {
      userId: requiredString(formData, "userId"),
      active: formData.get("active") === "on",
      role: requiredString(formData, "role") as AppRole,
    },
    actor,
  );

  revalidatePath("/settings/users");
  redirect("/settings/users?saved=1");
}

async function requireAdminActor() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  return accessState.user;
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value;
}
