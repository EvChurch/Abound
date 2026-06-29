import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ListViewShell } from "@/components/list-views/list-view-shell";
import type { HouseholdsConnection } from "@/lib/list-views/households-list";
import type { PeopleConnection } from "@/lib/list-views/people-list";

const infiniteListTableMocks = vi.hoisted(() => ({
  props: vi.fn(),
}));

vi.mock("@/components/navigation/app-top-nav", () => ({
  AppTopNav: () => <nav aria-label="Primary">Top nav</nav>,
}));

vi.mock("@/components/list-views/infinite-list-table", () => ({
  InfiniteListTable: (props: unknown) => {
    infiniteListTableMocks.props(props);

    return <div data-testid="list-table" />;
  },
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
  resultCount: {
    filtered: 12,
    total: 3456,
  },
};

describe("ListViewShell", () => {
  beforeEach(() => {
    infiniteListTableMocks.props.mockClear();
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

    const campusSelect = screen.getByRole("button", { name: /campus/i });

    expect(campusSelect).toHaveTextContent("North");
    expect(
      screen.queryByPlaceholderText("Campus number"),
    ).not.toBeInTheDocument();

    fireEvent.click(campusSelect);

    expect(
      screen.getByRole("option", { name: "Any campus" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "North" })).toBeInTheDocument();
    expect(screen.getAllByText("North")).toHaveLength(3);
  });

  it("shows the filtered and total people count under the heading", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    expect(screen.getByText("Showing 12 of 3,456 people")).toBeInTheDocument();
  });

  it("carries the saved view id into infinite-loading requests", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={{
          ...emptyPeopleConnection,
          appliedView: {
            ...emptyPeopleConnection.appliedView,
            id: "view_123",
          },
        }}
        kind="people"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    expect(infiniteListTableMocks.props).toHaveBeenCalledWith(
      expect.objectContaining({
        queryString: expect.stringContaining("savedViewId=view_123"),
      }),
    );
  });

  it("soft-navigates sort changes from the people header and clears pagination", () => {
    navigationMocks.search = "q=smith&after=cursor_1";

    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        query="smith"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort people" }));
    expect(
      screen.getByRole("option", {
        name: "First name",
      }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("option", { name: "Reverse (Z-A)" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("option", { name: "Reverse (Z-A)" }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("option", { name: "Last name" }));

    const [href, options] = navigationMocks.replace.mock.calls[0] as [
      string,
      { scroll: boolean },
    ];

    expect(href).toContain("/people?");
    expect(href).toContain("q=smith");
    expect(href).toContain("sort=lastName");
    expect(href).not.toContain("after=");
    expect(options).toEqual({ scroll: false });
  });

  it("shows a reverse sub-item for the active sort field", () => {
    navigationMocks.search = "q=smith&sort=lastName&after=cursor_1";

    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        query="smith"
        sort="lastName"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort people" }));
    const activeSort = screen.getByRole("option", {
      name: "Last name",
    });

    expect(activeSort).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("option", { name: "Reverse (Z-A)" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("option", { name: "Reverse (Z-A)" }),
    ).toHaveLength(1);
    fireEvent.click(screen.getByRole("option", { name: "Reverse (Z-A)" }));

    const [href] = navigationMocks.replace.mock.calls[0] as [
      string,
      { scroll: boolean },
    ];

    expect(href).toContain("q=smith");
    expect(href).toContain("sort=lastName%3Adesc");
    expect(href).not.toContain("after=");
  });

  it("refreshes sort highlighting when the selected sort changes", () => {
    const { rerender } = render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        sort="lastName:desc"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    rerender(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort people" }));

    expect(
      screen.getByRole("option", {
        name: "First name",
      }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Last name" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("highlights the reverse sub-item when descending is selected", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        sort="firstName:desc"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sort people" }));

    expect(screen.getByRole("option", { name: "First name" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(
      screen.getByRole("option", { name: "Reverse (Z-A)" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getAllByRole("option", { name: "Reverse (Z-A)" }),
    ).toHaveLength(1);
  });

  it("bounds the right workspace on desktop while allowing page scroll on mobile", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    expect(screen.getByTestId("list-table").parentElement).toHaveClass(
      "flex",
      "min-w-0",
      "flex-col",
      "md:h-full",
      "md:overflow-hidden",
    );
    expect(screen.getByTestId("list-table").parentElement).not.toHaveClass(
      "h-full",
      "overflow-hidden",
    );
    expect(screen.getByTestId("list-table").closest("section")).toHaveClass(
      "min-h-0",
      "min-w-0",
      "md:h-full",
    );
  });

  it("renders lifecycle signals as multi-select choices without an any option", () => {
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
      screen.queryByRole("radio", { name: /Any/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Any" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Healthy" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lapsed" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "New" })).not.toBeChecked();
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
        lifecycle={["NEW", "HEALTHY"]}
        query="smith"
        connectionStatusOptions={[{ label: "Member", value: "Member" }]}
        recordStatusOptions={[{ label: "Active", value: "Active" }]}
      />,
    );

    expect(screen.getAllByText("Lifecycle").length).toBeGreaterThan(0);
    expect(screen.getByText("New, Healthy")).toBeInTheDocument();
    expect(screen.getAllByText("Age").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Adults").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4 active")).toHaveLength(2);
    expect(
      screen.getAllByRole("link", { name: /Clear .+ filter/ }),
    ).toHaveLength(4);
    expect(screen.getByLabelText("Clear Lifecycle filter")).toHaveAttribute(
      "href",
      "/people?q=smith&ageGroup=ADULTS&campus=2",
    );
    expect(screen.getByLabelText("Clear Age filter")).toHaveAttribute(
      "href",
      "/people?q=smith&lifecycle=NEW&lifecycle=HEALTHY&campus=2",
    );
    expect(screen.getByLabelText("Clear Campus filter")).toHaveAttribute(
      "href",
      "/people?q=smith&lifecycle=NEW&lifecycle=HEALTHY&ageGroup=ADULTS",
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
        lifecycle={["NEW", "HEALTHY"]}
        query="smith"
        connectionStatusOptions={[{ label: "Member", value: "Member" }]}
        recordStatusOptions={[{ label: "Active", value: "Active" }]}
      />,
    );

    expect(screen.getByRole("heading", { name: "People" })).toBeInTheDocument();
    expect(screen.queryByText("All people")).not.toBeInTheDocument();
    expect(screen.queryByText("Default")).not.toBeInTheDocument();
    expect(screen.queryByText("Display")).not.toBeInTheDocument();
    expect(screen.queryByText("Sort")).not.toBeInTheDocument();
    const columnsButton = screen.getByRole("button", {
      name: "Display columns",
    });

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
      lifecycle: ["NEW", "HEALTHY"],
      q: "smith",
      recordStatus: "Active",
    });
  });

  it("renders icon links for switching the people visual", () => {
    render(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "tasks"]}
        connection={emptyPeopleConnection}
        kind="people"
        query="smith"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
        viewMode="list"
      />,
    );

    const listLink = screen.getByRole("link", { name: "List" });
    const givingLink = screen.getByRole("link", {
      name: "Giving lifecycle",
    });

    expect(screen.queryByText("List")).not.toBeInTheDocument();
    expect(screen.queryByText("Giving lifecycle")).not.toBeInTheDocument();
    expect(listLink).toHaveAttribute("aria-current", "page");
    expect(givingLink).toHaveAttribute(
      "href",
      "/people?q=smith&ageGroup=ADULTS&columns=campus%2Ctasks&view=giving",
    );
  });

  it("shows lifecycle multi-select choices as checked when active", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        lifecycle={["NEW", "HEALTHY", "LAPSED", "NEVER_GIVEN"]}
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    expect(screen.getByRole("checkbox", { name: "Healthy" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Lapsed" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Never given" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "New" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Reactivated" }),
    ).not.toBeChecked();
  });

  it("renders the household giving filter from the giving lifecycle report", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        filters={{ householdGivingState: "STOPPED" }}
        kind="people"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
        viewMode="giving"
      />,
    );

    expect(screen.getAllByText("Household giving").length).toBeGreaterThan(0);
    expect(screen.getByText("Stopped")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Household giving/ }));
    expect(screen.getByRole("radio", { name: "Stopped" })).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Still giving" }),
    ).not.toBeChecked();
    expect(
      screen.getByLabelText("Clear Household giving filter"),
    ).toHaveAttribute("href", "/people?view=giving");
  });

  it("keeps the split list workspace active at the tablet breakpoint", () => {
    const { container } = render(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "tasks"]}
        connection={emptyPeopleConnection}
        kind="people"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    const main = container.querySelector("main");
    const aside = container.querySelector("aside");

    expect(main?.className).toContain("md:pl-[300px]");
    expect(main?.className).toContain("xl:pl-[320px]");
    expect(aside?.className).toContain("md:fixed");
    expect(aside?.className).toContain("md:w-[300px]");
    expect(aside?.className).toContain("xl:w-[320px]");
  });

  it("renders the filter accordion edge-to-edge without rounded outer chrome", () => {
    render(
      <ListViewShell
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    const accordionShell = screen
      .getByRole("button", { name: /Lifecycle signals/i })
      .closest("section")?.parentElement;

    expect(accordionShell?.className).not.toContain("border-y");
    expect(accordionShell?.className).not.toContain("rounded");
  });

  it("uses a sticky accordion title inside the filter rail", () => {
    render(
      <ListViewShell
        ageGroup="ADULTS"
        campusOptions={[]}
        catalog={[]}
        columns={["campus", "lifecycle", "tasks", "pledges"]}
        connection={emptyPeopleConnection}
        kind="people"
        connectionStatusOptions={[]}
        recordStatusOptions={[]}
      />,
    );

    const accordionButton = screen.getByRole("button", {
      name: /Lifecycle signals/i,
    });

    fireEvent.click(accordionButton);

    expect(accordionButton.className).toContain("sticky");
    expect(accordionButton.className).toContain("top-0");
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
      screen.getByRole("button", { name: /rockStatus/i }),
    ).toHaveTextContent("Archived household");

    fireEvent.click(screen.getByRole("button", { name: /rockStatus/i }));

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
    expect(screen.getByRole("button", { name: /campus/i })).toHaveTextContent(
      "North",
    );

    fireEvent.click(statusButton);

    expect(audienceButton).toHaveAttribute("aria-expanded", "false");
    expect(statusButton).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /campus/i })).toBeNull();
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
