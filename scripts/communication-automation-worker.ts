import "dotenv/config";

import type { Job } from "pg-boss";

import {
  performCommunicationAutomationDueSendSweep,
  performCommunicationAutomationEvaluationJob,
  performCommunicationAutomationNoticeJob,
  type CommunicationAutomationEvaluateJobData,
  type CommunicationAutomationRunJobData,
} from "@/lib/communications/automation-jobs";
import { createSyncBoss, ensureSyncQueues } from "@/lib/sync/jobs";
import {
  COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
  COMMUNICATION_AUTOMATION_NOTICE_QUEUE,
} from "@/lib/sync/job-constants";

const once = process.argv.includes("--once");
const onceTimeoutMs = Number(
  process.env.COMMUNICATION_AUTOMATION_WORKER_ONCE_TIMEOUT_MS ?? 300000,
);
const sendSweepIntervalMs = Number(
  process.env.COMMUNICATION_AUTOMATION_SEND_SWEEP_INTERVAL_MS ?? 600000,
);

async function main() {
  const boss = createSyncBoss();
  boss.on("error", (error) => console.error(error.message));
  await boss.start();
  await ensureSyncQueues(boss);

  let processed = 0;
  let resolveOnce: (() => void) | null = null;
  const oncePromise = once
    ? new Promise<void>((resolve) => {
        resolveOnce = resolve;
      })
    : null;
  let sendSweepTimer: NodeJS.Timeout | null = null;

  const runSendSweep = async () => {
    const result = await performCommunicationAutomationDueSendSweep();
    processed += result.processed;

    if (once && result.processed > 0 && resolveOnce) {
      resolveOnce();
    }
  };

  await boss.work<CommunicationAutomationEvaluateJobData>(
    COMMUNICATION_AUTOMATION_EVALUATE_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 1 },
    async (jobs: Job<CommunicationAutomationEvaluateJobData>[]) => {
      for (const job of jobs) {
        await performCommunicationAutomationEvaluationJob(job.data, { boss });
        processed += 1;
      }

      if (once && resolveOnce) {
        resolveOnce();
      }
    },
  );

  await boss.work<CommunicationAutomationRunJobData>(
    COMMUNICATION_AUTOMATION_NOTICE_QUEUE,
    { batchSize: 1, pollingIntervalSeconds: 1 },
    async (jobs: Job<CommunicationAutomationRunJobData>[]) => {
      for (const job of jobs) {
        await performCommunicationAutomationNoticeJob(job.data);
        processed += 1;
      }

      if (once && resolveOnce) {
        resolveOnce();
      }
    },
  );

  await runSendSweep();

  if (!once) {
    sendSweepTimer = setInterval(() => {
      runSendSweep().catch((error) => {
        console.error(error instanceof Error ? error.message : String(error));
      });
    }, sendSweepIntervalMs);
  }

  if (oncePromise) {
    await Promise.race([
      oncePromise,
      new Promise<void>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Timed out waiting for one communication automation job after ${onceTimeoutMs}ms.`,
              ),
            ),
          onceTimeoutMs,
        );
      }),
    ]);
    if (sendSweepTimer) {
      clearInterval(sendSweepTimer);
    }
    await boss.stop({ graceful: false, timeout: 5000 });
  }

  console.log(
    once
      ? `Processed ${processed} communication automation job(s).`
      : "Communication automation worker started.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
