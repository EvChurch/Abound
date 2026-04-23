import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type CampusFilterOption = {
  label: string;
  value: string;
};

type CampusOptionsClient = Pick<PrismaClient, "rockCampus">;

export async function getCampusFilterOptions(
  client: CampusOptionsClient = prisma,
): Promise<CampusFilterOption[]> {
  const campuses = await client.rockCampus.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }, { rockId: "asc" }],
    select: {
      active: true,
      name: true,
      rockId: true,
      shortCode: true,
    },
  });

  return campuses.map((campus) => ({
    label: campusLabel(campus),
    value: String(campus.rockId),
  }));
}

function campusLabel(campus: {
  active: boolean;
  name: string;
  shortCode: string | null;
}) {
  const name = campus.shortCode
    ? `${campus.name} (${campus.shortCode})`
    : campus.name;

  return campus.active ? name : `${name} - inactive`;
}
