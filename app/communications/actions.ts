"use server";

import type { SavedListViewResource } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { createCommunicationPrep } from "@/lib/communications/prep";
import { updateCommunicationPrep } from "@/lib/communications/prep";

export async function createCommunicationPrepFromAudienceAction(
  formData: FormData,
) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const resource = String(formData.get("resource") ?? "");
  const filterDefinitionJson = String(
    formData.get("filterDefinitionJson") ?? "",
  );
  const savedViewId = optionalString(formData.get("savedViewId"));
  const title = String(formData.get("title") ?? "");

  if (resource !== "PEOPLE" && resource !== "HOUSEHOLDS") {
    throw new Error("Invalid communication audience resource.");
  }

  const prep = await createCommunicationPrep(
    {
      filterDefinition: filterDefinitionJson
        ? (JSON.parse(filterDefinitionJson) as unknown)
        : undefined,
      handoffTarget: "Rock communication handoff",
      resource: resource as SavedListViewResource,
      savedViewId,
      title,
    },
    accessState.user,
  );

  redirect(`/communications?created=${prep.id}`);
}

export async function updateCommunicationPrepStatusAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reviewNotes = optionalString(formData.get("reviewNotes"));
  const handoffTarget = optionalString(formData.get("handoffTarget"));

  if (
    status !== "READY_FOR_REVIEW" &&
    status !== "APPROVED" &&
    status !== "HANDED_OFF" &&
    status !== "CANCELED"
  ) {
    throw new Error("Invalid communication prep status.");
  }

  await updateCommunicationPrep(
    {
      handoffTarget,
      id,
      reviewNotes,
      status,
    },
    accessState.user,
  );

  redirect(`/communications/${id}`);
}

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text || null;
}
