import { GraphQLError } from "graphql";
import type { Prisma, PrismaClient } from "@prisma/client";

import { requireAppPermission } from "@/lib/auth/permissions";
import type { LocalAppUser } from "@/lib/auth/types";
import { prisma } from "@/lib/db/prisma";

export type PlatformFundScope =
  | {
      mode: "UNCONFIGURED";
      enabledAccountRockIds: number[];
    }
  | {
      mode: "CONFIGURED";
      enabledAccountRockIds: number[];
    };

export type PlatformFundSettingRow = {
  accountRockId: number;
  active: boolean;
  campusName: string | null;
  enabled: boolean;
  factCount: number;
  lastGiftAt: Date | null;
  name: string;
  notes: string | null;
  public: boolean | null;
  taxDeductible: boolean | null;
  updatedAt: Date | null;
  updatedByName: string | null;
};

export type PlatformFundSettingsSummary = {
  configured: boolean;
  enabledCount: number;
  funds: PlatformFundSettingRow[];
  latestRefresh: PlatformFundRefreshStatus | null;
  totalCount: number;
};

export type PlatformFundRefreshStatus = {
  completedAt: Date | null;
  errorMessage: string | null;
  id: string;
  requestedAt: Date;
  startedAt: Date | null;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
};

export type UpdatePlatformFundSettingsInput = {
  enabledAccountRockIds: number[];
  notesByAccountRockId?: Record<number, string | null | undefined>;
};

type FundSettingsClient = Pick<
  PrismaClient,
  | "$transaction"
  | "derivedCalculationRefresh"
  | "givingFact"
  | "platformFundSetting"
  | "rockFinancialAccount"
>;

type DerivedRefreshRequester = (input: {
  requestedByUserId: string;
}) => Promise<unknown>;

export async function getPlatformFundScope(
  client: Partial<Pick<PrismaClient, "platformFundSetting">> = prisma,
): Promise<PlatformFundScope> {
  if (!client.platformFundSetting) {
    return {
      enabledAccountRockIds: [],
      mode: "UNCONFIGURED",
    };
  }

  const settings = await client.platformFundSetting
    .findMany({
      orderBy: [{ accountRockId: "asc" }],
      select: {
        accountRockId: true,
        enabled: true,
      },
    })
    .catch((error: unknown) => {
      if (isMissingPlatformFundSettingTable(error)) {
        return [];
      }

      throw error;
    });

  if (settings.length === 0) {
    return {
      enabledAccountRockIds: [],
      mode: "UNCONFIGURED",
    };
  }

  return {
    enabledAccountRockIds: settings
      .filter((setting) => setting.enabled)
      .map((setting) => setting.accountRockId),
    mode: "CONFIGURED",
  };
}

export function whereForEnabledPlatformFunds(scope: PlatformFundScope) {
  return {
    accountRockId: {
      in: scope.enabledAccountRockIds,
    },
  } satisfies Prisma.GivingFactWhereInput;
}

export function platformFundScopeSourceExplanation(scope: PlatformFundScope) {
  return scope.mode === "CONFIGURED"
    ? " Calculations use the Admin-configured platform fund set."
    : " Platform funds are not configured, so fund-scoped giving values are withheld.";
}

export async function listPlatformFundSettings(
  actor: LocalAppUser,
  client: FundSettingsClient = prisma,
): Promise<PlatformFundSettingsSummary> {
  requireAppPermission(actor, "settings:manage");

  const [accounts, settingCount, factCounts, latestRefresh] = await Promise.all(
    [
      client.rockFinancialAccount.findMany({
        orderBy: [{ active: "desc" }, { name: "asc" }, { rockId: "asc" }],
        select: {
          active: true,
          campus: {
            select: {
              name: true,
            },
          },
          name: true,
          platformFundSetting: {
            select: {
              enabled: true,
              notes: true,
              updatedAt: true,
              updatedBy: {
                select: {
                  name: true,
                },
              },
            },
          },
          public: true,
          rockId: true,
          taxDeductible: true,
        },
      }),
      client.platformFundSetting.count(),
      client.givingFact.groupBy({
        by: ["accountRockId"],
        _count: {
          _all: true,
        },
        _max: {
          occurredAt: true,
        },
        where: {
          accountRockId: {
            not: null,
          },
        },
      }),
      client.derivedCalculationRefresh.findFirst({
        orderBy: [{ requestedAt: "desc" }],
        select: {
          completedAt: true,
          errorMessage: true,
          id: true,
          requestedAt: true,
          startedAt: true,
          status: true,
        },
        where: {
          kind: "FUND_SCOPED_GIVING",
        },
      }),
    ],
  );
  const usageByAccount = new Map(
    factCounts
      .filter((row) => Number.isInteger(row.accountRockId))
      .map((row) => [
        row.accountRockId as number,
        {
          factCount: row._count._all,
          lastGiftAt: row._max.occurredAt,
        },
      ]),
  );
  const funds = accounts.map((account) => {
    const setting = account.platformFundSetting;
    const usage = usageByAccount.get(account.rockId);

    return {
      accountRockId: account.rockId,
      active: account.active,
      campusName: account.campus?.name ?? null,
      enabled: setting?.enabled ?? false,
      factCount: usage?.factCount ?? 0,
      lastGiftAt: usage?.lastGiftAt ?? null,
      name: account.name,
      notes: setting?.notes ?? null,
      public: account.public,
      taxDeductible: account.taxDeductible,
      updatedAt: setting?.updatedAt ?? null,
      updatedByName: setting?.updatedBy?.name ?? null,
    };
  });

  return {
    configured: settingCount > 0,
    enabledCount: funds.filter((fund) => fund.enabled).length,
    funds,
    latestRefresh,
    totalCount: funds.length,
  };
}

export async function updatePlatformFundSettings(
  input: UpdatePlatformFundSettingsInput,
  actor: LocalAppUser,
  client: FundSettingsClient = prisma,
  requestDerivedRefresh: DerivedRefreshRequester = defaultDerivedRefreshRequester,
) {
  requireAppPermission(actor, "settings:manage");

  const enabledAccountRockIds = normalizeAccountRockIds(
    input.enabledAccountRockIds,
  );
  const accounts = await client.rockFinancialAccount.findMany({
    select: {
      rockId: true,
    },
  });
  const accountIds = accounts.map((account) => account.rockId);
  const accountIdSet = new Set(accountIds);

  for (const accountRockId of enabledAccountRockIds) {
    if (!accountIdSet.has(accountRockId)) {
      throw new GraphQLError("A selected platform fund was not found.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
  }

  const previousScope = await getPlatformFundScope(client);
  const nextEnabledSet = new Set(enabledAccountRockIds);

  await client.$transaction(async (tx) => {
    for (const accountRockId of accountIds) {
      await tx.platformFundSetting.upsert({
        create: {
          accountRockId,
          enabled: nextEnabledSet.has(accountRockId),
          notes: normalizeNotes(input.notesByAccountRockId?.[accountRockId]),
          updatedByUserId: actor.id,
        },
        update: {
          enabled: nextEnabledSet.has(accountRockId),
          notes: normalizeNotes(input.notesByAccountRockId?.[accountRockId]),
          updatedByUserId: actor.id,
        },
        where: {
          accountRockId,
        },
      });
    }
  });

  const changed =
    previousScope.mode === "UNCONFIGURED" ||
    !sameAccountSet(previousScope.enabledAccountRockIds, enabledAccountRockIds);

  if (changed) {
    await requestDerivedRefresh({ requestedByUserId: actor.id });
  }

  return {
    changed,
    enabledAccountRockIds,
  };
}

function normalizeAccountRockIds(accountRockIds: number[]) {
  const normalized = Array.from(new Set(accountRockIds));

  for (const accountRockId of normalized) {
    if (!Number.isInteger(accountRockId) || accountRockId <= 0) {
      throw new GraphQLError("Platform fund IDs must be positive integers.", {
        extensions: { code: "BAD_USER_INPUT" },
      });
    }
  }

  return normalized.sort((left, right) => left - right);
}

function normalizeNotes(note: string | null | undefined) {
  const normalized = note?.trim();

  return normalized ? normalized.slice(0, 500) : null;
}

function sameAccountSet(left: number[], right: number[]) {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((accountRockId) => rightSet.has(accountRockId));
}

async function defaultDerivedRefreshRequester(input: {
  requestedByUserId: string;
}) {
  const { requestFundScopedGivingRefresh } =
    await import("@/lib/giving/derived-refresh");

  return requestFundScopedGivingRefresh(input);
}

function isMissingPlatformFundSettingTable(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P2021" || error.code === "P2022")
  );
}
