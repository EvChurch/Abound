import type {
  CommunicationPrepStatus,
  Prisma,
  PrismaClient,
  SavedListViewResource,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import { requireAppPermission } from "@/lib/auth/permissions";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import {
  resolveCommunicationAudience,
  type CommunicationAudienceMember,
} from "@/lib/communications/segments";

const DEFAULT_PREP_LIMIT = 20;
const MAX_PREP_LIMIT = 50;

export type CommunicationPrepRecord = {
  id: string;
  title: string;
  status: CommunicationPrepStatus;
  segmentSummary: string;
  handoffTarget: string | null;
  audienceResource: SavedListViewResource;
  savedListViewId: string | null;
  segmentDefinition: Prisma.JsonValue;
  audienceSize: number;
  audienceTruncated: boolean;
  audiencePreview: Prisma.JsonValue;
  reviewNotes: string | null;
  createdByUserId: string | null;
  personRockId: number | null;
  householdRockId: number | null;
  readyForReviewAt: Date | null;
  approvedAt: Date | null;
  handedOffAt: Date | null;
  canceledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateCommunicationPrepInput = {
  filterDefinition?: unknown;
  handoffTarget?: string | null;
  householdRockId?: number | null;
  personRockId?: number | null;
  resource: SavedListViewResource;
  reviewNotes?: string | null;
  savedViewId?: string | null;
  title: string;
};

export type UpdateCommunicationPrepInput = {
  handoffTarget?: string | null;
  id: string;
  reviewNotes?: string | null;
  status?: CommunicationPrepStatus | null;
  title?: string | null;
};

export type ListCommunicationPrepsInput = {
  limit?: number | null;
  status?: CommunicationPrepStatus | null;
};

export async function listCommunicationPreps(
  input: ListCommunicationPrepsInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<CommunicationPrepRecord[]> {
  requireAppPermission(actor, "communications:manage");

  return client.communicationPrep.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: clampPrepLimit(input.limit),
    where: input.status ? { status: input.status } : undefined,
  });
}

export async function createCommunicationPrep(
  input: CreateCommunicationPrepInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<CommunicationPrepRecord> {
  requireAppPermission(actor, "communications:manage");

  const title = normalizeRequiredText(input.title, "Communication prep title");
  const [person, household, audience] = await Promise.all([
    validatePersonLink(input.personRockId, client),
    validateHouseholdLink(input.householdRockId, client),
    resolveCommunicationAudience(
      {
        filterDefinition: input.filterDefinition,
        resource: input.resource,
        savedViewId: input.savedViewId,
      },
      actor,
      client,
    ),
  ]);

  return client.communicationPrep.create({
    data: {
      audiencePreview: audience.preview as unknown as Prisma.InputJsonValue,
      audienceResource: audience.resource,
      audienceSize: audience.audienceSize,
      audienceTruncated: audience.audienceTruncated,
      createdByUserId: actor.id,
      handoffTarget: normalizeOptionalText(input.handoffTarget),
      householdRockId: household?.rockId ?? null,
      personRockId: person?.rockId ?? null,
      reviewNotes: normalizeOptionalText(input.reviewNotes),
      savedListViewId: audience.savedViewId,
      segmentDefinition: audience.segmentDefinition,
      segmentSummary: audience.segmentSummary,
      title,
    },
  });
}

export async function updateCommunicationPrep(
  input: UpdateCommunicationPrepInput,
  actor: LocalAppUser,
  client: PrismaClient = prisma,
): Promise<CommunicationPrepRecord> {
  requireAppPermission(actor, "communications:manage");

  const existing = await client.communicationPrep.findUnique({
    where: { id: input.id },
  });

  if (!existing) {
    throw new GraphQLError("Communication prep was not found.", {
      extensions: {
        code: "NOT_FOUND",
      },
    });
  }

  const data: Prisma.CommunicationPrepUpdateInput = {};

  if (input.title !== undefined) {
    data.title = normalizeRequiredText(
      input.title ?? "",
      "Communication prep title",
    );
  }

  if (input.handoffTarget !== undefined) {
    data.handoffTarget = normalizeOptionalText(input.handoffTarget);
  }

  if (input.reviewNotes !== undefined) {
    data.reviewNotes = normalizeOptionalText(input.reviewNotes);
  }

  if (input.status) {
    data.status = input.status;
    applyStatusTimestamp(data, input.status);
  }

  return client.communicationPrep.update({
    data,
    where: {
      id: input.id,
    },
  });
}

export function audiencePreviewFromRecord(
  prep: Pick<CommunicationPrepRecord, "audiencePreview">,
): CommunicationAudienceMember[] {
  return Array.isArray(prep.audiencePreview)
    ? (prep.audiencePreview as CommunicationAudienceMember[])
    : [];
}

export function clampPrepLimit(limit: number | null | undefined) {
  if (!limit || limit < 1) {
    return DEFAULT_PREP_LIMIT;
  }

  return Math.min(Math.trunc(limit), MAX_PREP_LIMIT);
}

function applyStatusTimestamp(
  data: Prisma.CommunicationPrepUpdateInput,
  status: CommunicationPrepStatus,
) {
  const now = new Date();

  if (status === "READY_FOR_REVIEW") {
    data.readyForReviewAt = now;
  }

  if (status === "APPROVED") {
    data.approvedAt = now;
  }

  if (status === "HANDED_OFF") {
    data.handedOffAt = now;
  }

  if (status === "CANCELED") {
    data.canceledAt = now;
  }
}

async function validatePersonLink(
  personRockId: number | null | undefined,
  client: PrismaClient,
) {
  assertPositiveRockId(personRockId, "Communication prep personRockId");

  if (!personRockId) {
    return null;
  }

  const person = await client.rockPerson.findUnique({
    select: { rockId: true },
    where: { rockId: personRockId },
  });

  if (!person) {
    throw new GraphQLError("Communication prep person link was not found.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return person;
}

async function validateHouseholdLink(
  householdRockId: number | null | undefined,
  client: PrismaClient,
) {
  assertPositiveRockId(householdRockId, "Communication prep householdRockId");

  if (!householdRockId) {
    return null;
  }

  const household = await client.rockHousehold.findUnique({
    select: { rockId: true },
    where: { rockId: householdRockId },
  });

  if (!household) {
    throw new GraphQLError("Communication prep household link was not found.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return household;
}

function assertPositiveRockId(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new GraphQLError(`${label} must be a positive Rock id.`, {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }
}

function normalizeRequiredText(value: string, label: string) {
  const text = value.trim();

  if (!text) {
    throw new GraphQLError(`${label} is required.`, {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return text;
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = value?.trim();

  return text || null;
}
