import "dotenv/config";

import { prisma } from "@/lib/db/prisma";
import { RockClient } from "@/lib/rock/client";
import type { SyncProgressEvent } from "@/lib/sync/run-sync";
import { syncRockSlice } from "@/lib/sync/run-sync";

const baseUrl = process.env.ROCK_BASE_URL;
const restKey = process.env.ROCK_REST_KEY;
const chunkSize = Number(process.env.SYNC_CHUNK_SIZE ?? 250);

if (!baseUrl || !restKey) {
  console.error("ROCK_BASE_URL and ROCK_REST_KEY are required.");
  process.exit(1);
}

async function main() {
  const client = new RockClient({ baseUrl: baseUrl!, restKey: restKey! });
  const slice = await client.getFullSyncSlice();
  console.log(
    [
      `fetchedPeople=${slice.people.length}`,
      `fetchedFamilyGroups=${slice.familyGroups.length}`,
      `fetchedFamilyMembers=${slice.familyMembers.length}`,
      `fetchedGroups=${slice.groups.length}`,
      `fetchedGroupMembers=${slice.groupMembers.length}`,
      `fetchedTransactions=${slice.financialTransactions.length}`,
      `fetchedTransactionDetails=${slice.financialTransactionDetails.length}`,
      `fetchedScheduledTransactions=${slice.financialScheduledTransactions.length}`,
      `fetchedScheduledTransactionDetails=${slice.financialScheduledTransactionDetails.length}`,
    ].join(" "),
  );
  const result = await syncRockSlice(prisma, slice, {
    chunkSize,
    onProgress: createProgressLogger(),
  });

  console.log(
    [
      `syncRunId=${result.syncRunId}`,
      `status=${result.status}`,
      `recordsRead=${result.recordsRead}`,
      `recordsWritten=${result.recordsWritten}`,
      `recordsSkipped=${result.recordsSkipped}`,
      `issueCount=${result.issueCount}`,
    ].join(" "),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

function createProgressLogger() {
  const lastLoggedByStage = new Map<string, number>();

  return (event: SyncProgressEvent) => {
    const lastLogged = lastLoggedByStage.get(event.stage) ?? -1;
    const shouldLog =
      event.completed === 0 ||
      event.completed === event.total ||
      event.completed - lastLogged >= 5000;

    if (!shouldLog) {
      return;
    }

    lastLoggedByStage.set(event.stage, event.completed);
    console.log(
      [
        `syncRunId=${event.syncRunId}`,
        `stage=${event.stage}`,
        `completed=${event.completed}`,
        `total=${event.total}`,
      ].join(" "),
    );
  };
}
