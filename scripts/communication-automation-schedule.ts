import "dotenv/config";

import { scheduleCommunicationAutomation } from "@/lib/communications/automation-jobs";
import { prisma } from "@/lib/db/prisma";
import { createSyncBoss, ensureSyncQueues } from "@/lib/sync/jobs";

async function main() {
  const automations = await prisma.communicationAutomation.findMany({
    select: {
      id: true,
      preSendNoticeMinutes: true,
      scheduleCron: true,
      scheduleTimezone: true,
    },
    where: {
      archivedAt: null,
      pausedAt: null,
    },
  });

  const boss = createSyncBoss();

  try {
    await boss.start();
    await ensureSyncQueues(boss);

    for (const automation of automations) {
      await scheduleCommunicationAutomation(boss, automation);
    }
  } finally {
    await boss.stop({ graceful: false, timeout: 5000 });
  }

  console.log(`Scheduled ${automations.length} communication automation(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
