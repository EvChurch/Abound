"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import {
  quickCreateGivingPledge,
  rejectGivingPledgeRecommendation,
} from "@/lib/giving/pledges";

const TOOLS_PLEDGE_RECOMMENDATIONS_PATH = "/tools/pledge-recommendations";

export type PledgeRecommendationActionResult = {
  result: "accepted" | "denied";
};

export async function acceptPledgeRecommendationAction(
  formData: FormData,
): Promise<PledgeRecommendationActionResult> {
  const actor = await requirePledgeActor();
  const personRockId = readPositiveInt(formData, "personRockId");

  await quickCreateGivingPledge(
    {
      accountRockId: readPositiveInt(formData, "accountRockId"),
      personRockId,
      startDate: readOptionalDate(formData, "startDate"),
    },
    actor,
  );

  revalidatePath(TOOLS_PLEDGE_RECOMMENDATIONS_PATH);
  revalidatePath(`/people/${personRockId}`);

  return { result: "accepted" };
}

export async function denyPledgeRecommendationAction(
  formData: FormData,
): Promise<PledgeRecommendationActionResult> {
  const actor = await requirePledgeActor();
  const personRockId = readPositiveInt(formData, "personRockId");

  await rejectGivingPledgeRecommendation(
    {
      accountRockId: readPositiveInt(formData, "accountRockId"),
      personRockId,
      reason: readOptionalString(formData, "reason"),
    },
    actor,
  );

  revalidatePath(TOOLS_PLEDGE_RECOMMENDATIONS_PATH);
  revalidatePath(`/people/${personRockId}`);

  return { result: "denied" };
}

async function requirePledgeActor() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  if (!hasPermission(accessState.user.role, "pledges:manage")) {
    throw new Error("Pledge management permissions are required.");
  }

  return accessState.user;
}

function readPositiveInt(formData: FormData, key: string) {
  const value = Number(readRequiredString(formData, key));

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return value;
}

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function readOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized : null;
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readOptionalString(formData, key);

  return value ? new Date(value) : null;
}
