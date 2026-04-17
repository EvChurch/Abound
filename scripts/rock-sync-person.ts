import "dotenv/config";

import { RockClient } from "@/lib/rock/client";
import { prisma } from "@/lib/db/prisma";
import { syncRockPersonSlice } from "@/lib/sync/run-sync";

const personId = Number(process.argv[2]);

if (!Number.isInteger(personId) || personId <= 0) {
  console.error("Usage: pnpm rock:sync-person <rock-person-id>");
  process.exit(1);
}

const baseUrl = process.env.ROCK_BASE_URL;
const restKey = process.env.ROCK_REST_KEY;

if (!baseUrl || !restKey) {
  console.error("ROCK_BASE_URL and ROCK_REST_KEY are required.");
  process.exit(1);
}

async function main() {
  const client = new RockClient({ baseUrl: baseUrl!, restKey: restKey! });
  const slice = await client.getPersonSlice(personId);
  const result = await syncRockPersonSlice(prisma, slice);

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

  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  await prisma.$disconnect();
  process.exit(1);
});
