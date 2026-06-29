import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InfiniteListTable } from "@/components/list-views/infinite-list-table";
import type { PeopleConnection } from "@/lib/list-views/people-list";

const emptyPeopleConnection: PeopleConnection = {
  appliedView: {
    id: null,
    name: "All people",
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

const pagedPeopleConnection: PeopleConnection = {
  ...emptyPeopleConnection,
  edges: Array.from({ length: 50 }, (_, index) => ({
    cursor: `person_${index + 1}`,
    node: {
      amountsHidden: true,
      connectionStatus: null,
      deceased: false,
      displayName: `Person ${index + 1}`,
      email: null,
      emailActive: null,
      givingPresence: [],
      givingSummary: null,
      lastGiftMonth: null,
      lastSyncedAt: new Date("2026-04-20T00:00:00Z"),
      lifecycle: [],
      openTaskCount: 0,
      pledgeSummary: null,
      photoUrl: null,
      primaryCampus: null,
      primaryHousehold: null,
      recordStatus: "Active",
      rockId: index + 1,
    },
  })),
  pageInfo: {
    endCursor: "person_50",
    hasNextPage: true,
  },
  resultCount: {
    filtered: 125,
    total: 200,
  },
};

describe("InfiniteListTable", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        disconnect = vi.fn();
        observe = vi.fn();
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fills remaining workspace height instead of using a full viewport height", () => {
    const { container } = render(
      <InfiniteListTable
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        queryString=""
      />,
    );

    expect(container.firstElementChild).toHaveClass(
      "min-h-0",
      "flex-1",
      "overflow-auto",
    );
    expect(container.firstElementChild).not.toHaveClass("h-[calc(100vh-48px)]");
  });

  it("shows the next loaded people count at the infinite-scroll boundary", () => {
    render(
      <InfiniteListTable
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={pagedPeopleConnection}
        kind="people"
        queryString=""
      />,
    );

    expect(
      screen.getByText("Scroll to load up to 100 people"),
    ).toBeInTheDocument();
  });
});
