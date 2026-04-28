import { describe, expect, it } from "vitest";

import {
  buildPeopleFilter,
  paramsFromSearch,
} from "@/lib/list-views/page-params";

describe("list view page params", () => {
  it("builds one-of filters for multi-selected people statuses", () => {
    const filter = buildPeopleFilter({
      connectionStatus: ["Attendee", "Member"],
      recordStatus: ["Active", "Pending"],
    });

    expect(filter.conditions).toEqual([
      {
        field: "connectionStatus",
        operator: "IN",
        type: "condition",
        value: ["Attendee", "Member"],
      },
      {
        field: "recordStatus",
        operator: "IN",
        type: "condition",
        value: ["Active", "Pending"],
      },
    ]);
  });

  it("preserves repeated people status params from URLSearchParams", () => {
    const params = paramsFromSearch(
      new URLSearchParams(
        "connectionStatus=Attendee&connectionStatus=Member&recordStatus=Active&recordStatus=Pending",
      ),
    );

    expect(params.connectionStatus).toEqual(["Attendee", "Member"]);
    expect(params.recordStatus).toEqual(["Active", "Pending"]);
  });

  it("builds multi-selected lifecycle filters and preserves them from URLSearchParams", () => {
    const filter = buildPeopleFilter({
      lifecycle: ["NEW", "HEALTHY"],
    });

    expect(filter.conditions).toEqual([
      {
        field: "lifecycle",
        operator: "IN",
        type: "condition",
        value: ["NEW", "HEALTHY"],
      },
    ]);

    const params = paramsFromSearch(
      new URLSearchParams("lifecycle=NEW&lifecycle=HEALTHY"),
    );

    expect(params.lifecycle).toEqual(["NEW", "HEALTHY"]);
  });

  it("builds the pledge management people filter", () => {
    const filter = buildPeopleFilter({
      pledgeState: ["review", "active"],
    });

    expect(filter.conditions).toEqual([
      {
        field: "pledgeState",
        operator: "IN",
        type: "condition",
        value: ["REVIEW", "ACTIVE"],
      },
    ]);
  });
});
