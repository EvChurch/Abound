"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import {
  createSyncBoss,
  ensureSyncQueues,
  enqueueRockFullSync,
  enqueueRockPersonSync,
  scheduleRockFullSync,
  scheduleRockPersonSync,
  unscheduleRockPersonSync,
} from "@/lib/sync/jobs";
import {
  GIVING_DERIVED_REFRESH_QUEUE,
  ROCK_FULL_SYNC_QUEUE,
  ROCK_FULL_SYNC_SCHEDULE_KEY,
  ROCK_PERSON_SYNC_QUEUE,
  ROCK_PERSON_SYNC_SCHEDULE_KEY,
} from "@/lib/sync/job-constants";

const JOBS_PAGE_PATH = "/settings/jobs";

export async function enqueueRockFullSyncAction() {
  await withBoss(async (boss) => {
    await enqueueRockFullSync(boss, { requestedBy: "manual" });
  });

  return redirectToJobs("full-sync-enqueued");
}

export async function enqueueRockPersonSyncAction(formData: FormData) {
  const personId = requiredPositiveInt(formData, "personId");

  await withBoss(async (boss) => {
    await enqueueRockPersonSync(boss, { personId, requestedBy: "manual" });
  });

  return redirectToJobs("person-sync-enqueued");
}

export async function enqueueFundRefreshAction() {
  const actor = await requireAdminActor();

  const { requestFundScopedGivingRefresh } =
    await import("@/lib/giving/derived-refresh");

  await requestFundScopedGivingRefresh({
    requestedByUserId: actor.id,
  });

  return redirectToJobs("fund-refresh-enqueued");
}

export async function scheduleRockFullSyncAction(formData: FormData) {
  const cron = requiredString(formData, "cron");
  const key =
    optionalString(formData, "scheduleKey") ?? ROCK_FULL_SYNC_SCHEDULE_KEY;

  await withBoss(async (boss) => {
    await scheduleRockFullSync(boss, { requestedBy: "schedule" }, cron, key);
  });

  return redirectToJobs("full-sync-scheduled");
}

export async function unscheduleRockFullSyncAction(formData: FormData) {
  const key =
    optionalString(formData, "scheduleKey") ?? ROCK_FULL_SYNC_SCHEDULE_KEY;

  await withBoss(async (boss) => {
    await boss.unschedule(ROCK_FULL_SYNC_QUEUE, key);
  });

  return redirectToJobs("full-sync-unscheduled");
}

export async function scheduleRockPersonSyncAction(formData: FormData) {
  const personId = requiredPositiveInt(formData, "personId");
  const cron = requiredString(formData, "cron");
  const key =
    optionalString(formData, "scheduleKey") ?? ROCK_PERSON_SYNC_SCHEDULE_KEY;

  await withBoss(async (boss) => {
    await scheduleRockPersonSync(boss, { personId }, cron, key);
  });

  return redirectToJobs("person-sync-scheduled");
}

export async function unscheduleRockPersonSyncAction(formData: FormData) {
  const key =
    optionalString(formData, "scheduleKey") ?? ROCK_PERSON_SYNC_SCHEDULE_KEY;

  await withBoss(async (boss) => {
    await unscheduleRockPersonSync(boss, key);
  });

  return redirectToJobs("person-sync-unscheduled");
}

export async function runJobActionById(formData: FormData) {
  const queue = requiredString(formData, "queue");
  const jobId = requiredString(formData, "jobId");
  const action = requiredString(formData, "action");

  if (!isAllowedQueue(queue)) {
    throw new Error("queue is not supported for this action.");
  }

  await withBoss(async (boss) => {
    if (action === "retry") {
      await boss.retry(queue, jobId);
      return;
    }

    if (action === "cancel") {
      await boss.cancel(queue, jobId);
      return;
    }

    if (action === "delete") {
      await boss.deleteJob(queue, jobId);
      return;
    }

    throw new Error("action is not supported.");
  });

  return redirectToJobs(`job-${action}`);
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

  if (!hasPermission(accessState.user.role, "settings:manage")) {
    throw new Error("You do not have permission to manage jobs.");
  }

  return accessState.user;
}

async function withBoss(
  run: (boss: ReturnType<typeof createSyncBoss>) => Promise<void>,
) {
  await requireAdminActor();

  const boss = createSyncBoss();

  try {
    await boss.start();
    await ensureSyncQueues(boss);
    await run(boss);
  } finally {
    await boss.stop({ graceful: false, timeout: 5000 });
    revalidatePath(JOBS_PAGE_PATH);
  }
}

function redirectToJobs(result: string) {
  redirect(`${JOBS_PAGE_PATH}?result=${encodeURIComponent(result)}`);
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredPositiveInt(formData: FormData, key: string) {
  const parsed = Number(requiredString(formData, key));

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer.`);
  }

  return parsed;
}

function isAllowedQueue(queue: string) {
  return [
    GIVING_DERIVED_REFRESH_QUEUE,
    ROCK_FULL_SYNC_QUEUE,
    ROCK_PERSON_SYNC_QUEUE,
  ].includes(queue);
}
