"use server";

import type { SavedListViewResource } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import {
  cancelAutomationRun,
  cancelAutomationRunReview,
  completeAutomationRunReview,
  excludeAutomationRecipient,
  prepareAutomationRunSendNow,
  runCommunicationAutomationNow,
  updateAutomationRecipientReviewDecision,
  type AutomationRecipientReviewDecision,
} from "@/lib/communications/automation-runs";
import {
  archiveCommunicationAutomation,
  createCommunicationAutomation,
  createJoiningNeverGivenAutomation,
  deleteCommunicationAutomation,
  unarchiveCommunicationAutomation,
  updateCommunicationAutomation,
  updateCommunicationAutomationTemplate,
} from "@/lib/communications/automations";
import { createCommunicationPrep } from "@/lib/communications/prep";
import { updateCommunicationPrep } from "@/lib/communications/prep";
import { DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE } from "@/lib/communications/templates";
import { JOINING_NEVER_GIVEN_TEMPLATE_KEY } from "@/lib/communications/templates";

export async function createCommunicationAutomationFromSegmentAction(
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

  const savedListViewId = String(formData.get("savedListViewId") ?? "");
  const name =
    optionalString(formData.get("name")) ?? "Segment communication workflow";
  const reviewerUserIds = reviewerUserIdsFromFormData(
    formData,
    accessState.user.id,
  );

  const automation = await createCommunicationAutomation(
    {
      completionReportEmails: completionReportEmailsFromFormData(formData),
      name,
      reviewerUserIds,
      savedListViewId,
      scheduleCron: optionalString(formData.get("scheduleCron")) ?? "0 9 * * 2",
      suppressionMode: repeatSendingModeFromFormData(formData),
      cooldownDays: cooldownDaysFromFormData(formData),
      templateFields: templateFieldsFromFormData(formData),
      templateKey: JOINING_NEVER_GIVEN_TEMPLATE_KEY,
    },
    accessState.user,
  );

  redirect(`/communications/${automation.id}?created=1`);
}

export async function createJoiningNeverGivenAutomationAction() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const automation = await createJoiningNeverGivenAutomation(accessState.user);

  redirect(`/communications/${automation.id}?created=1`);
}

export async function updateCommunicationAutomationTemplateAction(
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

  const id = String(formData.get("id") ?? "");

  await updateCommunicationAutomationTemplate(
    {
      id,
      templateFields: {
        ...templateFieldsFromFormData(formData),
      },
    },
    accessState.user,
  );

  redirect(`/communications/${id}?template=updated`);
}

export async function updateCommunicationAutomationAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const id = String(formData.get("id") ?? "");
  const reviewerUserIds = reviewerUserIdsFromFormData(
    formData,
    accessState.user.id,
  );

  await updateCommunicationAutomation(
    {
      completionReportEmails: completionReportEmailsFromFormData(formData),
      id,
      name:
        optionalString(formData.get("name")) ??
        "Segment communication workflow",
      reviewerUserIds,
      savedListViewId: String(formData.get("savedListViewId") ?? ""),
      scheduleCron: optionalString(formData.get("scheduleCron")) ?? "0 9 * * 2",
      suppressionMode: repeatSendingModeFromFormData(formData),
      cooldownDays: cooldownDaysFromFormData(formData),
      templateFields: templateFieldsFromFormData(formData),
    },
    accessState.user,
  );

  redirect(`/communications/${id}?updated=1`);
}

export async function deleteCommunicationAutomationAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const id = String(formData.get("id") ?? "");

  await deleteCommunicationAutomation(id, accessState.user);

  redirect("/communications?deleted=1");
}

export async function archiveCommunicationAutomationAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const id = String(formData.get("id") ?? "");

  await archiveCommunicationAutomation(id, accessState.user);

  redirect(`/communications/${id}?archived=1`);
}

export async function unarchiveCommunicationAutomationAction(
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

  const id = String(formData.get("id") ?? "");

  await unarchiveCommunicationAutomation(id, accessState.user);

  redirect(`/communications/${id}?unarchived=1`);
}

export async function excludeAutomationRecipientAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const automationId = String(formData.get("automationId") ?? "");
  const recipientId = String(formData.get("recipientId") ?? "");

  await excludeAutomationRecipient(
    {
      reason: optionalString(formData.get("reason")),
      recipientId,
    },
    accessState.user,
  );

  redirect(`/communications/${automationId}?recipient=excluded`);
}

export async function updateAutomationRecipientReviewDecisionAction(
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

  const automationId = String(formData.get("automationId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const recipientId = String(formData.get("recipientId") ?? "");
  const runId = optionalString(formData.get("runId"));

  validateRecipientReviewDecision(decision);

  await updateAutomationRecipientReviewDecision(
    {
      decision,
      recipientId,
    },
    accessState.user,
  );

  redirect(
    runId
      ? `/communications/${automationId}/runs/${runId}?recipient=updated`
      : `/communications/${automationId}?recipient=updated`,
  );
}

export async function updateAutomationRecipientReviewDecisionInlineAction({
  decision,
  recipientId,
}: {
  decision: AutomationRecipientReviewDecision;
  recipientId: string;
}) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  validateRecipientReviewDecision(decision);

  await updateAutomationRecipientReviewDecision(
    {
      decision,
      recipientId,
    },
    accessState.user,
  );

  return { decision, recipientId };
}

export async function completeCommunicationAutomationRunReviewAction(
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

  const automationId = String(formData.get("automationId") ?? "");
  const runId = String(formData.get("runId") ?? "");

  await completeAutomationRunReview(
    {
      decisions: parseRecipientReviewDecisions(
        String(formData.get("decisionsJson") ?? "[]"),
      ),
      runId,
    },
    accessState.user,
  );

  redirect(`/communications/${automationId}?review=completed&runId=${runId}`);
}

function validateRecipientReviewDecision(
  decision: string,
): asserts decision is AutomationRecipientReviewDecision {
  if (
    decision !== "SEND" &&
    decision !== "SKIP_BATCH" &&
    decision !== "PERMANENTLY_EXCLUDE"
  ) {
    throw new Error("Unknown recipient review decision.");
  }
}

export async function cancelCommunicationAutomationRunReviewAction(
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

  const automationId = String(formData.get("automationId") ?? "");
  const runId = String(formData.get("runId") ?? "");

  await cancelAutomationRunReview({ runId }, accessState.user);

  redirect(`/communications/${automationId}?review=rejected`);
}

export async function cancelCommunicationAutomationRunAction(
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

  const automationId = String(formData.get("automationId") ?? "");
  const runId = String(formData.get("runId") ?? "");

  await cancelAutomationRun({ runId }, accessState.user);

  redirect(`/communications/${automationId}?run=canceled`);
}

export async function sendCommunicationAutomationRunNowAction(
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

  const automationId = String(formData.get("automationId") ?? "");
  const runId = String(formData.get("runId") ?? "");

  await prepareAutomationRunSendNow({ runId }, accessState.user);

  redirect(`/communications/${automationId}?send=ready&runId=${runId}`);
}

export async function runCommunicationAutomationNowAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const automationId = String(formData.get("id") ?? "");

  const run = await runCommunicationAutomationNow(
    { automationId },
    accessState.user,
  );

  redirect(
    run
      ? `/communications/${automationId}/runs/${run.id}`
      : `/communications/${automationId}?run=empty`,
  );
}

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

function repeatSendingModeFromFormData(formData: FormData) {
  const value = String(
    formData.get("repeatMode") ??
      formData.get("suppressionMode") ??
      "NEVER_RESEND",
  );

  if (value === "COOLDOWN") {
    return "COOLDOWN" as const;
  }

  if (value === "EVERY_RUN") {
    return "EVERY_RUN" as const;
  }

  return "NEVER_RESEND" as const;
}

function reviewerUserIdsFromFormData(
  formData: FormData,
  fallbackUserId: string,
) {
  const reviewerUserIds = formData
    .getAll("reviewerUserId")
    .map((value) => optionalString(value))
    .filter((value): value is string => Boolean(value));

  return reviewerUserIds.length > 0 ? reviewerUserIds : [fallbackUserId];
}

function completionReportEmailsFromFormData(formData: FormData) {
  return formData.getAll("completionReportEmail").map((value) => String(value));
}

function parseRecipientReviewDecisions(value: string) {
  const parsed = JSON.parse(value) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Recipient review decisions must be an array.");
  }

  return parsed.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("Recipient review decision is invalid.");
    }

    const decision = String(
      (entry as { decision?: unknown }).decision ?? "",
    ) as AutomationRecipientReviewDecision;
    const recipientId = String(
      (entry as { recipientId?: unknown }).recipientId ?? "",
    );

    if (
      decision !== "SEND" &&
      decision !== "SKIP_BATCH" &&
      decision !== "PERMANENTLY_EXCLUDE"
    ) {
      throw new Error("Unknown recipient review decision.");
    }

    return {
      decision,
      recipientId,
    };
  });
}

function cooldownDaysFromFormData(formData: FormData) {
  const value = Number(formData.get("cooldownDays") ?? 30);

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function templateFieldsFromFormData(formData: FormData) {
  return {
    editorJson: parseOptionalJson(formData.get("editorJson")),
    format: "react-email-editor" as const,
    html:
      optionalString(formData.get("html")) ??
      DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE.html,
    previewText:
      optionalString(formData.get("previewText")) ??
      DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE.previewText,
    subject:
      optionalString(formData.get("subject")) ??
      DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE.subject,
    text: optionalString(formData.get("text")),
  };
}

function parseOptionalJson(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
