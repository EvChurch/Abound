import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type ConnectionStatusFilterOption = {
  label: string;
  value: string;
};

type ConnectionStatusOptionsClient = Pick<PrismaClient, "rockDefinedValue">;

export async function getPersonConnectionStatusFilterOptions(
  client: ConnectionStatusOptionsClient = prisma,
): Promise<ConnectionStatusFilterOption[]> {
  const statuses = await client.rockDefinedValue.findMany({
    orderBy: [{ order: "asc" }, { value: "asc" }, { rockId: "asc" }],
    select: {
      value: true,
    },
    where: {
      peopleConnectionStatuses: {
        some: {},
      },
    },
  });

  const uniqueStatuses = new Map<string, ConnectionStatusFilterOption>();

  for (const status of statuses) {
    uniqueStatuses.set(status.value, {
      label: status.value,
      value: status.value,
    });
  }

  return Array.from(uniqueStatuses.values());
}
