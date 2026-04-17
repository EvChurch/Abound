export type RockApiVersion = "v1" | "v2" | "export" | "unknown";

export type RockFixtureSourceMetadata = {
  rockId: number | string;
  rockGuid?: string;
  apiVersion: RockApiVersion;
  fetchedAt: string;
  sourceUpdatedAt?: string | null;
};

export type RockFixturePerson = {
  fixtureId: string;
  sourceMetadata: RockFixtureSourceMetadata;
  primaryAliasId?: number | null;
  givenName: string;
  familyName: string;
  email?: string | null;
  campusFixtureId?: string | null;
  householdFixtureId?: string | null;
  isActive: boolean;
};

export type RockFixtureHouseholdMember = {
  personFixtureId: string;
  role: "adult" | "child" | "unknown";
};

export type RockFixtureHousehold = {
  fixtureId: string;
  sourceMetadata: RockFixtureSourceMetadata;
  campusFixtureId?: string | null;
  name: string;
  members: RockFixtureHouseholdMember[];
  isActive: boolean;
};

export type RockFixtureCampus = {
  fixtureId: string;
  sourceMetadata: RockFixtureSourceMetadata;
  name: string;
  shortCode?: string | null;
  isActive: boolean;
};

export type RockFixtureGroupType =
  | "family"
  | "small_group"
  | "ministry"
  | "serving_team"
  | "unknown";

export type RockFixtureGroup = {
  fixtureId: string;
  sourceMetadata: RockFixtureSourceMetadata;
  campusFixtureId?: string | null;
  name: string;
  type: RockFixtureGroupType;
  isActive: boolean;
  isArchived: boolean;
};

export type RockFixtureGroupMember = {
  fixtureId: string;
  sourceMetadata: RockFixtureSourceMetadata;
  personFixtureId: string;
  groupFixtureId: string;
  role?: string | null;
  status?: string | null;
  isArchived: boolean;
};

export type RockFixtureFinancialAccount = {
  fixtureId: string;
  sourceMetadata: RockFixtureSourceMetadata;
  campusFixtureId?: string | null;
  name: string;
  isActive: boolean;
};

export type RockFixtureGiftDetail = {
  accountFixtureId: string;
  amountCents: number;
};

export type RockFixtureGift = {
  fixtureId: string;
  sourceMetadata: RockFixtureSourceMetadata;
  personFixtureId?: string | null;
  householdFixtureId?: string | null;
  transactionDate: string;
  totalAmountCents: number;
  details: RockFixtureGiftDetail[];
  currency: "USD";
  isReversal: boolean;
};

export type RockFixtureRecurringGiftStatus =
  | "active"
  | "paused"
  | "canceled"
  | "failed"
  | "unknown";

export type RockFixtureRecurringGift = {
  fixtureId: string;
  sourceMetadata: RockFixtureSourceMetadata;
  personFixtureId?: string | null;
  householdFixtureId?: string | null;
  accountFixtureId: string;
  status: RockFixtureRecurringGiftStatus;
  amountCents?: number | null;
  scheduleLabel?: string | null;
};

export type SanitizedRockFixtureBundle = {
  fixtureVersion: 1;
  generatedAt: string;
  sanitizer: string;
  notes: string[];
  people: RockFixturePerson[];
  households: RockFixtureHousehold[];
  campuses: RockFixtureCampus[];
  groups: RockFixtureGroup[];
  groupMembers: RockFixtureGroupMember[];
  financialAccounts: RockFixtureFinancialAccount[];
  gifts: RockFixtureGift[];
  recurringGifts: RockFixtureRecurringGift[];
};

export type RockFixtureValidationResult = {
  valid: boolean;
  errors: string[];
};

type FixtureCollectionName =
  | "people"
  | "households"
  | "campuses"
  | "groups"
  | "groupMembers"
  | "financialAccounts"
  | "gifts"
  | "recurringGifts";

const COLLECTIONS = [
  "people",
  "households",
  "campuses",
  "groups",
  "groupMembers",
  "financialAccounts",
  "gifts",
  "recurringGifts",
] as const satisfies FixtureCollectionName[];

export function validateSanitizedRockFixtureBundle(
  bundle: SanitizedRockFixtureBundle,
): RockFixtureValidationResult {
  const errors: string[] = [];
  const idsByCollection = new Map<FixtureCollectionName, Set<string>>();

  collectUnsafeFixtureValues(bundle, errors);

  if (bundle.fixtureVersion !== 1) {
    errors.push("fixtureVersion must be 1");
  }

  requireIsoTimestamp(bundle.generatedAt, "generatedAt", errors);
  requireNonEmpty(bundle.sanitizer, "sanitizer", errors);

  for (const collection of COLLECTIONS) {
    idsByCollection.set(
      collection,
      collectFixtureIds(collection, bundle, errors),
    );
  }

  for (const person of bundle.people) {
    validateSourceMetadata(
      `people.${person.fixtureId}`,
      person.sourceMetadata,
      errors,
    );
    requireNonEmpty(
      person.givenName,
      `people.${person.fixtureId}.givenName`,
      errors,
    );
    requireNonEmpty(
      person.familyName,
      `people.${person.fixtureId}.familyName`,
      errors,
    );

    if (
      person.householdFixtureId &&
      !idsByCollection.get("households")?.has(person.householdFixtureId)
    ) {
      errors.push(
        `people.${person.fixtureId}.householdFixtureId references missing household`,
      );
    }

    if (
      person.campusFixtureId &&
      !idsByCollection.get("campuses")?.has(person.campusFixtureId)
    ) {
      errors.push(
        `people.${person.fixtureId}.campusFixtureId references missing campus`,
      );
    }
  }

  for (const household of bundle.households) {
    validateSourceMetadata(
      `households.${household.fixtureId}`,
      household.sourceMetadata,
      errors,
    );

    if (
      household.campusFixtureId &&
      !idsByCollection.get("campuses")?.has(household.campusFixtureId)
    ) {
      errors.push(
        `households.${household.fixtureId}.campusFixtureId references missing campus`,
      );
    }

    for (const member of household.members) {
      if (!idsByCollection.get("people")?.has(member.personFixtureId)) {
        errors.push(
          `households.${household.fixtureId}.members references missing person ${member.personFixtureId}`,
        );
      }
    }
  }

  for (const campus of bundle.campuses) {
    validateSourceMetadata(
      `campuses.${campus.fixtureId}`,
      campus.sourceMetadata,
      errors,
    );
    requireNonEmpty(campus.name, `campuses.${campus.fixtureId}.name`, errors);
  }

  for (const group of bundle.groups) {
    validateSourceMetadata(
      `groups.${group.fixtureId}`,
      group.sourceMetadata,
      errors,
    );
    requireNonEmpty(group.name, `groups.${group.fixtureId}.name`, errors);

    if (
      group.campusFixtureId &&
      !idsByCollection.get("campuses")?.has(group.campusFixtureId)
    ) {
      errors.push(
        `groups.${group.fixtureId}.campusFixtureId references missing campus`,
      );
    }
  }

  for (const groupMember of bundle.groupMembers) {
    validateSourceMetadata(
      `groupMembers.${groupMember.fixtureId}`,
      groupMember.sourceMetadata,
      errors,
    );

    if (!idsByCollection.get("people")?.has(groupMember.personFixtureId)) {
      errors.push(
        `groupMembers.${groupMember.fixtureId}.personFixtureId references missing person`,
      );
    }

    if (!idsByCollection.get("groups")?.has(groupMember.groupFixtureId)) {
      errors.push(
        `groupMembers.${groupMember.fixtureId}.groupFixtureId references missing group`,
      );
    }
  }

  for (const account of bundle.financialAccounts) {
    validateSourceMetadata(
      `financialAccounts.${account.fixtureId}`,
      account.sourceMetadata,
      errors,
    );

    if (
      account.campusFixtureId &&
      !idsByCollection.get("campuses")?.has(account.campusFixtureId)
    ) {
      errors.push(
        `financialAccounts.${account.fixtureId}.campusFixtureId references missing campus`,
      );
    }
  }

  for (const gift of bundle.gifts) {
    validateSourceMetadata(
      `gifts.${gift.fixtureId}`,
      gift.sourceMetadata,
      errors,
    );
    requireIsoTimestamp(
      gift.transactionDate,
      `gifts.${gift.fixtureId}.transactionDate`,
      errors,
    );

    const detailTotal = gift.details.reduce(
      (total, detail) => total + detail.amountCents,
      0,
    );

    if (detailTotal !== gift.totalAmountCents) {
      errors.push(
        `gifts.${gift.fixtureId}.details must sum to totalAmountCents`,
      );
    }

    if (
      gift.personFixtureId &&
      !idsByCollection.get("people")?.has(gift.personFixtureId)
    ) {
      errors.push(
        `gifts.${gift.fixtureId}.personFixtureId references missing person`,
      );
    }

    if (
      gift.householdFixtureId &&
      !idsByCollection.get("households")?.has(gift.householdFixtureId)
    ) {
      errors.push(
        `gifts.${gift.fixtureId}.householdFixtureId references missing household`,
      );
    }

    for (const detail of gift.details) {
      if (
        !idsByCollection.get("financialAccounts")?.has(detail.accountFixtureId)
      ) {
        errors.push(
          `gifts.${gift.fixtureId}.details references missing financial account ${detail.accountFixtureId}`,
        );
      }
    }
  }

  for (const recurringGift of bundle.recurringGifts) {
    validateSourceMetadata(
      `recurringGifts.${recurringGift.fixtureId}`,
      recurringGift.sourceMetadata,
      errors,
    );

    if (
      recurringGift.personFixtureId &&
      !idsByCollection.get("people")?.has(recurringGift.personFixtureId)
    ) {
      errors.push(
        `recurringGifts.${recurringGift.fixtureId}.personFixtureId references missing person`,
      );
    }

    if (
      recurringGift.householdFixtureId &&
      !idsByCollection.get("households")?.has(recurringGift.householdFixtureId)
    ) {
      errors.push(
        `recurringGifts.${recurringGift.fixtureId}.householdFixtureId references missing household`,
      );
    }

    if (
      !idsByCollection
        .get("financialAccounts")
        ?.has(recurringGift.accountFixtureId)
    ) {
      errors.push(
        `recurringGifts.${recurringGift.fixtureId}.accountFixtureId references missing financial account`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function collectFixtureIds(
  collection: FixtureCollectionName,
  bundle: SanitizedRockFixtureBundle,
  errors: string[],
) {
  const ids = new Set<string>();

  for (const record of bundle[collection]) {
    if (!record.fixtureId.trim()) {
      errors.push(`${collection} includes a record without fixtureId`);
      continue;
    }

    if (ids.has(record.fixtureId)) {
      errors.push(
        `${collection}.${record.fixtureId} has a duplicate fixtureId`,
      );
    }

    ids.add(record.fixtureId);
  }

  return ids;
}

function validateSourceMetadata(
  path: string,
  metadata: RockFixtureSourceMetadata,
  errors: string[],
) {
  if (metadata.rockId === "" || metadata.rockId === null) {
    errors.push(`${path}.sourceMetadata.rockId is required`);
  }

  requireIsoTimestamp(
    metadata.fetchedAt,
    `${path}.sourceMetadata.fetchedAt`,
    errors,
  );

  if (metadata.sourceUpdatedAt) {
    requireIsoTimestamp(
      metadata.sourceUpdatedAt,
      `${path}.sourceMetadata.sourceUpdatedAt`,
      errors,
    );
  }
}

function requireNonEmpty(value: string, path: string, errors: string[]) {
  if (!value.trim()) {
    errors.push(`${path} is required`);
  }
}

function requireIsoTimestamp(value: string, path: string, errors: string[]) {
  if (Number.isNaN(Date.parse(value))) {
    errors.push(`${path} must be an ISO timestamp`);
  }
}

function collectUnsafeFixtureValues(
  value: unknown,
  errors: string[],
  path = "fixture",
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectUnsafeFixtureValues(item, errors, `${path}.${index}`);
    });
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, childValue] of Object.entries(value)) {
      if (isUnsafeFixtureKey(key)) {
        errors.push(`${path}.${key} must not be present in sanitized fixtures`);
      }

      collectUnsafeFixtureValues(childValue, errors, `${path}.${key}`);
    }

    return;
  }

  if (typeof value !== "string") {
    return;
  }

  if (looksLikePaymentInstrument(value)) {
    errors.push(`${path} looks like a full payment instrument value`);
  }

  if (looksLikeSecret(value)) {
    errors.push(`${path} looks like an access token or secret`);
  }
}

function isUnsafeFixtureKey(key: string) {
  return /authorization|password|secret|token|cookie|card|bank|routing|accountNumber|gatewayCustomer/i.test(
    key,
  );
}

function looksLikePaymentInstrument(value: string) {
  const digits = value.replace(/[\s-]/g, "");

  return /^\d{13,19}$/.test(digits);
}

function looksLikeSecret(value: string) {
  return (
    /^Bearer\s+\S+/i.test(value) ||
    /^Authorization-Token\s*:/i.test(value) ||
    /^sk_(live|test)_/i.test(value) ||
    /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
  );
}
