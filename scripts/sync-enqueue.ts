import "dotenv/config";

import {
  createSyncBoss,
  enqueueRockFullSync,
  ensureSyncQueues,
} from "@/lib/sync/jobs";

async function main() {
  const boss = createSyncBoss();
  boss.on("error", (error) => console.error(error.message));
  await boss.start();
  await ensureSyncQueues(boss);
  const jobId = await enqueueRockFullSync(boss, { requestedBy: "manual" });
  await boss.stop();

  console.log(`queued ${jobId} in rock-full-sync`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
