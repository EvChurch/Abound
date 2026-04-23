import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListViewShell } from "@/components/list-views/list-view-shell";
import type { HouseholdsConnection } from "@/lib/list-views/households-list";
import type { PeopleConnection } from "@/lib/list-views/people-list";

vi.mock("@/components/list-views/infinite-list-table", () => ({
  InfiniteListTable: () => <div data-testid="list-table" />,
}));

const navigationMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  search: "",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: navigationMocks.replace,
  }),
  useSearchParams: () => new URLSearchParams(navigationMocks.search),
}));

const emptyHouseholdsConnection: HouseholdsConnection = {
  appliedView: {
    id: null,
    name: "All households",
    pageSize: 50,
  },
  edges: [],
  pageInfo: {
    endCursor: null,
    hasNextPage: false,
  },
};

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
};

describe("ListViewShell", () => {
  beforeEach(() => {
    navigationMocks.replace.mockClear();
    navigationMocks.search = "";
  });

  it("renders the campus filter as a named dropdown", () => {
    render(
      <ListViewShell
        campusOptions={[
          { label: "Central (CEN)", value: "1" },
          { label: "North", value: "2" },
        ]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyHouseholdsConnection}
        filters={{ campus: "2" }}
        kind="households"
      />,
    );

    const campusSelect = screen.getByRole("combobox", { name: "Campus" });

    expect(campusSelect).toHaveValue("2");
    expect(
      screen.queryByPlaceholderText("Campus number"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Any campus" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "North" })).toBeInTheDocument();
    expect(screen.getAllByText("North")).toHaveLength(2);
  });

  it("renders the unfiltered lifecycle option like the other lifecycle choices", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyHouseholdsConnection}
        kind="households"
      />,
    );

    expect(
      screen.queryByRole("radio", { name: "Any lifecycle" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Any" })).toBeChecked();
    expect(screen.queryByText("0 active")).not.toBeInTheDocument();
  });

  it("renders active filter chips with clear links for individual filters", () => {
    render(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[{ label: "North", value: "2" }]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        filters={{ campus: "2" }}
        kind="people"
        lifecycle="NEW"
        query="smith"
        connectionStatusOptions={[{ label: "Member", value: "Member" }]}
        recordStatusOptions={[{ label: "Active", value: "Active" }]}
      />,
    );

    expect(screen.getAllByText("Lifecycle").length).toBeGreaterThan(0);
    expect(screen.getAllByText("New").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Age").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Adults").length).toBeGreaterThan(0);
    expect(screen.getByText("4 active")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /Clear .+ filter/ }),
    ).toHaveLength(4);
    expect(screen.getByLabelText("Clear Lifecycle filter")).toHaveAttribute(
      "href",
      "/people?q=smith&ageGroup=ADULTS&campus=2",
    );
    expect(screen.getByLabelText("Clear Age filter")).toHaveAttribute(
      "href",
      "/people?q=smith&lifecycle=NEW&campus=2",
    );
    expect(screen.getByLabelText("Clear Campus filter")).toHaveAttribute(
      "href",
      "/people?q=smith&lifecycle=NEW&ageGroup=ADULTS",
    );
  });

  it("moves display selection into the list header without the applied view subtitle", () => {
    render(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "tasks"]}
        connection={emptyPeopleConnection}
        filters={{
          connectionStatus: ["Attendee", "Member"],
          recordStatus: ["Active"],
        }}
        kind="people"
        lifecycle="NEW"
        query="smith"
        connectionStatusOptions={[{ label: "Member", value: "Member" }]}
        recordStatusOptions={[{ label: "Active", value: "Active" }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "People" })).toBeInTheDocument();
    expect(screen.queryByText("All people")).not.toBeInTheDocument();
    expect(screen.queryByText("Default")).not.toBeInTheDocument();
    const columnsButton = screen.getByRole("button", { name: /Display/ });

    expect(columnsButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(columnsButton);

    expect(columnsButton).toHaveAttribute("aria-expanded", "true");

    const lifecycleColumn = screen.getByRole("checkbox", {
      name: "Lifecycle",
    });
    const columnForm = lifecycleColumn.closest("form");

    expect(columnForm).toHaveAttribute("action", "/people");
    expect(columnForm).toHaveFormValues({
      ageGroup: "ADULTS",
      connectionStatus: ["Attendee", "Member"],
      lifecycle: "NEW",
      q: "smith",
      recordStatus: "Active",
    });
  });

  it("renders visible status controls for people and households", () => {
    const { rerender } = render(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        filters={{
          connectionStatus: ["Attendee", "Member"],
          recordStatus: ["Active"],
        }}
        kind="people"
        connectionStatusOptions={[
          { label: "Attendee", value: "Attendee" },
          { label: "Member", value: "Member" },
        ]}
        recordStatusOptions={[
          { label: "Active", value: "Active" },
          { label: "Inactive", value: "Inactive" },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Person status/ }));

    expect(screen.getByRole("checkbox", { name: "Attendee" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Member" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Active" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Inactive" }),
    ).not.toBeChecked();
    expect(screen.getByLabelText("Clear Connection filter")).toHaveAttribute(
      "href",
      "/people?ageGroup=ADULTS&recordStatus=Active",
    );
    expect(screen.getByLabelText("Clear Record filter")).toHaveAttribute(
      "href",
      "/people?ageGroup=ADULTS&connectionStatus=Attendee&connectionStatus=Member",
    );

    rerender(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        filters={{
          recordStatus: ["Active"],
        }}
        kind="people"
        connectionStatusOptions={[
          { label: "Attendee", value: "Attendee" },
          { label: "Member", value: "Member" },
        ]}
        recordStatusOptions={[
          { label: "Active", value: "Active" },
          { label: "Inactive", value: "Inactive" },
        ]}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: "Attendee" }),
    ).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Member" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Active" })).toBeChecked();

    rerender(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyHouseholdsConnection}
        filters={{ rockStatus: "archived" }}
        kind="households"
      />,
    );

    expect(
      screen.getByRole("combobox", { name: "Household status" }),
    ).toHaveValue("archived");
    expect(
      screen.getByRole("option", { name: "Current household" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Clear Household filter")).toHaveAttribute(
      "href",
      "/households",
    );
  });

  it("renders pledge management as a multi-choice people filter section", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        filters={{ pledgeState: ["review", "active"] }}
        kind="people"
        connectionStatusOptions={[{ label: "Member", value: "Member" }]}
        recordStatusOptions={[{ label: "Active", value: "Active" }]}
      />,
    );

    expect(screen.getAllByText("Pledge").length).toBeGreaterThan(0);
    expect(screen.getByText("Review, Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pledge/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("checkbox", { name: "Review recommended pledge" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Active pledge" }),
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Draft pledge" }),
    ).not.toBeChecked();
    expect(screen.getByLabelText("Clear Pledge filter")).toHaveAttribute(
      "href",
      "/people",
    );
  });

  it("keeps search visible while accordion filter groups use one open panel", async () => {
    render(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[{ label: "North", value: "2" }]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        filters={{ campus: "2" }}
        kind="people"
        query="smith"
        connectionStatusOptions={[{ label: "Member", value: "Member" }]}
        recordStatusOptions={[{ label: "Active", value: "Active" }]}
      />,
    );

    expect(screen.getByPlaceholderText("Name or email")).toHaveValue("smith");

    const audienceButton = screen.getByRole("button", { name: /Audience/ });
    const statusButton = screen.getByRole("button", {
      name: /Person status/,
    });

    expect(audienceButton).toHaveAttribute("aria-expanded", "true");
    expect(statusButton).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("combobox", { name: "Campus" })).toHaveValue("2");

    fireEvent.click(statusButton);

    expect(audienceButton).toHaveAttribute("aria-expanded", "false");
    expect(statusButton).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => {
      expect(screen.queryByRole("combobox", { name: "Campus" })).toBeNull();
    });
    expect(screen.getByRole("checkbox", { name: "Member" })).not.toBeChecked();
  });

  it("soft-navigates filter changes while preserving closed accordion filters", () => {
    navigationMocks.search =
      "q=smith&ageGroup=ADULTS&campus=2&connectionStatus=Member&recordStatus=Active&columns=campus,tasks&after=cursor_1";

    render(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[{ label: "North", value: "2" }]}
        catalog={[]}
        columns={["campus", "tasks"]}
        connection={emptyPeopleConnection}
        filters={{
          campus: "2",
          connectionStatus: ["Member"],
          recordStatus: ["Active"],
        }}
        kind="people"
        query="smith"
        connectionStatusOptions={[{ label: "Member", value: "Member" }]}
        recordStatusOptions={[{ label: "Active", value: "Active" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Person status/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Member" }));

    expect(navigationMocks.replace).toHaveBeenCalledTimes(1);

    const [href, options] = navigationMocks.replace.mock.calls[0] as [
      string,
      { scroll: boolean },
    ];

    expect(href).toContain("/people?");
    expect(href).toContain("q=smith");
    expect(href).toContain("ageGroup=ADULTS");
    expect(href).toContain("campus=2");
    expect(href).toContain("columns=campus%2Ctasks");
    expect(href).toContain("recordStatus=Active");
    expect(href).not.toContain("connectionStatus");
    expect(href).not.toContain("after=");
    expect(options).toEqual({ scroll: false });
  });
});
