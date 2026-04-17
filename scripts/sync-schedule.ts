import "dotenv/config";

import {
  createSyncBoss,
  ensureSyncQueues,
  scheduleRockFullSync,
  unscheduleRockPersonSync,
} from "@/lib/sync/jobs";

const cron = process.argv[2] ?? process.env.ROCK_SYNC_CRON ?? "0 * * * *";

async function main() {
  const boss = createSyncBoss();
  boss.on("error", (error) => console.error(error.message));
  await boss.start();
  await ensureSyncQueues(boss);
  await scheduleRockFullSync(boss, {}, cron);
  await unscheduleRockPersonSync(boss);
  await boss.stop();

  console.log(`scheduled rock-full-sync on "${cron}"`);
  console.log("removed legacy rock-person-sync schedule if it existed");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
