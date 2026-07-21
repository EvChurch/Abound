import type {
  CommunicationAutomationRecipientEventType,
  CommunicationAutomationRecipientStatus,
  CommunicationAutomationRunStatus,
  CommunicationPrepStatus,
  SavedListViewResource,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import { requireStaffUser } from "@/lib/graphql/context";
import { builder } from "@/lib/graphql/builder";
import { listViewResourceEnum } from "@/lib/graphql/types/list-views";
import {
  excludeAutomationRecipient,
  type ExcludeAutomationRecipientInput,
} from "@/lib/communications/automation-runs";
import {
  activationReadinessIssues,
  createJoiningNeverGivenAutomation,
  getCommunicationAutomation,
  listCommunicationAutomations,
  updateCommunicationAutomationTemplate,
  type CommunicationAutomationRecord,
} from "@/lib/communications/automations";
import {
  audiencePreviewFromRecord,
  createCommunicationPrep,
  listCommunicationPreps,
  updateCommunicationPrep,
  type CommunicationPrepRecord,
} from "@/lib/communications/prep";
import type { CommunicationAudienceMember } from "@/lib/communications/segments";
import {
  renderCommunicationTemplate,
  type CommunicationTemplateFieldValues,
} from "@/lib/communications/templates";

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

const communicationAutomationRunStatusEnum = builder.enumType(
  "CommunicationAutomationRunStatus",
  {
    values: [
      "PENDING_NOTICE",
      "NOTICE_SENT",
      "READY_TO_SEND",
      "SENDING",
      "SENT",
      "PARTIAL",
      "SKIPPED",
      "FAILED",
      "CANCELED",
    ] as const,
  },
);

const communicationAutomationRecipientStatusEnum = builder.enumType(
  "CommunicationAutomationRecipientStatus",
  {
    values: [
      "PENDING",
      "READY",
      "SUPPRESSED",
      "SKIPPED",
      "EXCLUDED",
      "ACCEPTED",
      "DELIVERED",
      "FAILED",
      "BOUNCED",
      "COMPLAINED",
      "DELAYED",
    ] as const,
  },
);

const communicationAutomationRecipientEventTypeEnum = builder.enumType(
  "CommunicationAutomationRecipientEventType",
  {
    values: [
      "CREATED",
      "SKIPPED",
      "EXCLUDED",
      "SEND_REQUESTED",
      "PROVIDER_ACCEPTED",
      "DELIVERED",
      "FAILED",
      "BOUNCED",
      "COMPLAINED",
      "DELAYED",
      "CLICKED",
      "OPENED",
      "RECEIVED",
      "SCHEDULED",
      "SUPPRESSED",
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

const communicationAutomationReviewerType = builder
  .objectRef<
    CommunicationAutomationRecord["reviewers"][number]
  >("CommunicationAutomationReviewer")
  .implement({
    fields: (t) => ({
      email: t.string({
        nullable: true,
        resolve: (reviewer) => reviewer.reviewer.email,
      }),
      id: t.exposeString("id"),
      name: t.string({
        nullable: true,
        resolve: (reviewer) => reviewer.reviewer.name,
      }),
      reviewerUserId: t.exposeString("reviewerUserId"),
    }),
  });

const communicationAutomationRecipientType = builder
  .objectRef<
    CommunicationAutomationRecord["runs"][number]["recipients"][number]
  >("CommunicationAutomationRecipient")
  .implement({
    fields: (t) => ({
      contactState: t.exposeString("contactState"),
      displayNameSnapshot: t.exposeString("displayNameSnapshot"),
      emailSnapshot: t.exposeString("emailSnapshot", { nullable: true }),
      exclusionReason: t.exposeString("exclusionReason", { nullable: true }),
      id: t.exposeString("id"),
      recipientKey: t.exposeString("recipientKey"),
      skipReason: t.exposeString("skipReason", { nullable: true }),
      status: t.field({
        type: communicationAutomationRecipientStatusEnum,
        resolve: (recipient) =>
          recipient.status as CommunicationAutomationRecipientStatus,
      }),
    }),
  });

const communicationAutomationRecipientEventType = builder
  .objectRef<
    CommunicationAutomationRecord["runs"][number]["events"][number]
  >("CommunicationAutomationRecipientEvent")
  .implement({
    fields: (t) => ({
      eventType: t.field({
        type: communicationAutomationRecipientEventTypeEnum,
        resolve: (event) =>
          event.eventType as CommunicationAutomationRecipientEventType,
      }),
      id: t.exposeString("id"),
      metadataJson: t.string({
        nullable: true,
        resolve: (event) =>
          event.metadata ? JSON.stringify(event.metadata) : null,
      }),
      occurredAt: t.string({
        resolve: (event) => event.occurredAt.toISOString(),
      }),
      providerEventId: t.exposeString("providerEventId", { nullable: true }),
      providerMessageId: t.exposeString("providerMessageId", {
        nullable: true,
      }),
      recipientId: t.exposeString("recipientId"),
      summary: t.exposeString("summary"),
    }),
  });

const communicationAutomationRunType = builder
  .objectRef<
    CommunicationAutomationRecord["runs"][number]
  >("CommunicationAutomationRun")
  .implement({
    fields: (t) => ({
      deliverableCount: t.exposeInt("deliverableCount"),
      excludedCount: t.exposeInt("excludedCount"),
      events: t.field({
        type: [communicationAutomationRecipientEventType],
        resolve: (run) => run.events,
      }),
      failedCount: t.exposeInt("failedCount"),
      id: t.exposeString("id"),
      noticeDueAt: t.string({
        resolve: (run) => run.noticeDueAt.toISOString(),
      }),
      recipientCount: t.exposeInt("recipientCount"),
      recipients: t.field({
        type: [communicationAutomationRecipientType],
        resolve: (run) => run.recipients,
      }),
      scheduledSendAt: t.string({
        resolve: (run) => run.scheduledSendAt.toISOString(),
      }),
      skippedCount: t.exposeInt("skippedCount"),
      status: t.field({
        type: communicationAutomationRunStatusEnum,
        resolve: (run) => run.status as CommunicationAutomationRunStatus,
      }),
    }),
  });

const communicationAutomationType = builder
  .objectRef<CommunicationAutomationRecord>("CommunicationAutomation")
  .implement({
    fields: (t) => ({
      activationReadinessIssues: t.stringList({
        resolve: activationReadinessIssues,
      }),
      cooldownDays: t.exposeInt("cooldownDays", { nullable: true }),
      id: t.exposeString("id"),
      name: t.exposeString("name"),
      preSendNoticeMinutes: t.exposeInt("preSendNoticeMinutes"),
      reviewers: t.field({
        type: [communicationAutomationReviewerType],
        resolve: (automation) => automation.reviewers,
      }),
      runs: t.field({
        type: [communicationAutomationRunType],
        resolve: (automation) => automation.runs,
      }),
      savedListViewId: t.exposeString("savedListViewId"),
      savedListViewName: t.string({
        resolve: (automation) => automation.savedListView.name,
      }),
      scheduleCron: t.exposeString("scheduleCron"),
      scheduleTimezone: t.exposeString("scheduleTimezone"),
      segmentSummary: t.exposeString("segmentSummary"),
      suppressionMode: t.exposeString("suppressionMode"),
      templateFieldsJson: t.string({
        resolve: (automation) => JSON.stringify(automation.templateFields),
      }),
      templateKey: t.exposeString("templateKey"),
    }),
  });

const communicationTemplatePreviewType = builder
  .objectRef<{
    html: string;
    previewText: string;
    subject: string;
    text: string;
  }>("CommunicationTemplatePreview")
  .implement({
    fields: (t) => ({
      html: t.exposeString("html"),
      previewText: t.exposeString("previewText"),
      subject: t.exposeString("subject"),
      text: t.exposeString("text"),
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
        const actor = requireStaffUser(context);

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

  builder.queryField("communicationAutomations", (t) =>
    t.field({
      args: {
        limit: t.arg.int(),
      },
      type: [communicationAutomationType],
      resolve: (_root, args, context) => {
        const actor = requireStaffUser(context);

        return listCommunicationAutomations({ limit: args.limit }, actor);
      },
    }),
  );

  builder.queryField("communicationAutomation", (t) =>
    t.field({
      args: {
        id: t.arg.string({ required: true }),
      },
      nullable: true,
      type: communicationAutomationType,
      resolve: (_root, args, context) => {
        const actor = requireStaffUser(context);

        return getCommunicationAutomation(args.id, actor);
      },
    }),
  );

  builder.queryField("communicationTemplatePreview", (t) =>
    t.field({
      args: {
        fieldsJson: t.arg.string(),
        templateKey: t.arg.string({ required: true }),
      },
      type: communicationTemplatePreviewType,
      resolve: async (_root, args, context) => {
        requireStaffUser(context);

        const rendered = await renderCommunicationTemplate({
          fields: parseTemplateFieldsJson(args.fieldsJson),
          key: args.templateKey,
          tokenContext: {
            campusName: "Main Campus",
            connectionStatus: "Joining",
            displayName: "Taylor Morgan",
            firstName: "Taylor",
            householdName: "Morgan Household",
          },
        });

        return {
          ...rendered,
        };
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
        const actor = requireStaffUser(context);

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
        const actor = requireStaffUser(context);

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

  builder.mutationField("createJoiningNeverGivenAutomation", (t) =>
    t.field({
      type: communicationAutomationType,
      resolve: (_root, _args, context) => {
        const actor = requireStaffUser(context);

        return createJoiningNeverGivenAutomation(actor);
      },
    }),
  );

  builder.mutationField("updateCommunicationAutomationTemplate", (t) =>
    t.field({
      args: {
        fieldsJson: t.arg.string({ required: true }),
        id: t.arg.string({ required: true }),
      },
      type: communicationAutomationType,
      resolve: (_root, args, context) => {
        const actor = requireStaffUser(context);

        return updateCommunicationAutomationTemplate(
          {
            id: args.id,
            templateFields: parseTemplateFieldsJson(args.fieldsJson),
          },
          actor,
        );
      },
    }),
  );

  builder.mutationField("excludeCommunicationAutomationRecipient", (t) =>
    t.field({
      args: {
        reason: t.arg.string(),
        recipientId: t.arg.string({ required: true }),
      },
      type: communicationAutomationRecipientType,
      resolve: (_root, args, context) => {
        const actor = requireStaffUser(context);

        return excludeAutomationRecipient(
          {
            reason: args.reason,
            recipientId: args.recipientId,
          } satisfies ExcludeAutomationRecipientInput,
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

function parseTemplateFieldsJson(
  value: string | null | undefined,
): CommunicationTemplateFieldValues {
  return (parseOptionalJson(value) ?? {}) as CommunicationTemplateFieldValues;
}
