import type {
  Prisma,
  PrismaClient,
  SavedListViewResource,
} from "@prisma/client";
import { GraphQLError } from "graphql";

import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";
import { createEmptyFilter } from "@/lib/list-views/filter-schema";
import { listHouseholds } from "@/lib/list-views/households-list";
import { listPeople } from "@/lib/list-views/people-list";
import { getSavedListView } from "@/lib/list-views/saved-views";

const AUDIENCE_PAGE_SIZE = 100;
const AUDIENCE_SCAN_LIMIT = 500;
const AUDIENCE_PREVIEW_LIMIT = 25;

type CommunicationSegmentsClient = PrismaClient;

export type CommunicationAudienceInput = {
  filterDefinition?: unknown;
  resource: SavedListViewResource;
  savedViewId?: string | null;
};

export type CommunicationAudienceMember = {
  campusName: string | null;
  contactReady: boolean;
  contactState: string;
  displayName: string;
  email: string | null;
  explanation: string;
  householdName: string | null;
  resource: "HOUSEHOLD" | "PERSON";
  rockId: number;
};

export type ResolvedCommunicationAudience = {
  audienceSize: number;
  audienceTruncated: boolean;
  preview: CommunicationAudienceMember[];
  resource: SavedListViewResource;
  savedViewId: string | null;
  segmentDefinition: Prisma.InputJsonValue;
  segmentSummary: string;
};

export async function resolveCommunicationAudience(
  input: CommunicationAudienceInput,
  actor: LocalAppUser,
  client: CommunicationSegmentsClient = prisma,
): Promise<ResolvedCommunicationAudience> {
  const savedView = input.savedViewId
    ? await getSavedListView(input.savedViewId, actor, client)
    : null;

  if (savedView && savedView.resource !== input.resource) {
    throw new GraphQLError("Saved view resource does not match audience.", {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  const segmentDefinition = jsonObject(
    input.filterDefinition ??
      savedView?.filterDefinition ??
      createEmptyFilter(),
    "Communication audience filter",
  );
  const preview: CommunicationAudienceMember[] = [];
  let audienceSize = 0;
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage && audienceSize < AUDIENCE_SCAN_LIMIT) {
    const listInput = {
      after: cursor,
      filterDefinition: savedView ? undefined : segmentDefinition,
      first: AUDIENCE_PAGE_SIZE,
      savedViewId: savedView?.id ?? null,
    };

    if (input.resource === "PEOPLE") {
      const connection = await listPeople(listInput, actor, client);

      for (const edge of connection.edges) {
        audienceSize += 1;

        if (preview.length < AUDIENCE_PREVIEW_LIMIT) {
          preview.push(personPreviewMember(edge.node));
        }
      }

      cursor = connection.pageInfo.endCursor;
      hasNextPage = connection.pageInfo.hasNextPage && Boolean(cursor);
      continue;
    }

    const connection = await listHouseholds(listInput, actor, client);

    for (const edge of connection.edges) {
      audienceSize += 1;

      if (preview.length < AUDIENCE_PREVIEW_LIMIT) {
        preview.push(householdPreviewMember(edge.node));
      }
    }

    cursor = connection.pageInfo.endCursor;
    hasNextPage = connection.pageInfo.hasNextPage && Boolean(cursor);
  }

  return {
    audienceSize,
    audienceTruncated: hasNextPage,
    preview,
    resource: input.resource,
    savedViewId: savedView?.id ?? null,
    segmentDefinition,
    segmentSummary: savedView
      ? `Saved view: ${savedView.name}`
      : "Custom audience filter",
  };
}

function personPreviewMember(
  person: Awaited<ReturnType<typeof listPeople>>["edges"][number]["node"],
): CommunicationAudienceMember {
  const contactReady = Boolean(person.email && person.emailActive !== false);

  return {
    campusName: person.primaryCampus?.name ?? null,
    contactReady,
    contactState: contactReady
      ? "Email-ready"
      : person.email
        ? "Email inactive"
        : "Missing email",
    displayName: person.displayName,
    email: person.email,
    explanation: explainPersonInclusion(person),
    householdName: person.primaryHousehold?.name ?? null,
    resource: "PERSON",
    rockId: person.rockId,
  };
}

function householdPreviewMember(
  household: Awaited<
    ReturnType<typeof listHouseholds>
  >["edges"][number]["node"],
): CommunicationAudienceMember {
  const primaryEmail =
    household.primaryContacts.find((contact) => contact.email)?.email ?? null;

  return {
    campusName: household.campus?.name ?? null,
    contactReady: Boolean(primaryEmail),
    contactState: primaryEmail
      ? "Primary contact email-ready"
      : "Missing email",
    displayName: household.name,
    email: primaryEmail,
    explanation: explainHouseholdInclusion(household),
    householdName: household.name,
    resource: "HOUSEHOLD",
    rockId: household.rockId,
  };
}

function explainPersonInclusion(
  person: Awaited<ReturnType<typeof listPeople>>["edges"][number]["node"],
) {
  if (person.lifecycle.length > 0) {
    return person.lifecycle[0]!.summary;
  }

  if (person.openTaskCount > 0) {
    return `${person.openTaskCount} open follow-up task${person.openTaskCount === 1 ? "" : "s"}.`;
  }

  if (person.amountsHidden) {
    return "Matches this audience's care-context criteria; giving amounts are hidden for this role.";
  }

  if (person.givingSummary?.lastGiftAt) {
    return `Latest synced giving activity on ${person.givingSummary.lastGiftAt.toISOString().slice(0, 10)}.`;
  }

  return "Matches this audience's saved criteria.";
}

function explainHouseholdInclusion(
  household: Awaited<
    ReturnType<typeof listHouseholds>
  >["edges"][number]["node"],
) {
  if (household.lifecycle.length > 0) {
    return household.lifecycle[0]!.summary;
  }

  if (household.openTaskCount > 0) {
    return `${household.openTaskCount} open follow-up task${household.openTaskCount === 1 ? "" : "s"}.`;
  }

  if (household.amountsHidden) {
    return "Matches this audience's care-context criteria; giving amounts are hidden for this role.";
  }

  if (household.givingSummary?.lastGiftAt) {
    return `Latest synced giving activity on ${household.givingSummary.lastGiftAt.toISOString().slice(0, 10)}.`;
  }

  return "Matches this audience's saved criteria.";
}

function jsonObject(value: unknown, label: string): Prisma.InputJsonValue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new GraphQLError(`${label} must be a JSON object.`, {
      extensions: {
        code: "BAD_USER_INPUT",
      },
    });
  }

  return value as Prisma.InputJsonObject;
}
