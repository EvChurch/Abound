import type {
  CommunicationPrepStatus,
  SavedListViewResource,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import { requirePermission } from "@/lib/graphql/context";
import { builder } from "@/lib/graphql/builder";
import { listViewResourceEnum } from "@/lib/graphql/types/list-views";
import {
  audiencePreviewFromRecord,
  createCommunicationPrep,
  listCommunicationPreps,
  updateCommunicationPrep,
  type CommunicationPrepRecord,
} from "@/lib/communications/prep";
import type { CommunicationAudienceMember } from "@/lib/communications/segments";

const communicationPrepStatusEnum = builder.enumType(
  "CommunicationPrepStatus",
  {
    values: [
      "DRAFT",
      "READY_FOR_REVIEW",
      "APPROVED",
      "HANDED_OFF",
      "CANCELED",
    ] as const,
  },
);

const communicationAudienceMemberType = builder
  .objectRef<CommunicationAudienceMember>("CommunicationAudienceMember")
  .implement({
    fields: (t) => ({
      campusName: t.exposeString("campusName", { nullable: true }),
      contactReady: t.exposeBoolean("contactReady"),
      contactState: t.exposeString("contactState"),
      displayName: t.exposeString("displayName"),
      email: t.exposeString("email", { nullable: true }),
      explanation: t.exposeString("explanation"),
      householdName: t.exposeString("householdName", { nullable: true }),
      resource: t.exposeString("resource"),
      rockId: t.exposeInt("rockId"),
    }),
  });

const communicationPrepType = builder
  .objectRef<CommunicationPrepRecord>("CommunicationPrep")
  .implement({
    fields: (t) => ({
      approvedAt: t.string({
        nullable: true,
        resolve: (prep) => prep.approvedAt?.toISOString() ?? null,
      }),
      audiencePreview: t.field({
        type: [communicationAudienceMemberType],
        resolve: audiencePreviewFromRecord,
      }),
      audienceResource: t.exposeString("audienceResource"),
      audienceSize: t.exposeInt("audienceSize"),
      audienceTruncated: t.exposeBoolean("audienceTruncated"),
      canceledAt: t.string({
        nullable: true,
        resolve: (prep) => prep.canceledAt?.toISOString() ?? null,
      }),
      createdAt: t.string({
        resolve: (prep) => prep.createdAt.toISOString(),
      }),
      createdByUserId: t.exposeString("createdByUserId", { nullable: true }),
      handedOffAt: t.string({
        nullable: true,
        resolve: (prep) => prep.handedOffAt?.toISOString() ?? null,
      }),
      handoffTarget: t.exposeString("handoffTarget", { nullable: true }),
      householdRockId: t.exposeInt("householdRockId", { nullable: true }),
      id: t.exposeString("id"),
      personRockId: t.exposeInt("personRockId", { nullable: true }),
      readyForReviewAt: t.string({
        nullable: true,
        resolve: (prep) => prep.readyForReviewAt?.toISOString() ?? null,
      }),
      reviewNotes: t.exposeString("reviewNotes", { nullable: true }),
      savedListViewId: t.exposeString("savedListViewId", { nullable: true }),
      segmentDefinitionJson: t.string({
        resolve: (prep) => JSON.stringify(prep.segmentDefinition),
      }),
      segmentSummary: t.exposeString("segmentSummary"),
      status: t.field({
        type: communicationPrepStatusEnum,
        resolve: (prep) => prep.status,
      }),
      title: t.exposeString("title"),
      updatedAt: t.string({
        resolve: (prep) => prep.updatedAt.toISOString(),
      }),
    }),
  });

export function registerCommunicationTypes() {
  builder.queryField("communicationPreps", (t) =>
    t.field({
      args: {
        limit: t.arg.int(),
        status: t.arg({ required: false, type: communicationPrepStatusEnum }),
      },
      type: [communicationPrepType],
      resolve: (_root, args, context) => {
        const actor = requirePermission(context, "communications:manage");

        return listCommunicationPreps(
          {
            limit: args.limit,
            status: args.status as CommunicationPrepStatus | null | undefined,
          },
          actor,
        );
      },
    }),
  );

  builder.mutationField("createCommunicationPrep", (t) =>
    t.field({
      args: {
        filterDefinitionJson: t.arg.string(),
        handoffTarget: t.arg.string(),
        householdRockId: t.arg.int(),
        personRockId: t.arg.int(),
        resource: t.arg({ required: true, type: listViewResourceEnum }),
        reviewNotes: t.arg.string(),
        savedViewId: t.arg.string(),
        title: t.arg.string({ required: true }),
      },
      type: communicationPrepType,
      resolve: (_root, args, context) => {
        const actor = requirePermission(context, "communications:manage");

        return createCommunicationPrep(
          {
            filterDefinition: parseOptionalJson(args.filterDefinitionJson),
            handoffTarget: args.handoffTarget,
            householdRockId: args.householdRockId,
            personRockId: args.personRockId,
            resource: args.resource as SavedListViewResource,
            reviewNotes: args.reviewNotes,
            savedViewId: args.savedViewId,
            title: args.title,
          },
          actor,
        );
      },
    }),
  );

  builder.mutationField("updateCommunicationPrep", (t) =>
    t.field({
      args: {
        handoffTarget: t.arg.string(),
        id: t.arg.string({ required: true }),
        reviewNotes: t.arg.string(),
        status: t.arg({ required: false, type: communicationPrepStatusEnum }),
        title: t.arg.string(),
      },
      type: communicationPrepType,
      resolve: (_root, args, context) => {
        const actor = requirePermission(context, "communications:manage");

        return updateCommunicationPrep(
          {
            handoffTarget: args.handoffTarget,
            id: args.id,
            reviewNotes: args.reviewNotes,
            status: args.status as CommunicationPrepStatus | null | undefined,
            title: args.title,
          },
          actor,
        );
      },
    }),
  );
}

function parseOptionalJson(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new GraphQLError("Filter definition JSON is invalid.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }
}
