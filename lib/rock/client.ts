import { FAMILY_GROUP_TYPE_ID } from "@/lib/giving/models";
import { ROCK_READ_ENDPOINTS } from "@/lib/sync/models";
import { redactText } from "@/lib/sync/redaction";

export type RockClientConfig = {
  baseUrl: string;
  restKey: string;
  fetcher?: typeof fetch;
};

export type RockSyncSlice = {
  groupTypes: RockApiGroupType[];
  groupRoles: RockApiGroupRole[];
  definedValues: RockApiDefinedValue[];
  personAliases: RockApiPersonAlias[];
  people: RockApiPerson[];
  familyGroups: RockApiGroup[];
  familyMembers: RockApiGroupMember[];
  campuses: RockApiCampus[];
  groups: RockApiGroup[];
  groupMembers: RockApiGroupMember[];
  financialAccounts: RockApiFinancialAccount[];
  financialTransactions: RockApiFinancialTransaction[];
  financialTransactionDetails: RockApiFinancialTransactionDetail[];
  financialScheduledTransactions: RockApiFinancialScheduledTransaction[];
  financialScheduledTransactionDetails: RockApiFinancialScheduledTransactionDetail[];
};

export type RockPersonSlice = RockSyncSlice;

export type RockFullSyncOptions = {
  pageSize?: number;
  maxPages?: number;
};

export type RockApiPerson = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  PrimaryAliasId?: number | null;
  PrimaryAliasGuid?: string | null;
  GivingGroupId?: number | null;
  GivingId?: string | null;
  GivingLeaderId?: number | null;
  PrimaryFamilyId?: number | null;
  PrimaryCampusId?: number | null;
  PhotoId?: number | null;
  FirstName?: string | null;
  NickName?: string | null;
  LastName?: string | null;
  Email?: string | null;
  IsEmailActive?: boolean | null;
  RecordStatusValueId?: number | null;
  IsDeceased?: boolean | null;
  ModifiedDateTime?: string | null;
};

export type RockApiPersonAlias = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  PersonId?: number | null;
  ModifiedDateTime?: string | null;
};

export type RockApiDefinedValue = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  DefinedTypeId?: number | null;
  Value?: string | null;
  Description?: string | null;
  IsActive?: boolean | null;
  Order?: number | null;
  ModifiedDateTime?: string | null;
};

export type RockApiGroupType = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  Name?: string | null;
  Order?: number | null;
  ModifiedDateTime?: string | null;
};

export type RockApiGroupRole = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  GroupTypeId?: number | null;
  Name?: string | null;
  Order?: number | null;
  MaxCount?: number | null;
  MinCount?: number | null;
  ModifiedDateTime?: string | null;
};

export type RockApiGroup = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  GroupTypeId?: number | null;
  ParentGroupId?: number | null;
  CampusId?: number | null;
  Name?: string | null;
  IsActive?: boolean | null;
  IsArchived?: boolean | null;
  ModifiedDateTime?: string | null;
};

export type RockApiGroupMember = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  GroupId?: number | null;
  PersonId?: number | null;
  GroupTypeId?: number | null;
  GroupRoleId?: number | null;
  GroupMemberStatus?: number | null;
  IsArchived?: boolean | null;
  ModifiedDateTime?: string | null;
  Person?: RockApiPerson | null;
};

export type RockApiCampus = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  Name?: string | null;
  ShortCode?: string | null;
  IsActive?: boolean | null;
  ModifiedDateTime?: string | null;
};

export type RockApiFinancialAccount = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  ParentAccountId?: number | null;
  CampusId?: number | null;
  Name?: string | null;
  IsActive?: boolean | null;
  IsPublic?: boolean | null;
  IsTaxDeductible?: boolean | null;
  StartDate?: string | null;
  EndDate?: string | null;
  ModifiedDateTime?: string | null;
};

export type RockApiFinancialTransaction = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  AuthorizedPersonAliasId?: number | null;
  ScheduledTransactionId?: number | null;
  TransactionDateTime?: string | null;
  TransactionDateKey?: number | null;
  Status?: string | null;
  StatusMessage?: string | null;
  SourceTypeValueId?: number | null;
  TransactionTypeValueId?: number | null;
  IsReconciled?: boolean | null;
  IsSettled?: boolean | null;
  ShowAsAnonymous?: boolean | null;
  ModifiedDateTime?: string | null;
};

export type RockApiFinancialTransactionDetail = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  TransactionId?: number | null;
  AccountId?: number | null;
  Amount?: number | string | null;
  FeeAmount?: number | string | null;
  ModifiedDateTime?: string | null;
};

export type RockApiFinancialScheduledTransaction = Record<string, unknown> & {
  Id: number;
  Guid?: string;
  AuthorizedPersonAliasId?: number | null;
  TransactionFrequencyValueId?: number | null;
  StartDate?: string | null;
  EndDate?: string | null;
  NextPaymentDate?: string | null;
  IsActive?: boolean | null;
  Status?: string | null;
  StatusMessage?: string | null;
  ModifiedDateTime?: string | null;
};

export type RockApiFinancialScheduledTransactionDetail = Record<
  string,
  unknown
> & {
  Id: number;
  Guid?: string;
  ScheduledTransactionId?: number | null;
  AccountId?: number | null;
  Amount?: number | string | null;
  ModifiedDateTime?: string | null;
};

export class RockClient {
  private readonly baseUrl: string;
  private readonly restKey: string;
  private readonly fetcher: typeof fetch;

  constructor(config: RockClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.restKey = config.restKey;
    this.fetcher = config.fetcher ?? fetch;
  }

  async getJson<T>(path: string): Promise<T> {
    assertReadEndpoint(path);

    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      headers: {
        Accept: "application/json",
        "Authorization-Token": this.restKey,
      },
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(
        redactText(`Rock GET ${path} failed with status ${response.status}`),
      );
    }

    return (await response.json()) as T;
  }

  async getPersonSlice(personId: number): Promise<RockPersonSlice> {
    const person = await this.getJson<RockApiPerson>(`/api/People/${personId}`);
    const people = new Map<number, RockApiPerson>([[person.Id, person]]);
    const familyGroups = new Map<number, RockApiGroup>();
    const familyMembers = new Map<number, RockApiGroupMember>();
    const campuses = new Map<number, RockApiCampus>();
    const groups = new Map<number, RockApiGroup>();
    const groupMembers = new Map<number, RockApiGroupMember>();
    const accounts = new Map<number, RockApiFinancialAccount>();

    if (person.PrimaryFamilyId) {
      const family = await this.getJson<RockApiGroup>(
        `/api/Groups/${person.PrimaryFamilyId}`,
      );
      familyGroups.set(family.Id, family);
      const members = await this.getJson<RockApiGroupMember[]>(
        `/api/GroupMembers?$filter=GroupId eq ${person.PrimaryFamilyId}&$top=100`,
      );
      for (const member of members) {
        familyMembers.set(member.Id, member);
        if (member.Person?.Id) {
          people.set(member.Person.Id, member.Person);
        } else if (member.PersonId && !people.has(member.PersonId)) {
          people.set(
            member.PersonId,
            await this.getJson<RockApiPerson>(`/api/People/${member.PersonId}`),
          );
        }
      }
    }

    if (person.PrimaryCampusId) {
      campuses.set(
        person.PrimaryCampusId,
        await this.getJson<RockApiCampus>(
          `/api/Campuses/${person.PrimaryCampusId}`,
        ),
      );
    }

    const memberships = await this.getJson<RockApiGroupMember[]>(
      `/api/GroupMembers?$filter=PersonId eq ${personId}&$top=100`,
    );
    for (const membership of memberships) {
      groupMembers.set(membership.Id, membership);
      if (membership.GroupId) {
        const group = await this.getJson<RockApiGroup>(
          `/api/Groups/${membership.GroupId}`,
        );
        groups.set(group.Id, group);
        if (group.CampusId && !campuses.has(group.CampusId)) {
          campuses.set(
            group.CampusId,
            await this.getJson<RockApiCampus>(
              `/api/Campuses/${group.CampusId}`,
            ),
          );
        }
      }
    }

    const transactions = person.PrimaryAliasId
      ? await this.getJson<RockApiFinancialTransaction[]>(
          `/api/FinancialTransactions?$filter=AuthorizedPersonAliasId eq ${person.PrimaryAliasId}&$orderby=TransactionDateTime desc&$top=20`,
        )
      : [];
    const transactionDetails: RockApiFinancialTransactionDetail[] = [];
    for (const transaction of transactions) {
      const details = await this.getJson<RockApiFinancialTransactionDetail[]>(
        `/api/FinancialTransactionDetails?$filter=TransactionId eq ${transaction.Id}&$top=100`,
      );
      transactionDetails.push(...details);
    }

    const scheduledTransactions = person.PrimaryAliasId
      ? await this.getJson<RockApiFinancialScheduledTransaction[]>(
          `/api/FinancialScheduledTransactions?$filter=AuthorizedPersonAliasId eq ${person.PrimaryAliasId}&$top=20`,
        )
      : [];
    const scheduledTransactionDetails: RockApiFinancialScheduledTransactionDetail[] =
      [];
    for (const scheduledTransaction of scheduledTransactions) {
      const details = await this.getJson<
        RockApiFinancialScheduledTransactionDetail[]
      >(
        `/api/FinancialScheduledTransactionDetails?$filter=ScheduledTransactionId eq ${scheduledTransaction.Id}&$top=100`,
      );
      scheduledTransactionDetails.push(...details);
    }

    for (const detail of [
      ...transactionDetails,
      ...scheduledTransactionDetails,
    ]) {
      if (detail.AccountId && !accounts.has(detail.AccountId)) {
        accounts.set(
          detail.AccountId,
          await this.getJson<RockApiFinancialAccount>(
            `/api/FinancialAccounts/${detail.AccountId}`,
          ),
        );
      }
    }

    const [groupTypes, groupRoles, definedValues, personAliases] =
      await Promise.all([
        this.getAllPages<RockApiGroupType>(
          "/api/GroupTypes?$orderby=Id asc",
          {},
        ),
        this.getAllPages<RockApiGroupRole>(
          "/api/GroupTypeRoles?$orderby=Id asc",
          {},
        ),
        this.getAllPages<RockApiDefinedValue>(
          "/api/DefinedValues?$orderby=Id asc",
          {},
        ),
        this.getAllPages<RockApiPersonAlias>(
          "/api/PersonAlias?$orderby=Id asc",
          {},
        ),
      ]);

    return {
      groupTypes,
      groupRoles,
      definedValues,
      personAliases,
      people: [...people.values()],
      familyGroups: [...familyGroups.values()],
      familyMembers: [...familyMembers.values()],
      campuses: [...campuses.values()],
      groups: [...groups.values()],
      groupMembers: [...groupMembers.values()],
      financialAccounts: [...accounts.values()],
      financialTransactions: transactions,
      financialTransactionDetails: transactionDetails,
      financialScheduledTransactions: scheduledTransactions,
      financialScheduledTransactionDetails: scheduledTransactionDetails,
    };
  }

  async getFullSyncSlice(
    options: RockFullSyncOptions = {},
  ): Promise<RockSyncSlice> {
    const [
      groupTypes,
      groupRoles,
      definedValues,
      personAliases,
      people,
      groups,
      groupMembers,
      campuses,
      financialAccounts,
      financialTransactions,
      financialTransactionDetails,
      financialScheduledTransactions,
      financialScheduledTransactionDetails,
    ] = await Promise.all([
      this.getAllPages<RockApiGroupType>(
        "/api/GroupTypes?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiGroupRole>(
        "/api/GroupTypeRoles?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiDefinedValue>(
        "/api/DefinedValues?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiPersonAlias>(
        "/api/PersonAlias?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiPerson>("/api/People?$orderby=Id asc", options),
      this.getAllPages<RockApiGroup>("/api/Groups?$orderby=Id asc", options),
      this.getAllPages<RockApiGroupMember>(
        "/api/GroupMembers?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiCampus>("/api/Campuses?$orderby=Id asc", options),
      this.getAllPages<RockApiFinancialAccount>(
        "/api/FinancialAccounts?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiFinancialTransaction>(
        "/api/FinancialTransactions?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiFinancialTransactionDetail>(
        "/api/FinancialTransactionDetails?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiFinancialScheduledTransaction>(
        "/api/FinancialScheduledTransactions?$orderby=Id asc",
        options,
      ),
      this.getAllPages<RockApiFinancialScheduledTransactionDetail>(
        "/api/FinancialScheduledTransactionDetails?$orderby=Id asc",
        options,
      ),
    ]);

    const groupTypeById = new Map(
      groups.map((group) => [group.Id, group.GroupTypeId]),
    );

    return {
      groupTypes,
      groupRoles,
      definedValues,
      personAliases,
      people,
      familyGroups: groups.filter(
        (group) => group.GroupTypeId === FAMILY_GROUP_TYPE_ID,
      ),
      familyMembers: groupMembers.filter((member) => {
        return groupTypeById.get(member.GroupId ?? 0) === FAMILY_GROUP_TYPE_ID;
      }),
      campuses,
      groups,
      groupMembers,
      financialAccounts,
      financialTransactions,
      financialTransactionDetails,
      financialScheduledTransactions,
      financialScheduledTransactionDetails,
    };
  }

  private async getAllPages<T>(
    path: string,
    options: RockFullSyncOptions,
  ): Promise<T[]> {
    const pageSize = options.pageSize ?? 100;
    const values: T[] = [];

    for (
      let page = 0;
      options.maxPages == null || page < options.maxPages;
      page += 1
    ) {
      const pageValues = await this.getJson<T[]>(
        withQuery(path, `$top=${pageSize}`, `$skip=${page * pageSize}`),
      );
      values.push(...pageValues);

      if (pageValues.length < pageSize) {
        break;
      }
    }

    return values;
  }
}

export function assertReadEndpoint(path: string) {
  if (!path.startsWith("/api/")) {
    throw new Error("Rock client only supports API paths.");
  }

  if (!ROCK_READ_ENDPOINTS.some((endpoint) => path.startsWith(endpoint))) {
    throw new Error(`Rock endpoint is not in the read allowlist: ${path}`);
  }
}

function withQuery(path: string, ...parts: string[]) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${parts.join("&")}`;
}
