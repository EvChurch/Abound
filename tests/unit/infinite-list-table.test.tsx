import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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

describe("InfiniteListTable", () => {
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
});
