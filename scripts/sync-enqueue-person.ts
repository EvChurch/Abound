import "dotenv/config";

import {
  createSyncBoss,
  enqueueRockPersonSync,
  ensureSyncQueues,
} from "@/lib/sync/jobs";

const personId = Number(process.argv[2] ?? process.env.ROCK_SYNC_PERSON_ID);

if (!Number.isInteger(personId) || personId <= 0) {
  console.error("Usage: pnpm sync:enqueue-person <rock-person-id>");
  process.exit(1);
}

async function main() {
  const boss = createSyncBoss();
  boss.on("error", (error) => console.error(error.message));
  await boss.start();
  await ensureSyncQueues(boss);
  const jobId = await enqueueRockPersonSync(boss, {
    personId,
    requestedBy: "manual",
  });
  await boss.stop();

  console.log(`queued ${jobId} in rock-person-sync for person ${personId}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
