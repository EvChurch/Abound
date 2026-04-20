import type {
  Prisma,
  PrismaClient,
  SavedListViewDensity,
  SavedListViewResource,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import {
  createEmptyFilter,
  validateFilterDefinition,
} from "@/lib/list-views/filter-schema";

type SavedViewClient = Pick<PrismaClient, "$transaction" | "savedListView">;

export type SavedListViewRecord = {
  id: string;
  resource: SavedListViewResource;
  name: string;
  description: string | null;
  filterDefinition: Prisma.JsonValue;
  sortDefinition: Prisma.JsonValue;
  columnDefinition: Prisma.JsonValue;
  density: SavedListViewDensity;
  pageSize: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SavedListViewInput = {
  resource: SavedListViewResource;
  name: string;
  description?: string | null;
  filterDefinition?: unknown;
  sortDefinition?: unknown;
  columnDefinition?: unknown;
  density?: SavedListViewDensity | null;
  pageSize?: number | null;
  isDefault?: boolean | null;
};

export async function listSavedListViews(
  resource: SavedListViewResource,
  actor: LocalAppUser,
  client: SavedViewClient = prisma,
) {
  return client.savedListView.findMany({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }, { name: "asc" }],
    where: {
      ownerUserId: actor.id,
      resource,
    },
  });
}

export async function getSavedListView(
  id: string,
  actor: LocalAppUser,
  client: SavedViewClient = prisma,
) {
  const savedView = await client.savedListView.findFirst({
    where: {
      id,
      ownerUserId: actor.id,
    },
  });

  if (!savedView) {
    throw new GraphQLError("Saved list view was not found.", {
      extensions: {
        code: "NOT_FOUND",
      },
    });
  }

  revalidateSavedViewFilter(
    savedView.resource,
    savedView.filterDefinition,
    actor,
  );

  return savedView;
}

export async function createSavedListView(
  input: SavedListViewInput,
  actor: LocalAppUser,
  client: SavedViewClient = prisma,
) {
  const data = normalizeSavedListViewInput(input, actor);

  return client.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.savedListView.updateMany({
        data: { isDefault: false },
        where: {
          ownerUserId: actor.id,
          resource: data.resource,
        },
      });
    }

    return tx.savedListView.create({
      data: {
        ...data,
        ownerUserId: actor.id,
      },
    });
  });
}

export async function updateSavedListView(
  id: string,
  input: Partial<SavedListViewInput>,
  actor: LocalAppUser,
  client: SavedViewClient = prisma,
) {
  const existing = await getSavedListView(id, actor, client);
  const data = normalizeSavedListViewInput(
    {
      columnDefinition: existing.columnDefinition,
      density: existing.density,
      description: existing.description,
      filterDefinition: existing.filterDefinition,
      isDefault: existing.isDefault,
      name: existing.name,
      pageSize: existing.pageSize,
      resource: existing.resource,
      sortDefinition: existing.sortDefinition,
      ...input,
    },
    actor,
  );

  return client.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.savedListView.updateMany({
        data: { isDefault: false },
        where: {
          ownerUserId: actor.id,
          resource: data.resource,
          id: {
            not: id,
          },
        },
      });
    }

    return tx.savedListView.update({
      data,
      where: {
        id,
      },
    });
  });
}

export async function deleteSavedListView(
  id: string,
  actor: LocalAppUser,
  client: SavedViewClient = prisma,
) {
  await getSavedListView(id, actor, client);

  await client.savedListView.delete({
    where: {
      id,
    },
  });

  return true;
}

export async function setDefaultSavedListView(
  id: string,
  actor: LocalAppUser,
  client: SavedViewClient = prisma,
) {
  const existing = await getSavedListView(id, actor, client);

  return client.$transaction(async (tx) => {
    await tx.savedListView.updateMany({
      data: { isDefault: false },
      where: {
        ownerUserId: actor.id,
        resource: existing.resource,
      },
    });

    return tx.savedListView.update({
      data: { isDefault: true },
      where: { id },
    });
  });
}

export function revalidateSavedViewFilter(
  resource: SavedListViewResource,
  filterDefinition: unknown,
  actor: LocalAppUser,
) {
  const result = validateFilterDefinition(
    filterDefinition,
    getListViewFilterCatalog(resource, actor.role),
  );

  if (!result.ok) {
    throw new GraphQLError(
      "Saved list view is no longer valid for this role.",
      {
        extensions: {
          code: "FORBIDDEN",
          validationErrors: result.errors,
        },
      },
    );
  }

  return result.definition;
}

function normalizeSavedListViewInput(
  input: SavedListViewInput,
  actor: LocalAppUser,
) {
  const name = input.name.trim();

  if (!name) {
    throw new GraphQLError("Saved list view name is required.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  const filterDefinition = normalizeFilter(input, actor);
  const pageSize = input.pageSize ?? 50;

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new GraphQLError("Saved list view page size must be 1-100.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return {
    columnDefinition: jsonObject(input.columnDefinition ?? { columns: [] }),
    density: input.density ?? "COMFORTABLE",
    description: input.description?.trim() || null,
    filterDefinition: jsonObject(filterDefinition),
    isDefault: input.isDefault ?? false,
    name,
    pageSize,
    resource: input.resource,
    sortDefinition: jsonObject(
      input.sortDefinition ?? { field: "rockId", direction: "ASC" },
    ),
    visibility: "PRIVATE" as const,
  };
}

function normalizeFilter(input: SavedListViewInput, actor: LocalAppUser) {
  const filterDefinition = input.filterDefinition ?? createEmptyFilter();
  const result = validateFilterDefinition(
    filterDefinition,
    getListViewFilterCatalog(input.resource, actor.role),
  );

  if (!result.ok) {
    throw new GraphQLError("Saved list view filter is invalid.", {
      extensions: {
        code: "BAD_USER_INPUT",
        validationErrors: result.errors,
      },
    });
  }

  return result.definition;
}

function jsonObject(value: unknown): Prisma.InputJsonValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new GraphQLError("Saved list view JSON fields must be objects.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return value as Prisma.InputJsonObject;
}
