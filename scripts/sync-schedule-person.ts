import "dotenv/config";

import {
  createSyncBoss,
  ensureSyncQueues,
  scheduleRockPersonSync,
} from "@/lib/sync/jobs";

const personId = Number(process.argv[2] ?? process.env.ROCK_SYNC_PERSON_ID);
const cron = process.argv[3] ?? process.env.ROCK_SYNC_CRON ?? "0 * * * *";

if (!Number.isInteger(personId) || personId <= 0) {
  console.error("Usage: pnpm sync:schedule-person <rock-person-id> [cron]");
  process.exit(1);
}

async function main() {
  const boss = createSyncBoss();
  boss.on("error", (error) => console.error(error.message));
  await boss.start();
  await ensureSyncQueues(boss);
  await scheduleRockPersonSync(boss, { personId }, cron);
  await boss.stop();

  console.log(`scheduled rock-person-sync for person ${personId} on "${cron}"`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
