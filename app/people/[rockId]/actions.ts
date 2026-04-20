"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { GivingPledgePeriod, GivingPledgeStatus } from "@prisma/client";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import {
  createDraftGivingPledgeFromRecommendation,
  quickCreateGivingPledge,
  rejectGivingPledgeRecommendation,
  updateGivingPledge,
} from "@/lib/giving/pledges";

export async function quickCreatePersonPledgeAction(formData: FormData) {
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

  revalidatePath(`/people/${personRockId}`);
}

export async function createDraftPersonPledgeAction(formData: FormData) {
  const actor = await requirePledgeActor();
  const personRockId = readPositiveInt(formData, "personRockId");

  await createDraftGivingPledgeFromRecommendation(
    {
      accountRockId: readPositiveInt(formData, "accountRockId"),
      personRockId,
      startDate: readOptionalDate(formData, "startDate"),
    },
    actor,
  );

  revalidatePath(`/people/${personRockId}`);
}

export async function rejectPersonPledgeRecommendationAction(
  formData: FormData,
) {
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

  revalidatePath(`/people/${personRockId}`);
}

export async function updatePersonPledgeAction(formData: FormData) {
  const actor = await requirePledgeActor();
  const personRockId = readPositiveInt(formData, "personRockId");

  await updateGivingPledge(
    {
      amount: readOptionalString(formData, "amount"),
      endDate: readOptionalDate(formData, "endDate"),
      id: readRequiredString(formData, "pledgeId"),
      period: readOptionalString(
        formData,
        "period",
      ) as GivingPledgePeriod | null,
      startDate: readOptionalDate(formData, "startDate"),
      status: readOptionalString(
        formData,
        "status",
      ) as GivingPledgeStatus | null,
    },
    actor,
  );

  revalidatePath(`/people/${personRockId}`);
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
