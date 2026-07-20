import { describe, expect, it, vi, beforeEach } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { PeopleConnection } from "@/lib/list-views/people-list";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  listPeople: vi.fn(),
  listSavedListViews: vi.fn(),
  redirect: vi.fn(),
  shellProps: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: vi.fn(async () => null),
  },
}));

vi.mock("@/lib/auth/access-control", () => ({
  getCurrentAccessState: vi.fn(async () => mocks.accessState),
}));

vi.mock("@/lib/list-views/campus-options", () => ({
  getCampusFilterOptions: vi.fn(async () => []),
}));

vi.mock("@/lib/list-views/connection-status-options", () => ({
  getPersonConnectionStatusFilterOptions: vi.fn(async () => []),
}));

vi.mock("@/lib/list-views/filter-catalog", () => ({
  getListViewFilterCatalog: vi.fn(() => []),
}));

vi.mock("@/lib/list-views/people-list", () => ({
  listPeople: mocks.listPeople,
}));

vi.mock("@/lib/list-views/record-status-options", () => ({
  getPersonRecordStatusFilterOptions: vi.fn(async () => []),
}));

vi.mock("@/lib/list-views/saved-views", () => ({
  listSavedListViews: mocks.listSavedListViews,
}));

vi.mock("@/components/list-views/list-view-shell", () => ({
  ListViewShell: (props: unknown) => {
    mocks.shellProps(props);

    return <div data-testid="people-list-shell" />;
  },
}));

import PeopleLookupPage from "@/app/people/page";

const accessUser = {
  active: true,
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  id: "user_1",
  name: "Admin",
  rockPersonId: null,
  role: "ADMIN" as const,
};

const emptyPeopleConnection: PeopleConnection = {
  appliedView: {
    id: "segment_1",
    name: "New people",
    pageSize: 50,
  },
  edges: [],
  pageInfo: {
    endCursor: null,
    hasNextPage: false,
  },
  resultCount: {
    filtered: 0,
    total: 0,
  },
};

describe("PeopleLookupPage", () => {
  beforeEach(() => {
    mocks.accessState = { status: "authorized", user: accessUser };
    mocks.listPeople.mockResolvedValue(emptyPeopleConnection);
    mocks.listSavedListViews.mockResolvedValue([]);
    mocks.redirect.mockClear();
    mocks.shellProps.mockClear();
  });

  it("lets saved segments provide their saved filters when no URL filters are present", async () => {
    await PeopleLookupPage({
      searchParams: Promise.resolve({ savedViewId: "segment_1" }),
    });

    expect(mocks.listPeople).toHaveBeenCalledWith(
      expect.objectContaining({
        filterDefinition: undefined,
        savedViewId: "segment_1",
      }),
      accessUser,
    );
  });

  it("uses explicit URL filters when a saved segment is being adjusted", async () => {
    await PeopleLookupPage({
      searchParams: Promise.resolve({
        lifecycle: "NEW",
        savedViewId: "segment_1",
      }),
    });

    expect(mocks.listPeople).toHaveBeenCalledWith(
      expect.objectContaining({
        filterDefinition: {
          conditions: [
            {
              field: "lifecycle",
              operator: "EQUALS",
              type: "condition",
              value: "NEW",
            },
          ],
          mode: "all",
          type: "group",
        },
        savedViewId: "segment_1",
      }),
      accessUser,
    );
  });
});
