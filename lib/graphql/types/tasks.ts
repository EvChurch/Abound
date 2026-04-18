import type { StaffTaskPriority, StaffTaskStatus } from "@prisma/client";
import { GraphQLError } from "graphql";

import { builder } from "@/lib/graphql/builder";
import { requirePermission } from "@/lib/graphql/context";
import {
  createStaffTask,
  listStaffTasks,
  updateStaffTask,
  type StaffTaskRecord,
} from "@/lib/tasks/service";

const staffTaskStatusEnum = builder.enumType("StaffTaskStatus", {
  values: ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const,
});

const staffTaskPriorityEnum = builder.enumType("StaffTaskPriority", {
  values: ["LOW", "NORMAL", "HIGH", "URGENT"] as const,
});

const staffTaskType = builder
  .objectRef<StaffTaskRecord>("StaffTask")
  .implement({
    fields: (t) => ({
      id: t.exposeString("id"),
      title: t.exposeString("title"),
      description: t.exposeString("description", { nullable: true }),
      status: t.field({
        type: staffTaskStatusEnum,
        resolve: (task) => task.status,
      }),
      priority: t.field({
        type: staffTaskPriorityEnum,
        resolve: (task) => task.priority,
      }),
      assignedToUserId: t.exposeString("assignedToUserId", { nullable: true }),
      personRockId: t.exposeInt("personRockId", { nullable: true }),
      householdRockId: t.exposeInt("householdRockId", { nullable: true }),
      dueAt: t.string({
        nullable: true,
        resolve: (task) => task.dueAt?.toISOString() ?? null,
      }),
      completedAt: t.string({
        nullable: true,
        resolve: (task) => task.completedAt?.toISOString() ?? null,
      }),
      createdAt: t.string({
        resolve: (task) => task.createdAt.toISOString(),
      }),
      updatedAt: t.string({
        resolve: (task) => task.updatedAt.toISOString(),
      }),
    }),
  });

export function registerTaskTypes() {
  builder.queryField("staffTasks", (t) =>
    t.field({
      nullable: true,
      args: {
        limit: t.arg.int(),
        status: t.arg({ required: false, type: staffTaskStatusEnum }),
      },
      type: [staffTaskType],
      resolve: (_root, args, context) => {
        const actor = requirePermission(context, "tasks:manage");

        return listStaffTasks(
          {
            limit: args.limit,
            status: args.status as StaffTaskStatus | null | undefined,
          },
          actor,
        );
      },
    }),
  );

  builder.mutationField("createStaffTask", (t) =>
    t.field({
      nullable: true,
      args: {
        title: t.arg.string({ required: true }),
        description: t.arg.string(),
        priority: t.arg({ required: false, type: staffTaskPriorityEnum }),
        assignedToUserId: t.arg.string(),
        personRockId: t.arg.int(),
        householdRockId: t.arg.int(),
        dueAt: t.arg.string(),
      },
      type: staffTaskType,
      resolve: (_root, args, context) => {
        const actor = requirePermission(context, "tasks:manage");

        return createStaffTask(
          {
            title: args.title,
            description: args.description,
            priority: args.priority as StaffTaskPriority | null | undefined,
            assignedToUserId: args.assignedToUserId,
            personRockId: args.personRockId,
            householdRockId: args.householdRockId,
            dueAt: parseOptionalDate(args.dueAt),
          },
          actor,
        );
      },
    }),
  );

  builder.mutationField("updateStaffTask", (t) =>
    t.field({
      args: {
        id: t.arg.string({ required: true }),
        title: t.arg.string(),
        description: t.arg.string(),
        status: t.arg({ required: false, type: staffTaskStatusEnum }),
        priority: t.arg({ required: false, type: staffTaskPriorityEnum }),
        assignedToUserId: t.arg.string(),
        dueAt: t.arg.string(),
      },
      type: staffTaskType,
      resolve: (_root, args, context) => {
        const actor = requirePermission(context, "tasks:manage");

        return updateStaffTask(
          {
            id: args.id,
            title: args.title,
            description: args.description,
            status: args.status as StaffTaskStatus | null | undefined,
            priority: args.priority as StaffTaskPriority | null | undefined,
            assignedToUserId: args.assignedToUserId,
            dueAt: parseOptionalDate(args.dueAt),
          },
          actor,
        );
      },
    }),
  );
}

function parseOptionalDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new GraphQLError("Date values must be valid ISO date strings.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return date;
}
