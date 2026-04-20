import type {
  SavedListViewDensity,
  SavedListViewResource,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import { requireStaffUser } from "@/lib/graphql/context";
import { builder } from "@/lib/graphql/builder";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import {
  listHouseholds,
  type HouseholdListRow,
  type HouseholdsConnection,
} from "@/lib/list-views/households-list";
import {
  listPeople,
  type PeopleConnection,
  type PersonListRow,
} from "@/lib/list-views/people-list";
import {
  createSavedListView,
  deleteSavedListView,
  listSavedListViews,
  setDefaultSavedListView,
  updateSavedListView,
  type SavedListViewRecord,
} from "@/lib/list-views/saved-views";
import type { FilterFieldDefinition } from "@/lib/list-views/filter-schema";

export const listViewResourceEnum = builder.enumType("ListViewResource", {
  values: ["PEOPLE", "HOUSEHOLDS"] as const,
});

const savedListViewDensityEnum = builder.enumType("SavedListViewDensity", {
  values: ["COMFORTABLE", "COMPACT"] as const,
});

const filterFieldDefinitionType = builder
  .objectRef<FilterFieldDefinition>("ListViewFilterField")
  .implement({
    fields: (t) => ({
      fieldType: t.exposeString("fieldType"),
      id: t.exposeString("id"),
      label: t.exposeString("label"),
      operators: t.stringList({
        resolve: (field) => field.operators,
      }),
      permission: t.exposeString("permission", { nullable: true }),
      resource: t.exposeString("resource"),
    }),
  });

const savedListViewType = builder
  .objectRef<SavedListViewRecord>("SavedListView")
  .implement({
    fields: (t) => ({
      columnDefinitionJson: t.string({
        resolve: (view) => JSON.stringify(view.columnDefinition),
      }),
      createdAt: t.string({
        resolve: (view) => view.createdAt.toISOString(),
      }),
      density: t.exposeString("density"),
      description: t.exposeString("description", { nullable: true }),
      filterDefinitionJson: t.string({
        resolve: (view) => JSON.stringify(view.filterDefinition),
      }),
      id: t.exposeString("id"),
      isDefault: t.exposeBoolean("isDefault"),
      name: t.exposeString("name"),
      pageSize: t.exposeInt("pageSize"),
      resource: t.exposeString("resource"),
      sortDefinitionJson: t.string({
        resolve: (view) => JSON.stringify(view.sortDefinition),
      }),
      updatedAt: t.string({
        resolve: (view) => view.updatedAt.toISOString(),
      }),
    }),
  });

const listCampusType = builder
  .objectRef<NonNullable<PersonListRow["primaryCampus"]>>("ListCampus")
  .implement({
    fields: (t) => ({
      name: t.exposeString("name"),
      rockId: t.exposeInt("rockId"),
      shortCode: t.exposeString("shortCode", { nullable: true }),
    }),
  });

const listHouseholdSummaryType = builder
  .objectRef<
    NonNullable<PersonListRow["primaryHousehold"]>
  >("ListHouseholdSummary")
  .implement({
    fields: (t) => ({
      active: t.exposeBoolean("active"),
      archived: t.exposeBoolean("archived"),
      name: t.exposeString("name"),
      rockId: t.exposeInt("rockId"),
    }),
  });

const listLifecycleLabelType = builder
  .objectRef<PersonListRow["lifecycle"][number]>("ListLifecycleLabel")
  .implement({
    fields: (t) => ({
      lifecycle: t.exposeString("lifecycle"),
      summary: t.exposeString("summary"),
      windowEndedAt: t.string({
        resolve: (label) => label.windowEndedAt.toISOString(),
      }),
    }),
  });

const listGivingSummaryType = builder
  .objectRef<NonNullable<PersonListRow["givingSummary"]>>("ListGivingSummary")
  .implement({
    fields: (t) => ({
      lastGiftAmount: t.exposeString("lastGiftAmount", { nullable: true }),
      lastGiftAt: t.string({
        nullable: true,
        resolve: (summary) => summary.lastGiftAt?.toISOString() ?? null,
      }),
      lastTwelveMonthsTotal: t.exposeString("lastTwelveMonthsTotal"),
      monthsWithGiving: t.exposeInt("monthsWithGiving"),
      sourceExplanation: t.exposeString("sourceExplanation"),
      totalGiven: t.exposeString("totalGiven"),
    }),
  });

const personListRowType = builder
  .objectRef<PersonListRow>("PersonListRow")
  .implement({
    fields: (t) => ({
      amountsHidden: t.exposeBoolean("amountsHidden"),
      deceased: t.exposeBoolean("deceased"),
      displayName: t.exposeString("displayName"),
      email: t.exposeString("email", { nullable: true }),
      emailActive: t.exposeBoolean("emailActive", { nullable: true }),
      givingSummary: t.field({
        nullable: true,
        type: listGivingSummaryType,
        resolve: (row) => row.givingSummary,
      }),
      lastSyncedAt: t.string({
        resolve: (row) => row.lastSyncedAt.toISOString(),
      }),
      lifecycle: t.field({
        type: [listLifecycleLabelType],
        resolve: (row) => row.lifecycle,
      }),
      openTaskCount: t.exposeInt("openTaskCount"),
      photoUrl: t.exposeString("photoUrl", { nullable: true }),
      primaryCampus: t.field({
        nullable: true,
        type: listCampusType,
        resolve: (row) => row.primaryCampus,
      }),
      primaryHousehold: t.field({
        nullable: true,
        type: listHouseholdSummaryType,
        resolve: (row) => row.primaryHousehold,
      }),
      rockId: t.exposeInt("rockId"),
    }),
  });

const householdPrimaryContactType = builder
  .objectRef<
    HouseholdListRow["primaryContacts"][number]
  >("HouseholdPrimaryContact")
  .implement({
    fields: (t) => ({
      displayName: t.exposeString("displayName"),
      email: t.exposeString("email", { nullable: true }),
      rockId: t.exposeInt("rockId"),
    }),
  });

const householdListRowType = builder
  .objectRef<HouseholdListRow>("HouseholdListRow")
  .implement({
    fields: (t) => ({
      active: t.exposeBoolean("active"),
      amountsHidden: t.exposeBoolean("amountsHidden"),
      archived: t.exposeBoolean("archived"),
      campus: t.field({
        nullable: true,
        type: listCampusType,
        resolve: (row) => row.campus,
      }),
      givingSummary: t.field({
        nullable: true,
        type: listGivingSummaryType,
        resolve: (row) => row.givingSummary,
      }),
      lastSyncedAt: t.string({
        resolve: (row) => row.lastSyncedAt.toISOString(),
      }),
      lifecycle: t.field({
        type: [listLifecycleLabelType],
        resolve: (row) => row.lifecycle,
      }),
      memberCount: t.exposeInt("memberCount"),
      name: t.exposeString("name"),
      openTaskCount: t.exposeInt("openTaskCount"),
      primaryContacts: t.field({
        type: [householdPrimaryContactType],
        resolve: (row) => row.primaryContacts,
      }),
      rockId: t.exposeInt("rockId"),
    }),
  });

const appliedListViewType = builder
  .objectRef<PeopleConnection["appliedView"]>("AppliedListView")
  .implement({
    fields: (t) => ({
      id: t.exposeString("id", { nullable: true }),
      name: t.exposeString("name"),
      pageSize: t.exposeInt("pageSize"),
    }),
  });

const pageInfoType = builder
  .objectRef<PeopleConnection["pageInfo"]>("PageInfo")
  .implement({
    fields: (t) => ({
      endCursor: t.exposeString("endCursor", { nullable: true }),
      hasNextPage: t.exposeBoolean("hasNextPage"),
    }),
  });

const personEdgeType = builder
  .objectRef<PeopleConnection["edges"][number]>("PersonListEdge")
  .implement({
    fields: (t) => ({
      cursor: t.exposeString("cursor"),
      node: t.field({
        type: personListRowType,
        resolve: (edge) => edge.node,
      }),
    }),
  });

const householdEdgeType = builder
  .objectRef<HouseholdsConnection["edges"][number]>("HouseholdListEdge")
  .implement({
    fields: (t) => ({
      cursor: t.exposeString("cursor"),
      node: t.field({
        type: householdListRowType,
        resolve: (edge) => edge.node,
      }),
    }),
  });

const peopleConnectionType = builder
  .objectRef<PeopleConnection>("PeopleConnection")
  .implement({
    fields: (t) => ({
      appliedView: t.field({
        type: appliedListViewType,
        resolve: (connection) => connection.appliedView,
      }),
      edges: t.field({
        type: [personEdgeType],
        resolve: (connection) => connection.edges,
      }),
      pageInfo: t.field({
        type: pageInfoType,
        resolve: (connection) => connection.pageInfo,
      }),
    }),
  });

const householdsConnectionType = builder
  .objectRef<HouseholdsConnection>("HouseholdsConnection")
  .implement({
    fields: (t) => ({
      appliedView: t.field({
        type: appliedListViewType,
        resolve: (connection) => connection.appliedView,
      }),
      edges: t.field({
        type: [householdEdgeType],
        resolve: (connection) => connection.edges,
      }),
      pageInfo: t.field({
        type: pageInfoType,
        resolve: (connection) => connection.pageInfo,
      }),
    }),
  });

export function registerListViewTypes() {
  builder.queryField("listViewFilterCatalog", (t) =>
    t.field({
      args: {
        resource: t.arg({ required: true, type: listViewResourceEnum }),
      },
      type: [filterFieldDefinitionType],
      resolve: (_root, args, context) => {
        const user = requireStaffUser(context);

        return getListViewFilterCatalog(args.resource, user.role);
      },
    }),
  );

  builder.queryField("peopleListView", (t) =>
    t.field({
      args: listArgs(t),
      type: peopleConnectionType,
      resolve: (_root, args, context) => {
        const user = requireStaffUser(context);

        return listPeople(
          {
            after: args.after,
            filterDefinition: parseOptionalJson(args.filterDefinitionJson),
            first: args.first,
            savedViewId: args.savedViewId,
          },
          user,
        );
      },
    }),
  );

  builder.queryField("householdsListView", (t) =>
    t.field({
      args: listArgs(t),
      type: householdsConnectionType,
      resolve: (_root, args, context) => {
        const user = requireStaffUser(context);

        return listHouseholds(
          {
            after: args.after,
            filterDefinition: parseOptionalJson(args.filterDefinitionJson),
            first: args.first,
            savedViewId: args.savedViewId,
          },
          user,
        );
      },
    }),
  );

  builder.queryField("savedListViews", (t) =>
    t.field({
      args: {
        resource: t.arg({ required: true, type: listViewResourceEnum }),
      },
      type: [savedListViewType],
      resolve: (_root, args, context) => {
        const user = requireStaffUser(context);

        return listSavedListViews(args.resource, user);
      },
    }),
  );

  builder.mutationField("createSavedListView", (t) =>
    t.field({
      args: {
        columnDefinitionJson: t.arg.string(),
        density: t.arg({ type: savedListViewDensityEnum }),
        description: t.arg.string(),
        filterDefinitionJson: t.arg.string(),
        isDefault: t.arg.boolean(),
        name: t.arg.string({ required: true }),
        pageSize: t.arg.int(),
        resource: t.arg({ required: true, type: listViewResourceEnum }),
        sortDefinitionJson: t.arg.string(),
      },
      type: savedListViewType,
      resolve: (_root, args, context) => {
        const user = requireStaffUser(context);

        return createSavedListView(
          {
            columnDefinition: parseOptionalJson(args.columnDefinitionJson),
            density: args.density as SavedListViewDensity | null | undefined,
            description: args.description,
            filterDefinition: parseOptionalJson(args.filterDefinitionJson),
            isDefault: args.isDefault,
            name: args.name ?? "",
            pageSize: args.pageSize,
            resource: args.resource as SavedListViewResource,
            sortDefinition: parseOptionalJson(args.sortDefinitionJson),
          },
          user,
        );
      },
    }),
  );

  builder.mutationField("updateSavedListView", (t) =>
    t.field({
      args: {
        columnDefinitionJson: t.arg.string(),
        density: t.arg({ type: savedListViewDensityEnum }),
        description: t.arg.string(),
        filterDefinitionJson: t.arg.string(),
        id: t.arg.string({ required: true }),
        isDefault: t.arg.boolean(),
        name: t.arg.string(),
        pageSize: t.arg.int(),
        sortDefinitionJson: t.arg.string(),
      },
      type: savedListViewType,
      resolve: (_root, args, context) => {
        const user = requireStaffUser(context);

        return updateSavedListView(
          args.id,
          {
            columnDefinition: parseOptionalJson(args.columnDefinitionJson),
            density: args.density as SavedListViewDensity | null | undefined,
            description: args.description,
            filterDefinition: parseOptionalJson(args.filterDefinitionJson),
            isDefault: args.isDefault,
            name: args.name ?? undefined,
            pageSize: args.pageSize,
            sortDefinition: parseOptionalJson(args.sortDefinitionJson),
          },
          user,
        );
      },
    }),
  );

  builder.mutationField("deleteSavedListView", (t) =>
    t.boolean({
      args: {
        id: t.arg.string({ required: true }),
      },
      resolve: (_root, args, context) => {
        const user = requireStaffUser(context);

        return deleteSavedListView(args.id, user);
      },
    }),
  );

  builder.mutationField("setDefaultSavedListView", (t) =>
    t.field({
      args: {
        id: t.arg.string({ required: true }),
      },
      type: savedListViewType,
      resolve: (_root, args, context) => {
        const user = requireStaffUser(context);

        return setDefaultSavedListView(args.id, user);
      },
    }),
  );
}

function listArgs(t: Parameters<Parameters<typeof builder.queryField>[1]>[0]) {
  return {
    after: t.arg.string(),
    filterDefinitionJson: t.arg.string(),
    first: t.arg.int(),
    savedViewId: t.arg.string(),
  };
}

function parseOptionalJson(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new GraphQLError("JSON input is invalid.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }
}
