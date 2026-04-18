/* eslint-disable */
import type {
  Prisma,
  AppUser,
  AccessRequest,
  SyncRun,
  SyncIssue,
  RockGroupType,
  RockGroupRole,
  RockDefinedValue,
  RockPersonAlias,
  RockCampus,
  RockPerson,
  RockHousehold,
  RockHouseholdMember,
  RockGroup,
  RockGroupMember,
  RockFinancialAccount,
  RockFinancialTransaction,
  RockFinancialTransactionDetail,
  RockFinancialScheduledTransaction,
  RockFinancialScheduledTransactionDetail,
  GivingFact,
  StaffTask,
  CommunicationPrep,
} from "@prisma/client";
import type { PothosPrismaDatamodel } from "@pothos/plugin-prisma";
export default interface PrismaTypes {
  AppUser: {
    Name: "AppUser";
    Shape: AppUser;
    Include: Prisma.AppUserInclude;
    Select: Prisma.AppUserSelect;
    OrderBy: Prisma.AppUserOrderByWithRelationInput;
    WhereUnique: Prisma.AppUserWhereUniqueInput;
    Where: Prisma.AppUserWhereInput;
    Create: {};
    Update: {};
    RelationName: "staffTasks" | "communicationPreps";
    ListRelations: "staffTasks" | "communicationPreps";
    Relations: {
      staffTasks: {
        Shape: StaffTask[];
        Name: "StaffTask";
        Nullable: false;
      };
      communicationPreps: {
        Shape: CommunicationPrep[];
        Name: "CommunicationPrep";
        Nullable: false;
      };
    };
  };
  AccessRequest: {
    Name: "AccessRequest";
    Shape: AccessRequest;
    Include: never;
    Select: Prisma.AccessRequestSelect;
    OrderBy: Prisma.AccessRequestOrderByWithRelationInput;
    WhereUnique: Prisma.AccessRequestWhereUniqueInput;
    Where: Prisma.AccessRequestWhereInput;
    Create: {};
    Update: {};
    RelationName: never;
    ListRelations: never;
    Relations: {};
  };
  SyncRun: {
    Name: "SyncRun";
    Shape: SyncRun;
    Include: Prisma.SyncRunInclude;
    Select: Prisma.SyncRunSelect;
    OrderBy: Prisma.SyncRunOrderByWithRelationInput;
    WhereUnique: Prisma.SyncRunWhereUniqueInput;
    Where: Prisma.SyncRunWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "issues"
      | "groupTypes"
      | "groupRoles"
      | "definedValues"
      | "personAliases"
      | "campuses"
      | "people"
      | "households"
      | "householdMembers"
      | "groups"
      | "groupMembers"
      | "financialAccounts"
      | "financialTransactions"
      | "financialTransactionDetails"
      | "financialScheduledTransactions"
      | "financialScheduledTransactionDetails"
      | "givingFacts";
    ListRelations:
      | "issues"
      | "groupTypes"
      | "groupRoles"
      | "definedValues"
      | "personAliases"
      | "campuses"
      | "people"
      | "households"
      | "householdMembers"
      | "groups"
      | "groupMembers"
      | "financialAccounts"
      | "financialTransactions"
      | "financialTransactionDetails"
      | "financialScheduledTransactions"
      | "financialScheduledTransactionDetails"
      | "givingFacts";
    Relations: {
      issues: {
        Shape: SyncIssue[];
        Name: "SyncIssue";
        Nullable: false;
      };
      groupTypes: {
        Shape: RockGroupType[];
        Name: "RockGroupType";
        Nullable: false;
      };
      groupRoles: {
        Shape: RockGroupRole[];
        Name: "RockGroupRole";
        Nullable: false;
      };
      definedValues: {
        Shape: RockDefinedValue[];
        Name: "RockDefinedValue";
        Nullable: false;
      };
      personAliases: {
        Shape: RockPersonAlias[];
        Name: "RockPersonAlias";
        Nullable: false;
      };
      campuses: {
        Shape: RockCampus[];
        Name: "RockCampus";
        Nullable: false;
      };
      people: {
        Shape: RockPerson[];
        Name: "RockPerson";
        Nullable: false;
      };
      households: {
        Shape: RockHousehold[];
        Name: "RockHousehold";
        Nullable: false;
      };
      householdMembers: {
        Shape: RockHouseholdMember[];
        Name: "RockHouseholdMember";
        Nullable: false;
      };
      groups: {
        Shape: RockGroup[];
        Name: "RockGroup";
        Nullable: false;
      };
      groupMembers: {
        Shape: RockGroupMember[];
        Name: "RockGroupMember";
        Nullable: false;
      };
      financialAccounts: {
        Shape: RockFinancialAccount[];
        Name: "RockFinancialAccount";
        Nullable: false;
      };
      financialTransactions: {
        Shape: RockFinancialTransaction[];
        Name: "RockFinancialTransaction";
        Nullable: false;
      };
      financialTransactionDetails: {
        Shape: RockFinancialTransactionDetail[];
        Name: "RockFinancialTransactionDetail";
        Nullable: false;
      };
      financialScheduledTransactions: {
        Shape: RockFinancialScheduledTransaction[];
        Name: "RockFinancialScheduledTransaction";
        Nullable: false;
      };
      financialScheduledTransactionDetails: {
        Shape: RockFinancialScheduledTransactionDetail[];
        Name: "RockFinancialScheduledTransactionDetail";
        Nullable: false;
      };
      givingFacts: {
        Shape: GivingFact[];
        Name: "GivingFact";
        Nullable: false;
      };
    };
  };
  SyncIssue: {
    Name: "SyncIssue";
    Shape: SyncIssue;
    Include: Prisma.SyncIssueInclude;
    Select: Prisma.SyncIssueSelect;
    OrderBy: Prisma.SyncIssueOrderByWithRelationInput;
    WhereUnique: Prisma.SyncIssueWhereUniqueInput;
    Where: Prisma.SyncIssueWhereInput;
    Create: {};
    Update: {};
    RelationName: "syncRun";
    ListRelations: never;
    Relations: {
      syncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
    };
  };
  RockGroupType: {
    Name: "RockGroupType";
    Shape: RockGroupType;
    Include: Prisma.RockGroupTypeInclude;
    Select: Prisma.RockGroupTypeSelect;
    OrderBy: Prisma.RockGroupTypeOrderByWithRelationInput;
    WhereUnique: Prisma.RockGroupTypeWhereUniqueInput;
    Where: Prisma.RockGroupTypeWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "households"
      | "groups"
      | "groupRoles"
      | "groupMembers";
    ListRelations: "households" | "groups" | "groupRoles" | "groupMembers";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      households: {
        Shape: RockHousehold[];
        Name: "RockHousehold";
        Nullable: false;
      };
      groups: {
        Shape: RockGroup[];
        Name: "RockGroup";
        Nullable: false;
      };
      groupRoles: {
        Shape: RockGroupRole[];
        Name: "RockGroupRole";
        Nullable: false;
      };
      groupMembers: {
        Shape: RockGroupMember[];
        Name: "RockGroupMember";
        Nullable: false;
      };
    };
  };
  RockGroupRole: {
    Name: "RockGroupRole";
    Shape: RockGroupRole;
    Include: Prisma.RockGroupRoleInclude;
    Select: Prisma.RockGroupRoleSelect;
    OrderBy: Prisma.RockGroupRoleOrderByWithRelationInput;
    WhereUnique: Prisma.RockGroupRoleWhereUniqueInput;
    Where: Prisma.RockGroupRoleWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "groupType"
      | "householdMembers"
      | "groupMembers";
    ListRelations: "householdMembers" | "groupMembers";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      groupType: {
        Shape: RockGroupType | null;
        Name: "RockGroupType";
        Nullable: true;
      };
      householdMembers: {
        Shape: RockHouseholdMember[];
        Name: "RockHouseholdMember";
        Nullable: false;
      };
      groupMembers: {
        Shape: RockGroupMember[];
        Name: "RockGroupMember";
        Nullable: false;
      };
    };
  };
  RockDefinedValue: {
    Name: "RockDefinedValue";
    Shape: RockDefinedValue;
    Include: Prisma.RockDefinedValueInclude;
    Select: Prisma.RockDefinedValueSelect;
    OrderBy: Prisma.RockDefinedValueOrderByWithRelationInput;
    WhereUnique: Prisma.RockDefinedValueWhereUniqueInput;
    Where: Prisma.RockDefinedValueWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "peopleRecordStatuses"
      | "transactionSources"
      | "transactionTypes"
      | "scheduledTransactionFrequencies";
    ListRelations:
      | "peopleRecordStatuses"
      | "transactionSources"
      | "transactionTypes"
      | "scheduledTransactionFrequencies";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      peopleRecordStatuses: {
        Shape: RockPerson[];
        Name: "RockPerson";
        Nullable: false;
      };
      transactionSources: {
        Shape: RockFinancialTransaction[];
        Name: "RockFinancialTransaction";
        Nullable: false;
      };
      transactionTypes: {
        Shape: RockFinancialTransaction[];
        Name: "RockFinancialTransaction";
        Nullable: false;
      };
      scheduledTransactionFrequencies: {
        Shape: RockFinancialScheduledTransaction[];
        Name: "RockFinancialScheduledTransaction";
        Nullable: false;
      };
    };
  };
  RockPersonAlias: {
    Name: "RockPersonAlias";
    Shape: RockPersonAlias;
    Include: Prisma.RockPersonAliasInclude;
    Select: Prisma.RockPersonAliasSelect;
    OrderBy: Prisma.RockPersonAliasOrderByWithRelationInput;
    WhereUnique: Prisma.RockPersonAliasWhereUniqueInput;
    Where: Prisma.RockPersonAliasWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "person"
      | "primaryForPeople"
      | "authorizedTransactions"
      | "authorizedScheduledGifts";
    ListRelations:
      | "primaryForPeople"
      | "authorizedTransactions"
      | "authorizedScheduledGifts";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      person: {
        Shape: RockPerson | null;
        Name: "RockPerson";
        Nullable: true;
      };
      primaryForPeople: {
        Shape: RockPerson[];
        Name: "RockPerson";
        Nullable: false;
      };
      authorizedTransactions: {
        Shape: RockFinancialTransaction[];
        Name: "RockFinancialTransaction";
        Nullable: false;
      };
      authorizedScheduledGifts: {
        Shape: RockFinancialScheduledTransaction[];
        Name: "RockFinancialScheduledTransaction";
        Nullable: false;
      };
    };
  };
  RockCampus: {
    Name: "RockCampus";
    Shape: RockCampus;
    Include: Prisma.RockCampusInclude;
    Select: Prisma.RockCampusSelect;
    OrderBy: Prisma.RockCampusOrderByWithRelationInput;
    WhereUnique: Prisma.RockCampusWhereUniqueInput;
    Where: Prisma.RockCampusWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "people"
      | "households"
      | "groups"
      | "financialAccounts";
    ListRelations: "people" | "households" | "groups" | "financialAccounts";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      people: {
        Shape: RockPerson[];
        Name: "RockPerson";
        Nullable: false;
      };
      households: {
        Shape: RockHousehold[];
        Name: "RockHousehold";
        Nullable: false;
      };
      groups: {
        Shape: RockGroup[];
        Name: "RockGroup";
        Nullable: false;
      };
      financialAccounts: {
        Shape: RockFinancialAccount[];
        Name: "RockFinancialAccount";
        Nullable: false;
      };
    };
  };
  RockPerson: {
    Name: "RockPerson";
    Shape: RockPerson;
    Include: Prisma.RockPersonInclude;
    Select: Prisma.RockPersonSelect;
    OrderBy: Prisma.RockPersonOrderByWithRelationInput;
    WhereUnique: Prisma.RockPersonWhereUniqueInput;
    Where: Prisma.RockPersonWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "primaryAlias"
      | "primaryCampus"
      | "primaryHousehold"
      | "givingHousehold"
      | "givingLeader"
      | "givingMembers"
      | "aliases"
      | "recordStatus"
      | "householdMembers"
      | "groupMembers"
      | "transactions"
      | "scheduledTransactions"
      | "givingFacts"
      | "staffTasks"
      | "communicationPreps";
    ListRelations:
      | "givingMembers"
      | "aliases"
      | "householdMembers"
      | "groupMembers"
      | "transactions"
      | "scheduledTransactions"
      | "givingFacts"
      | "staffTasks"
      | "communicationPreps";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      primaryAlias: {
        Shape: RockPersonAlias | null;
        Name: "RockPersonAlias";
        Nullable: true;
      };
      primaryCampus: {
        Shape: RockCampus | null;
        Name: "RockCampus";
        Nullable: true;
      };
      primaryHousehold: {
        Shape: RockHousehold | null;
        Name: "RockHousehold";
        Nullable: true;
      };
      givingHousehold: {
        Shape: RockHousehold | null;
        Name: "RockHousehold";
        Nullable: true;
      };
      givingLeader: {
        Shape: RockPerson | null;
        Name: "RockPerson";
        Nullable: true;
      };
      givingMembers: {
        Shape: RockPerson[];
        Name: "RockPerson";
        Nullable: false;
      };
      aliases: {
        Shape: RockPersonAlias[];
        Name: "RockPersonAlias";
        Nullable: false;
      };
      recordStatus: {
        Shape: RockDefinedValue | null;
        Name: "RockDefinedValue";
        Nullable: true;
      };
      householdMembers: {
        Shape: RockHouseholdMember[];
        Name: "RockHouseholdMember";
        Nullable: false;
      };
      groupMembers: {
        Shape: RockGroupMember[];
        Name: "RockGroupMember";
        Nullable: false;
      };
      transactions: {
        Shape: RockFinancialTransaction[];
        Name: "RockFinancialTransaction";
        Nullable: false;
      };
      scheduledTransactions: {
        Shape: RockFinancialScheduledTransaction[];
        Name: "RockFinancialScheduledTransaction";
        Nullable: false;
      };
      givingFacts: {
        Shape: GivingFact[];
        Name: "GivingFact";
        Nullable: false;
      };
      staffTasks: {
        Shape: StaffTask[];
        Name: "StaffTask";
        Nullable: false;
      };
      communicationPreps: {
        Shape: CommunicationPrep[];
        Name: "CommunicationPrep";
        Nullable: false;
      };
    };
  };
  RockHousehold: {
    Name: "RockHousehold";
    Shape: RockHousehold;
    Include: Prisma.RockHouseholdInclude;
    Select: Prisma.RockHouseholdSelect;
    OrderBy: Prisma.RockHouseholdOrderByWithRelationInput;
    WhereUnique: Prisma.RockHouseholdWhereUniqueInput;
    Where: Prisma.RockHouseholdWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "groupType"
      | "campus"
      | "people"
      | "givingPeople"
      | "members"
      | "givingFacts"
      | "staffTasks"
      | "communicationPreps";
    ListRelations:
      | "people"
      | "givingPeople"
      | "members"
      | "givingFacts"
      | "staffTasks"
      | "communicationPreps";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      groupType: {
        Shape: RockGroupType;
        Name: "RockGroupType";
        Nullable: false;
      };
      campus: {
        Shape: RockCampus | null;
        Name: "RockCampus";
        Nullable: true;
      };
      people: {
        Shape: RockPerson[];
        Name: "RockPerson";
        Nullable: false;
      };
      givingPeople: {
        Shape: RockPerson[];
        Name: "RockPerson";
        Nullable: false;
      };
      members: {
        Shape: RockHouseholdMember[];
        Name: "RockHouseholdMember";
        Nullable: false;
      };
      givingFacts: {
        Shape: GivingFact[];
        Name: "GivingFact";
        Nullable: false;
      };
      staffTasks: {
        Shape: StaffTask[];
        Name: "StaffTask";
        Nullable: false;
      };
      communicationPreps: {
        Shape: CommunicationPrep[];
        Name: "CommunicationPrep";
        Nullable: false;
      };
    };
  };
  RockHouseholdMember: {
    Name: "RockHouseholdMember";
    Shape: RockHouseholdMember;
    Include: Prisma.RockHouseholdMemberInclude;
    Select: Prisma.RockHouseholdMemberSelect;
    OrderBy: Prisma.RockHouseholdMemberOrderByWithRelationInput;
    WhereUnique: Prisma.RockHouseholdMemberWhereUniqueInput;
    Where: Prisma.RockHouseholdMemberWhereInput;
    Create: {};
    Update: {};
    RelationName: "lastSyncRun" | "household" | "person" | "groupRole";
    ListRelations: never;
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      household: {
        Shape: RockHousehold;
        Name: "RockHousehold";
        Nullable: false;
      };
      person: {
        Shape: RockPerson;
        Name: "RockPerson";
        Nullable: false;
      };
      groupRole: {
        Shape: RockGroupRole | null;
        Name: "RockGroupRole";
        Nullable: true;
      };
    };
  };
  RockGroup: {
    Name: "RockGroup";
    Shape: RockGroup;
    Include: Prisma.RockGroupInclude;
    Select: Prisma.RockGroupSelect;
    OrderBy: Prisma.RockGroupOrderByWithRelationInput;
    WhereUnique: Prisma.RockGroupWhereUniqueInput;
    Where: Prisma.RockGroupWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "groupType"
      | "campus"
      | "parentGroup"
      | "childGroups"
      | "members";
    ListRelations: "childGroups" | "members";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      groupType: {
        Shape: RockGroupType;
        Name: "RockGroupType";
        Nullable: false;
      };
      campus: {
        Shape: RockCampus | null;
        Name: "RockCampus";
        Nullable: true;
      };
      parentGroup: {
        Shape: RockGroup | null;
        Name: "RockGroup";
        Nullable: true;
      };
      childGroups: {
        Shape: RockGroup[];
        Name: "RockGroup";
        Nullable: false;
      };
      members: {
        Shape: RockGroupMember[];
        Name: "RockGroupMember";
        Nullable: false;
      };
    };
  };
  RockGroupMember: {
    Name: "RockGroupMember";
    Shape: RockGroupMember;
    Include: Prisma.RockGroupMemberInclude;
    Select: Prisma.RockGroupMemberSelect;
    OrderBy: Prisma.RockGroupMemberOrderByWithRelationInput;
    WhereUnique: Prisma.RockGroupMemberWhereUniqueInput;
    Where: Prisma.RockGroupMemberWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "group"
      | "person"
      | "groupType"
      | "groupRole";
    ListRelations: never;
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      group: {
        Shape: RockGroup;
        Name: "RockGroup";
        Nullable: false;
      };
      person: {
        Shape: RockPerson;
        Name: "RockPerson";
        Nullable: false;
      };
      groupType: {
        Shape: RockGroupType;
        Name: "RockGroupType";
        Nullable: false;
      };
      groupRole: {
        Shape: RockGroupRole | null;
        Name: "RockGroupRole";
        Nullable: true;
      };
    };
  };
  RockFinancialAccount: {
    Name: "RockFinancialAccount";
    Shape: RockFinancialAccount;
    Include: Prisma.RockFinancialAccountInclude;
    Select: Prisma.RockFinancialAccountSelect;
    OrderBy: Prisma.RockFinancialAccountOrderByWithRelationInput;
    WhereUnique: Prisma.RockFinancialAccountWhereUniqueInput;
    Where: Prisma.RockFinancialAccountWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "campus"
      | "parentAccount"
      | "childAccounts"
      | "transactionDetails"
      | "scheduledTransactionDetails";
    ListRelations:
      | "childAccounts"
      | "transactionDetails"
      | "scheduledTransactionDetails";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      campus: {
        Shape: RockCampus | null;
        Name: "RockCampus";
        Nullable: true;
      };
      parentAccount: {
        Shape: RockFinancialAccount | null;
        Name: "RockFinancialAccount";
        Nullable: true;
      };
      childAccounts: {
        Shape: RockFinancialAccount[];
        Name: "RockFinancialAccount";
        Nullable: false;
      };
      transactionDetails: {
        Shape: RockFinancialTransactionDetail[];
        Name: "RockFinancialTransactionDetail";
        Nullable: false;
      };
      scheduledTransactionDetails: {
        Shape: RockFinancialScheduledTransactionDetail[];
        Name: "RockFinancialScheduledTransactionDetail";
        Nullable: false;
      };
    };
  };
  RockFinancialTransaction: {
    Name: "RockFinancialTransaction";
    Shape: RockFinancialTransaction;
    Include: Prisma.RockFinancialTransactionInclude;
    Select: Prisma.RockFinancialTransactionSelect;
    OrderBy: Prisma.RockFinancialTransactionOrderByWithRelationInput;
    WhereUnique: Prisma.RockFinancialTransactionWhereUniqueInput;
    Where: Prisma.RockFinancialTransactionWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "authorizedPersonAlias"
      | "authorizedPerson"
      | "scheduledTransaction"
      | "sourceType"
      | "transactionType"
      | "details"
      | "givingFacts";
    ListRelations: "details" | "givingFacts";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      authorizedPersonAlias: {
        Shape: RockPersonAlias | null;
        Name: "RockPersonAlias";
        Nullable: true;
      };
      authorizedPerson: {
        Shape: RockPerson | null;
        Name: "RockPerson";
        Nullable: true;
      };
      scheduledTransaction: {
        Shape: RockFinancialScheduledTransaction | null;
        Name: "RockFinancialScheduledTransaction";
        Nullable: true;
      };
      sourceType: {
        Shape: RockDefinedValue | null;
        Name: "RockDefinedValue";
        Nullable: true;
      };
      transactionType: {
        Shape: RockDefinedValue | null;
        Name: "RockDefinedValue";
        Nullable: true;
      };
      details: {
        Shape: RockFinancialTransactionDetail[];
        Name: "RockFinancialTransactionDetail";
        Nullable: false;
      };
      givingFacts: {
        Shape: GivingFact[];
        Name: "GivingFact";
        Nullable: false;
      };
    };
  };
  RockFinancialTransactionDetail: {
    Name: "RockFinancialTransactionDetail";
    Shape: RockFinancialTransactionDetail;
    Include: Prisma.RockFinancialTransactionDetailInclude;
    Select: Prisma.RockFinancialTransactionDetailSelect;
    OrderBy: Prisma.RockFinancialTransactionDetailOrderByWithRelationInput;
    WhereUnique: Prisma.RockFinancialTransactionDetailWhereUniqueInput;
    Where: Prisma.RockFinancialTransactionDetailWhereInput;
    Create: {};
    Update: {};
    RelationName: "lastSyncRun" | "transaction" | "account" | "givingFacts";
    ListRelations: "givingFacts";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      transaction: {
        Shape: RockFinancialTransaction;
        Name: "RockFinancialTransaction";
        Nullable: false;
      };
      account: {
        Shape: RockFinancialAccount;
        Name: "RockFinancialAccount";
        Nullable: false;
      };
      givingFacts: {
        Shape: GivingFact[];
        Name: "GivingFact";
        Nullable: false;
      };
    };
  };
  RockFinancialScheduledTransaction: {
    Name: "RockFinancialScheduledTransaction";
    Shape: RockFinancialScheduledTransaction;
    Include: Prisma.RockFinancialScheduledTransactionInclude;
    Select: Prisma.RockFinancialScheduledTransactionSelect;
    OrderBy: Prisma.RockFinancialScheduledTransactionOrderByWithRelationInput;
    WhereUnique: Prisma.RockFinancialScheduledTransactionWhereUniqueInput;
    Where: Prisma.RockFinancialScheduledTransactionWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "authorizedPersonAlias"
      | "authorizedPerson"
      | "transactionFrequency"
      | "transactions"
      | "details"
      | "givingFacts";
    ListRelations: "transactions" | "details" | "givingFacts";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      authorizedPersonAlias: {
        Shape: RockPersonAlias | null;
        Name: "RockPersonAlias";
        Nullable: true;
      };
      authorizedPerson: {
        Shape: RockPerson | null;
        Name: "RockPerson";
        Nullable: true;
      };
      transactionFrequency: {
        Shape: RockDefinedValue | null;
        Name: "RockDefinedValue";
        Nullable: true;
      };
      transactions: {
        Shape: RockFinancialTransaction[];
        Name: "RockFinancialTransaction";
        Nullable: false;
      };
      details: {
        Shape: RockFinancialScheduledTransactionDetail[];
        Name: "RockFinancialScheduledTransactionDetail";
        Nullable: false;
      };
      givingFacts: {
        Shape: GivingFact[];
        Name: "GivingFact";
        Nullable: false;
      };
    };
  };
  RockFinancialScheduledTransactionDetail: {
    Name: "RockFinancialScheduledTransactionDetail";
    Shape: RockFinancialScheduledTransactionDetail;
    Include: Prisma.RockFinancialScheduledTransactionDetailInclude;
    Select: Prisma.RockFinancialScheduledTransactionDetailSelect;
    OrderBy: Prisma.RockFinancialScheduledTransactionDetailOrderByWithRelationInput;
    WhereUnique: Prisma.RockFinancialScheduledTransactionDetailWhereUniqueInput;
    Where: Prisma.RockFinancialScheduledTransactionDetailWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "scheduledTransaction"
      | "account"
      | "givingFacts";
    ListRelations: "givingFacts";
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      scheduledTransaction: {
        Shape: RockFinancialScheduledTransaction;
        Name: "RockFinancialScheduledTransaction";
        Nullable: false;
      };
      account: {
        Shape: RockFinancialAccount;
        Name: "RockFinancialAccount";
        Nullable: false;
      };
      givingFacts: {
        Shape: GivingFact[];
        Name: "GivingFact";
        Nullable: false;
      };
    };
  };
  GivingFact: {
    Name: "GivingFact";
    Shape: GivingFact;
    Include: Prisma.GivingFactInclude;
    Select: Prisma.GivingFactSelect;
    OrderBy: Prisma.GivingFactOrderByWithRelationInput;
    WhereUnique: Prisma.GivingFactWhereUniqueInput;
    Where: Prisma.GivingFactWhereInput;
    Create: {};
    Update: {};
    RelationName:
      | "lastSyncRun"
      | "transaction"
      | "transactionDetail"
      | "scheduledTransaction"
      | "scheduledTransactionDetail"
      | "person"
      | "household";
    ListRelations: never;
    Relations: {
      lastSyncRun: {
        Shape: SyncRun;
        Name: "SyncRun";
        Nullable: false;
      };
      transaction: {
        Shape: RockFinancialTransaction | null;
        Name: "RockFinancialTransaction";
        Nullable: true;
      };
      transactionDetail: {
        Shape: RockFinancialTransactionDetail | null;
        Name: "RockFinancialTransactionDetail";
        Nullable: true;
      };
      scheduledTransaction: {
        Shape: RockFinancialScheduledTransaction | null;
        Name: "RockFinancialScheduledTransaction";
        Nullable: true;
      };
      scheduledTransactionDetail: {
        Shape: RockFinancialScheduledTransactionDetail | null;
        Name: "RockFinancialScheduledTransactionDetail";
        Nullable: true;
      };
      person: {
        Shape: RockPerson | null;
        Name: "RockPerson";
        Nullable: true;
      };
      household: {
        Shape: RockHousehold | null;
        Name: "RockHousehold";
        Nullable: true;
      };
    };
  };
  StaffTask: {
    Name: "StaffTask";
    Shape: StaffTask;
    Include: Prisma.StaffTaskInclude;
    Select: Prisma.StaffTaskSelect;
    OrderBy: Prisma.StaffTaskOrderByWithRelationInput;
    WhereUnique: Prisma.StaffTaskWhereUniqueInput;
    Where: Prisma.StaffTaskWhereInput;
    Create: {};
    Update: {};
    RelationName: "assignedTo" | "person" | "household";
    ListRelations: never;
    Relations: {
      assignedTo: {
        Shape: AppUser | null;
        Name: "AppUser";
        Nullable: true;
      };
      person: {
        Shape: RockPerson | null;
        Name: "RockPerson";
        Nullable: true;
      };
      household: {
        Shape: RockHousehold | null;
        Name: "RockHousehold";
        Nullable: true;
      };
    };
  };
  CommunicationPrep: {
    Name: "CommunicationPrep";
    Shape: CommunicationPrep;
    Include: Prisma.CommunicationPrepInclude;
    Select: Prisma.CommunicationPrepSelect;
    OrderBy: Prisma.CommunicationPrepOrderByWithRelationInput;
    WhereUnique: Prisma.CommunicationPrepWhereUniqueInput;
    Where: Prisma.CommunicationPrepWhereInput;
    Create: {};
    Update: {};
    RelationName: "createdBy" | "person" | "household";
    ListRelations: never;
    Relations: {
      createdBy: {
        Shape: AppUser | null;
        Name: "AppUser";
        Nullable: true;
      };
      person: {
        Shape: RockPerson | null;
        Name: "RockPerson";
        Nullable: true;
      };
      household: {
        Shape: RockHousehold | null;
        Name: "RockHousehold";
        Nullable: true;
      };
    };
  };
}
export function getDatamodel(): PothosPrismaDatamodel {
  return JSON.parse(
    '{"datamodel":{"models":{"AppUser":{"fields":[{"type":"String","kind":"scalar","name":"id","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"auth0Subject","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"email","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"name","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"AppRole","kind":"enum","name":"role","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"active","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockPersonId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"createdAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"updatedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"StaffTask","kind":"object","name":"staffTasks","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"AppUserToStaffTask","relationFromFields":[],"isUpdatedAt":false},{"type":"CommunicationPrep","kind":"object","name":"communicationPreps","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"AppUserToCommunicationPrep","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"AccessRequest":{"fields":[{"type":"String","kind":"scalar","name":"id","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"auth0Subject","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"email","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"name","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"AccessRequestStatus","kind":"enum","name":"status","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"createdAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"updatedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true}],"primaryKey":null,"uniqueIndexes":[]},"SyncRun":{"fields":[{"type":"String","kind":"scalar","name":"id","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"source","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRunStatus","kind":"enum","name":"status","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"startedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"completedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSourceDate","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"recordsRead","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"recordsWritten","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"recordsSkipped","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"errorMessage","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"createdAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncIssue","kind":"object","name":"issues","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"SyncIssueToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroupType","kind":"object","name":"groupTypes","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupTypeToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroupRole","kind":"object","name":"groupRoles","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupRoleToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockDefinedValue","kind":"object","name":"definedValues","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockDefinedValueToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockPersonAlias","kind":"object","name":"personAliases","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockPersonAliasToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockCampus","kind":"object","name":"campuses","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"people","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockPersonToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"households","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockHouseholdMember","kind":"object","name":"householdMembers","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdMemberToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroup","kind":"object","name":"groups","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroupMember","kind":"object","name":"groupMembers","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupMemberToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialAccount","kind":"object","name":"financialAccounts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialAccountToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialTransaction","kind":"object","name":"financialTransactions","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialTransactionDetail","kind":"object","name":"financialTransactionDetails","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionDetailToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransaction","kind":"object","name":"financialScheduledTransactions","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransactionDetail","kind":"object","name":"financialScheduledTransactionDetails","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionDetailToSyncRun","relationFromFields":[],"isUpdatedAt":false},{"type":"GivingFact","kind":"object","name":"givingFacts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToSyncRun","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"SyncIssue":{"fields":[{"type":"String","kind":"scalar","name":"id","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"syncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncIssueSeverity","kind":"enum","name":"severity","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncIssueStatus","kind":"enum","name":"status","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"source","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"recordType","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"code","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"message","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Json","kind":"scalar","name":"redactedDetail","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"createdAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"resolvedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"syncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"SyncIssueToSyncRun","relationFromFields":["syncRunId"],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockGroupType":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"name","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"order","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupTypeToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"households","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupTypeToRockHousehold","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroup","kind":"object","name":"groups","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupToRockGroupType","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroupRole","kind":"object","name":"groupRoles","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupRoleToRockGroupType","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroupMember","kind":"object","name":"groupMembers","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupMemberToRockGroupType","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockGroupRole":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupTypeRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"name","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"order","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"maxCount","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"minCount","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupRoleToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockGroupType","kind":"object","name":"groupType","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupRoleToRockGroupType","relationFromFields":["groupTypeRockId"],"isUpdatedAt":false},{"type":"RockHouseholdMember","kind":"object","name":"householdMembers","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupRoleToRockHouseholdMember","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroupMember","kind":"object","name":"groupMembers","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupMemberToRockGroupRole","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockDefinedValue":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"definedTypeRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"value","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"description","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"active","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"order","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockDefinedValueToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"peopleRecordStatuses","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonRecordStatus","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialTransaction","kind":"object","name":"transactionSources","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"FinancialTransactionSource","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialTransaction","kind":"object","name":"transactionTypes","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"FinancialTransactionType","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransaction","kind":"object","name":"scheduledTransactionFrequencies","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"ScheduledTransactionFrequency","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockPersonAlias":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"personRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockPersonAliasToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"person","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonAliases","relationFromFields":["personRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"primaryForPeople","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonPrimaryAlias","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialTransaction","kind":"object","name":"authorizedTransactions","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionToRockPersonAlias","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransaction","kind":"object","name":"authorizedScheduledGifts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToRockPersonAlias","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockCampus":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"name","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"shortCode","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"active","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"people","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToRockPerson","relationFromFields":[],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"households","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToRockHousehold","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroup","kind":"object","name":"groups","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToRockGroup","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialAccount","kind":"object","name":"financialAccounts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToRockFinancialAccount","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockPerson":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"primaryAliasRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"primaryAliasGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"givingGroupRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"givingId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"givingLeaderRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"primaryFamilyRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"primaryCampusRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"firstName","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"nickName","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"lastName","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"email","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"emailActive","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"recordStatusValueRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"deceased","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockPersonToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockPersonAlias","kind":"object","name":"primaryAlias","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonPrimaryAlias","relationFromFields":["primaryAliasRockId"],"isUpdatedAt":false},{"type":"RockCampus","kind":"object","name":"primaryCampus","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToRockPerson","relationFromFields":["primaryCampusRockId"],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"primaryHousehold","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdToRockPerson","relationFromFields":["primaryFamilyRockId"],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"givingHousehold","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonGivingHousehold","relationFromFields":["givingGroupRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"givingLeader","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonGivingLeader","relationFromFields":["givingLeaderRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"givingMembers","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonGivingLeader","relationFromFields":[],"isUpdatedAt":false},{"type":"RockPersonAlias","kind":"object","name":"aliases","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonAliases","relationFromFields":[],"isUpdatedAt":false},{"type":"RockDefinedValue","kind":"object","name":"recordStatus","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonRecordStatus","relationFromFields":["recordStatusValueRockId"],"isUpdatedAt":false},{"type":"RockHouseholdMember","kind":"object","name":"householdMembers","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdMemberToRockPerson","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroupMember","kind":"object","name":"groupMembers","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupMemberToRockPerson","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialTransaction","kind":"object","name":"transactions","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionToRockPerson","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransaction","kind":"object","name":"scheduledTransactions","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToRockPerson","relationFromFields":[],"isUpdatedAt":false},{"type":"GivingFact","kind":"object","name":"givingFacts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockPerson","relationFromFields":[],"isUpdatedAt":false},{"type":"StaffTask","kind":"object","name":"staffTasks","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockPersonToStaffTask","relationFromFields":[],"isUpdatedAt":false},{"type":"CommunicationPrep","kind":"object","name":"communicationPreps","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"CommunicationPrepToRockPerson","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockHousehold":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupTypeRockId","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"givingId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"campusRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"name","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"active","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"archived","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockGroupType","kind":"object","name":"groupType","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupTypeToRockHousehold","relationFromFields":["groupTypeRockId"],"isUpdatedAt":false},{"type":"RockCampus","kind":"object","name":"campus","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToRockHousehold","relationFromFields":["campusRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"people","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdToRockPerson","relationFromFields":[],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"givingPeople","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"PersonGivingHousehold","relationFromFields":[],"isUpdatedAt":false},{"type":"RockHouseholdMember","kind":"object","name":"members","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdToRockHouseholdMember","relationFromFields":[],"isUpdatedAt":false},{"type":"GivingFact","kind":"object","name":"givingFacts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockHousehold","relationFromFields":[],"isUpdatedAt":false},{"type":"StaffTask","kind":"object","name":"staffTasks","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdToStaffTask","relationFromFields":[],"isUpdatedAt":false},{"type":"CommunicationPrep","kind":"object","name":"communicationPreps","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"CommunicationPrepToRockHousehold","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockHouseholdMember":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"householdRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"personRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupRoleRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupMemberStatus","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"archived","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdMemberToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"household","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdToRockHouseholdMember","relationFromFields":["householdRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"person","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdMemberToRockPerson","relationFromFields":["personRockId"],"isUpdatedAt":false},{"type":"RockGroupRole","kind":"object","name":"groupRole","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupRoleToRockHouseholdMember","relationFromFields":["groupRoleRockId"],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[{"name":null,"fields":["householdRockId","personRockId"]}]},"RockGroup":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupTypeRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"parentGroupRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"campusRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"name","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"active","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"archived","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockGroupType","kind":"object","name":"groupType","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupToRockGroupType","relationFromFields":["groupTypeRockId"],"isUpdatedAt":false},{"type":"RockCampus","kind":"object","name":"campus","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToRockGroup","relationFromFields":["campusRockId"],"isUpdatedAt":false},{"type":"RockGroup","kind":"object","name":"parentGroup","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GroupHierarchy","relationFromFields":["parentGroupRockId"],"isUpdatedAt":false},{"type":"RockGroup","kind":"object","name":"childGroups","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GroupHierarchy","relationFromFields":[],"isUpdatedAt":false},{"type":"RockGroupMember","kind":"object","name":"members","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupToRockGroupMember","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockGroupMember":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"personRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupTypeRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupRoleRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"groupMemberStatus","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"archived","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"activeConnectGroup","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupMemberToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockGroup","kind":"object","name":"group","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupToRockGroupMember","relationFromFields":["groupRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"person","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupMemberToRockPerson","relationFromFields":["personRockId"],"isUpdatedAt":false},{"type":"RockGroupType","kind":"object","name":"groupType","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupMemberToRockGroupType","relationFromFields":["groupTypeRockId"],"isUpdatedAt":false},{"type":"RockGroupRole","kind":"object","name":"groupRole","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockGroupMemberToRockGroupRole","relationFromFields":["groupRoleRockId"],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[{"name":null,"fields":["groupRockId","personRockId","groupRoleRockId"]}]},"RockFinancialAccount":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"parentAccountRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"campusRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"name","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"active","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"public","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"taxDeductible","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"startDate","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"endDate","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialAccountToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockCampus","kind":"object","name":"campus","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockCampusToRockFinancialAccount","relationFromFields":["campusRockId"],"isUpdatedAt":false},{"type":"RockFinancialAccount","kind":"object","name":"parentAccount","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"FinancialAccountHierarchy","relationFromFields":["parentAccountRockId"],"isUpdatedAt":false},{"type":"RockFinancialAccount","kind":"object","name":"childAccounts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"FinancialAccountHierarchy","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialTransactionDetail","kind":"object","name":"transactionDetails","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialAccountToRockFinancialTransactionDetail","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransactionDetail","kind":"object","name":"scheduledTransactionDetails","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialAccountToRockFinancialScheduledTransactionDetail","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockFinancialTransaction":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"authorizedPersonAliasRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"authorizedPersonRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"scheduledTransactionRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"transactionDate","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"transactionDateKey","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"status","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"statusMessage","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"sourceTypeValueRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"transactionTypeValueRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"reconciled","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"settled","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"showAsAnonymous","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockPersonAlias","kind":"object","name":"authorizedPersonAlias","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionToRockPersonAlias","relationFromFields":["authorizedPersonAliasRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"authorizedPerson","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionToRockPerson","relationFromFields":["authorizedPersonRockId"],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransaction","kind":"object","name":"scheduledTransaction","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToRockFinancialTransaction","relationFromFields":["scheduledTransactionRockId"],"isUpdatedAt":false},{"type":"RockDefinedValue","kind":"object","name":"sourceType","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"FinancialTransactionSource","relationFromFields":["sourceTypeValueRockId"],"isUpdatedAt":false},{"type":"RockDefinedValue","kind":"object","name":"transactionType","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"FinancialTransactionType","relationFromFields":["transactionTypeValueRockId"],"isUpdatedAt":false},{"type":"RockFinancialTransactionDetail","kind":"object","name":"details","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionToRockFinancialTransactionDetail","relationFromFields":[],"isUpdatedAt":false},{"type":"GivingFact","kind":"object","name":"givingFacts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockFinancialTransaction","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockFinancialTransactionDetail":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"transactionRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"accountRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Decimal","kind":"scalar","name":"amount","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Decimal","kind":"scalar","name":"feeAmount","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionDetailToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockFinancialTransaction","kind":"object","name":"transaction","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialTransactionToRockFinancialTransactionDetail","relationFromFields":["transactionRockId"],"isUpdatedAt":false},{"type":"RockFinancialAccount","kind":"object","name":"account","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialAccountToRockFinancialTransactionDetail","relationFromFields":["accountRockId"],"isUpdatedAt":false},{"type":"GivingFact","kind":"object","name":"givingFacts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockFinancialTransactionDetail","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockFinancialScheduledTransaction":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"authorizedPersonAliasRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"authorizedPersonRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"transactionFrequencyValueRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"startDate","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"endDate","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"nextPaymentDate","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Boolean","kind":"scalar","name":"active","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"status","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"statusMessage","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockPersonAlias","kind":"object","name":"authorizedPersonAlias","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToRockPersonAlias","relationFromFields":["authorizedPersonAliasRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"authorizedPerson","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToRockPerson","relationFromFields":["authorizedPersonRockId"],"isUpdatedAt":false},{"type":"RockDefinedValue","kind":"object","name":"transactionFrequency","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"ScheduledTransactionFrequency","relationFromFields":["transactionFrequencyValueRockId"],"isUpdatedAt":false},{"type":"RockFinancialTransaction","kind":"object","name":"transactions","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToRockFinancialTransaction","relationFromFields":[],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransactionDetail","kind":"object","name":"details","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToRockFinancialScheduledTransactionDetail","relationFromFields":[],"isUpdatedAt":false},{"type":"GivingFact","kind":"object","name":"givingFacts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockFinancialScheduledTransaction","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"RockFinancialScheduledTransactionDetail":{"fields":[{"type":"Int","kind":"scalar","name":"rockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"rockGuid","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":true,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"scheduledTransactionRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"accountRockId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Decimal","kind":"scalar","name":"amount","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastSyncedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionDetailToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransaction","kind":"object","name":"scheduledTransaction","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialScheduledTransactionToRockFinancialScheduledTransactionDetail","relationFromFields":["scheduledTransactionRockId"],"isUpdatedAt":false},{"type":"RockFinancialAccount","kind":"object","name":"account","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockFinancialAccountToRockFinancialScheduledTransactionDetail","relationFromFields":["accountRockId"],"isUpdatedAt":false},{"type":"GivingFact","kind":"object","name":"givingFacts","isRequired":true,"isList":true,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockFinancialScheduledTransactionDetail","relationFromFields":[],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"GivingFact":{"fields":[{"type":"String","kind":"scalar","name":"id","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"GiftReliabilityKind","kind":"enum","name":"reliabilityKind","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"transactionRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"transactionDetailRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"scheduledTransactionRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"scheduledTransactionDetailRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"personRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"householdRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"accountRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"campusRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Decimal","kind":"scalar","name":"amount","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"occurredAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"effectiveMonth","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"explanation","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"sourceUpdatedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"firstDerivedAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"lastDerivedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"String","kind":"scalar","name":"lastSyncRunId","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"SyncRun","kind":"object","name":"lastSyncRun","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToSyncRun","relationFromFields":["lastSyncRunId"],"isUpdatedAt":false},{"type":"RockFinancialTransaction","kind":"object","name":"transaction","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockFinancialTransaction","relationFromFields":["transactionRockId"],"isUpdatedAt":false},{"type":"RockFinancialTransactionDetail","kind":"object","name":"transactionDetail","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockFinancialTransactionDetail","relationFromFields":["transactionDetailRockId"],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransaction","kind":"object","name":"scheduledTransaction","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockFinancialScheduledTransaction","relationFromFields":["scheduledTransactionRockId"],"isUpdatedAt":false},{"type":"RockFinancialScheduledTransactionDetail","kind":"object","name":"scheduledTransactionDetail","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockFinancialScheduledTransactionDetail","relationFromFields":["scheduledTransactionDetailRockId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"person","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockPerson","relationFromFields":["personRockId"],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"household","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"GivingFactToRockHousehold","relationFromFields":["householdRockId"],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"StaffTask":{"fields":[{"type":"String","kind":"scalar","name":"id","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"title","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"description","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"StaffTaskStatus","kind":"enum","name":"status","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"StaffTaskPriority","kind":"enum","name":"priority","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"assignedToUserId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"personRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"householdRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"dueAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"completedAt","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"createdAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"updatedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"AppUser","kind":"object","name":"assignedTo","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"AppUserToStaffTask","relationFromFields":["assignedToUserId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"person","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockPersonToStaffTask","relationFromFields":["personRockId"],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"household","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"RockHouseholdToStaffTask","relationFromFields":["householdRockId"],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]},"CommunicationPrep":{"fields":[{"type":"String","kind":"scalar","name":"id","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":true,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"title","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"CommunicationPrepStatus","kind":"enum","name":"status","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"segmentSummary","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"handoffTarget","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"String","kind":"scalar","name":"createdByUserId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"personRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"Int","kind":"scalar","name":"householdRockId","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"createdAt","isRequired":true,"isList":false,"hasDefaultValue":true,"isUnique":false,"isId":false,"isUpdatedAt":false},{"type":"DateTime","kind":"scalar","name":"updatedAt","isRequired":true,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"isUpdatedAt":true},{"type":"AppUser","kind":"object","name":"createdBy","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"AppUserToCommunicationPrep","relationFromFields":["createdByUserId"],"isUpdatedAt":false},{"type":"RockPerson","kind":"object","name":"person","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"CommunicationPrepToRockPerson","relationFromFields":["personRockId"],"isUpdatedAt":false},{"type":"RockHousehold","kind":"object","name":"household","isRequired":false,"isList":false,"hasDefaultValue":false,"isUnique":false,"isId":false,"relationName":"CommunicationPrepToRockHousehold","relationFromFields":["householdRockId"],"isUpdatedAt":false}],"primaryKey":null,"uniqueIndexes":[]}}}}',
  );
}
