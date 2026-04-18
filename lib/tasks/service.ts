import type {
  Prisma,
  PrismaClient,
  StaffTaskPriority,
  StaffTaskStatus,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import { requireAppPermission } from "@/lib/auth/permissions";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";

const DEFAULT_TASK_LIMIT = 20;
const MAX_TASK_LIMIT = 50;

export type StaffTaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: StaffTaskStatus;
  priority: StaffTaskPriority;
  assignedToUserId: string | null;
  personRockId: number | null;
  householdRockId: number | null;
  dueAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateStaffTaskInput = {
  title: string;
  description?: string | null;
  priority?: StaffTaskPriority | null;
  assignedToUserId?: string | null;
  personRockId?: number | null;
  householdRockId?: number | null;
  dueAt?: Date | null;
};

export type UpdateStaffTaskInput = {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: StaffTaskStatus | null;
  priority?: StaffTaskPriority | null;
  assignedToUserId?: string | null;
  dueAt?: Date | null;
};

export type ListStaffTasksInput = {
  limit?: number | null;
  status?: StaffTaskStatus | null;
};

export async function listStaffTasks(
  input: ListStaffTasksInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<StaffTaskRecord[]> {
  requireAppPermission(actor, "tasks:manage");

  return client.staffTask.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: clampLimit(input.limit),
    where: input.status ? { status: input.status } : undefined,
  });
}

export async function createStaffTask(
  input: CreateStaffTaskInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<StaffTaskRecord> {
  requireAppPermission(actor, "tasks:manage");

  const title = normalizeRequiredTitle(input.title);
  const assignedToUserId = normalizeOptionalId(
    input.assignedToUserId,
    "Staff task assignee",
  );
  await validateTaskLinks({ ...input, assignedToUserId }, client);

  return client.staffTask.create({
    data: {
      title,
      description: normalizeOptionalText(input.description),
      priority: input.priority ?? "NORMAL",
      assignedToUserId,
      personRockId: input.personRockId ?? null,
      householdRockId: input.householdRockId ?? null,
      dueAt: input.dueAt ?? null,
    },
  });
}

export async function updateStaffTask(
  input: UpdateStaffTaskInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<StaffTaskRecord> {
  requireAppPermission(actor, "tasks:manage");

  const existing = await client.staffTask.findUnique({
    where: {
      id: input.id,
    },
  });

  if (!existing) {
    throw new GraphQLError("Staff task was not found.", {
      extensions: {
        code: "NOT_FOUND",
      },
    });
  }

  const data: Prisma.StaffTaskUpdateInput = {};

  if (input.title !== undefined) {
    data.title = normalizeRequiredTitle(input.title ?? "");
  }

  if (input.description !== undefined) {
    data.description = normalizeOptionalText(input.description);
  }

  if (input.status) {
    data.status = input.status;
    data.completedAt = input.status === "COMPLETED" ? new Date() : null;
  }

  if (input.priority) {
    data.priority = input.priority;
  }

  if (input.assignedToUserId !== undefined) {
    const assignedToUserId = normalizeOptionalId(
      input.assignedToUserId,
      "Staff task assignee",
    );

    if (assignedToUserId) {
      await validateAssignee(assignedToUserId, client);
    }

    data.assignedTo = assignedToUserId
      ? { connect: { id: assignedToUserId } }
      : { disconnect: true };
  }

  if (input.dueAt !== undefined) {
    data.dueAt = input.dueAt;
  }

  return client.staffTask.update({
    data,
    where: {
      id: input.id,
    },
  });
}

export function clampLimit(limit: number | null | undefined) {
  if (!limit || limit < 1) {
    return DEFAULT_TASK_LIMIT;
  }

  return Math.min(Math.trunc(limit), MAX_TASK_LIMIT);
}

async function validateTaskLinks(
  input: CreateStaffTaskInput,
  client: PrismaClient,
) {
  assertPositiveRockId(input.personRockId, "Staff task personRockId");
  assertPositiveRockId(input.householdRockId, "Staff task householdRockId");

  const [person, household, assignee] = await Promise.all([
    input.personRockId
      ? client.rockPerson.findUnique({
          where: {
            rockId: input.personRockId,
          },
          select: {
            rockId: true,
          },
        })
      : null,
    input.householdRockId
      ? client.rockHousehold.findUnique({
          where: {
            rockId: input.householdRockId,
          },
          select: {
            rockId: true,
          },
        })
      : null,
    input.assignedToUserId
      ? client.appUser.findUnique({
          where: {
            id: input.assignedToUserId,
          },
          select: {
            id: true,
            active: true,
          },
        })
      : null,
  ]);

  if (input.personRockId && !person) {
    throw new GraphQLError("Staff task person link was not found.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  if (input.householdRockId && !household) {
    throw new GraphQLError("Staff task household link was not found.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  if (input.assignedToUserId && !assignee?.active) {
    throwInvalidAssignee();
  }
}

async function validateAssignee(
  assignedToUserId: string,
  client: PrismaClient,
) {
  const assignee = await client.appUser.findUnique({
    where: {
      id: assignedToUserId,
    },
    select: {
      id: true,
      active: true,
    },
  });

  if (!assignee?.active) {
    throwInvalidAssignee();
  }
}

function normalizeRequiredTitle(title: string) {
  const normalized = title.trim();

  if (!normalized) {
    throw new GraphQLError("Staff task title is required.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalId(value: string | null | undefined, label: string) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new GraphQLError(`${label} must be a non-empty id.`, {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return normalized;
}

function assertPositiveRockId(
  value: number | null | undefined,
  fieldName: string,
) {
  if (value !== undefined && value !== null && value <= 0) {
    throw new GraphQLError(`${fieldName} must be a positive Rock id.`, {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }
}

function throwInvalidAssignee(): never {
  throw new GraphQLError("Staff task assignee was not found.", {
    extensions: {
      code: "BAD_USER_INPUT",
    },
  });
}
