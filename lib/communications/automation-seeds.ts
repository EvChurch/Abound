import type { PrismaClient } from "@prisma/client";

import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import {
  createSavedListView,
  listSavedListViews,
} from "@/lib/list-views/saved-views";
import type { FilterDefinition } from "@/lib/list-views/filter-schema";

export const JOINING_NEVER_GIVEN_VIEW_NAME = "Joining - Never Given";

type AutomationSeedsClient = Pick<
  PrismaClient,
  "$transaction" | "savedListView"
>;

export function joiningNeverGivenFilter(): FilterDefinition {
  return {
    conditions: [
      {
        field: "connectionStatus",
        operator: "EQUALS",
        type: "condition",
        value: "Joining",
      },
      {
        field: "lifecycle",
        operator: "EQUALS",
        type: "condition",
        value: "NEVER_GIVEN",
      },
    ],
    mode: "all",
    type: "group",
  };
}

export async function ensureJoiningNeverGivenSavedView(
  actor: LocalAppUser,
  client: AutomationSeedsClient = prisma,
) {
  const existing = await listSavedListViews("PEOPLE", actor, client).then(
    (views) =>
      views.find((view) => view.name === JOINING_NEVER_GIVEN_VIEW_NAME),
  );

  if (existing) {
    return existing;
  }

  return createSavedListView(
    {
      description:
        "People whose Rock connection status is Joining and giving lifecycle is Never Given.",
      filterDefinition: joiningNeverGivenFilter(),
      name: JOINING_NEVER_GIVEN_VIEW_NAME,
      resource: "PEOPLE",
    },
    actor,
    client,
  );
}
