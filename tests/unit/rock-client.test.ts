import { describe, expect, it, vi } from "vitest";

import { RockClient } from "@/lib/rock/client";

describe("RockClient", () => {
  it("pages the full sync surface with read-only GET requests", async () => {
    const requests: { method?: string; path: string }[] = [];
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      requests.push({
        method: init?.method,
        path: `${url.pathname}${url.search}`,
      });

      return Response.json(responseFor(url));
    });

    const client = new RockClient({
      baseUrl: "https://rock.example.test",
      restKey: "test-rest-key",
      fetcher: fetcher as typeof fetch,
    });

    const slice = await client.getFullSyncSlice({ pageSize: 2 });

    expect(slice.groupTypes.map((groupType) => groupType.Id)).toEqual([10, 25]);
    expect(slice.groupRoles.map((groupRole) => groupRole.Id)).toEqual([1000]);
    expect(slice.definedValues.map((definedValue) => definedValue.Id)).toEqual([
      2000,
    ]);
    expect(slice.personAliases.map((alias) => alias.Id)).toEqual([
      1001, 1002, 1003,
    ]);
    expect(slice.people).toHaveLength(3);
    expect(slice.familyGroups.map((group) => group.Id)).toEqual([10]);
    expect(slice.familyMembers.map((member) => member.Id)).toEqual([100]);
    expect(requests.every((request) => request.method === "GET")).toBe(true);
    expect(requests).toContainEqual({
      method: "GET",
      path: "/api/People?$orderby=Id%20asc&$top=2&$skip=0",
    });
    expect(requests).toContainEqual({
      method: "GET",
      path: "/api/People?$orderby=Id%20asc&$top=2&$skip=2",
    });
  });

  it("rejects non-allowlisted Rock API paths", async () => {
    const client = new RockClient({
      baseUrl: "https://rock.example.test",
      restKey: "test-rest-key",
      fetcher: vi.fn() as typeof fetch,
    });

    await expect(client.getJson("/api/FinancialBatches")).rejects.toThrow(
      "read allowlist",
    );
  });
});

function responseFor(url: URL) {
  const skip = Number(url.searchParams.get("$skip") ?? 0);

  switch (url.pathname) {
    case "/api/GroupTypes":
      return page(
        [
          { Id: 10, Name: "Family" },
          { Id: 25, Name: "Connect Group" },
        ],
        skip,
      );
    case "/api/GroupTypeRoles":
      return page([{ Id: 1000, GroupTypeId: 25, Name: "Member" }], skip);
    case "/api/DefinedValues":
      return page([{ Id: 2000, DefinedTypeId: 1, Value: "Active" }], skip);
    case "/api/PersonAlias":
      return page(
        [
          { Id: 1001, PersonId: 1 },
          { Id: 1002, PersonId: 2 },
          { Id: 1003, PersonId: 3 },
        ],
        skip,
      );
    case "/api/People":
      return page(
        [
          { Id: 1, PrimaryAliasId: 1001, PrimaryFamilyId: 10 },
          { Id: 2, PrimaryAliasId: 1002, PrimaryFamilyId: 10 },
          { Id: 3, PrimaryAliasId: 1003 },
        ],
        skip,
      );
    case "/api/Groups":
      return page(
        [
          { Id: 10, GroupTypeId: 10, Name: "Sample Family" },
          { Id: 20, GroupTypeId: 25, Name: "Sample Connect Group" },
        ],
        skip,
      );
    case "/api/GroupMembers":
      return page(
        [
          { Id: 100, GroupId: 10, PersonId: 1 },
          { Id: 200, GroupId: 20, PersonId: 1, GroupTypeId: 25 },
        ],
        skip,
      );
    case "/api/Campuses":
      return page([{ Id: 1, Name: "East" }], skip);
    case "/api/FinancialAccounts":
      return page([{ Id: 1, Name: "General" }], skip);
    case "/api/FinancialTransactions":
      return page([{ Id: 1, AuthorizedPersonAliasId: 1001 }], skip);
    case "/api/FinancialTransactionDetails":
      return page(
        [{ Id: 1, TransactionId: 1, AccountId: 1, Amount: 10 }],
        skip,
      );
    case "/api/FinancialScheduledTransactions":
      return page([{ Id: 1, AuthorizedPersonAliasId: 1001 }], skip);
    case "/api/FinancialScheduledTransactionDetails":
      return page(
        [{ Id: 1, ScheduledTransactionId: 1, AccountId: 1, Amount: 10 }],
        skip,
      );
    default:
      return [];
  }
}

function page<T>(values: T[], skip: number) {
  return values.slice(skip, skip + 2);
}
