import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type RecordStatusFilterOption = {
  label: string;
  value: string;
};

type RecordStatusOptionsClient = Pick<PrismaClient, "rockDefinedValue">;

export async function getPersonRecordStatusFilterOptions(
  client: RecordStatusOptionsClient = prisma,
): Promise<RecordStatusFilterOption[]> {
  const statuses = await client.rockDefinedValue.findMany({
    orderBy: [{ order: "asc" }, { value: "asc" }, { rockId: "asc" }],
    select: {
      value: true,
    },
    where: {
      peopleRecordStatuses: {
        some: {},
      },
    },
  });

  const uniqueStatuses = new Map<string, RecordStatusFilterOption>();

  for (const status of statuses) {
    uniqueStatuses.set(status.value, {
      label: status.value,
      value: status.value,
    });
  }

  return Array.from(uniqueStatuses.values());
}
