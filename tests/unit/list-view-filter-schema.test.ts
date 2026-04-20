import { describe, expect, it } from "vitest";

import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import {
  validateFilterDefinition,
  type FilterDefinition,
} from "@/lib/list-views/filter-schema";

describe("list view filter schema", () => {
  it("validates nested people filters against the role-aware catalog", () => {
    const filter: FilterDefinition = {
      conditions: [
        {
          field: "primaryCampusRockId",
          operator: "IN",
          type: "condition",
          value: ["1", "2"],
        },
        {
          conditions: [
            {
              field: "lifecycle",
              operator: "IN",
              type: "condition",
              value: ["DROPPED", "AT_RISK"],
            },
            {
              field: "taskStatus",
              operator: "EQUALS",
              type: "condition",
              value: "OPEN",
            },
          ],
          mode: "any",
          type: "group",
        },
      ],
      mode: "all",
      type: "group",
    };

    const result = validateFilterDefinition(
      filter,
      getListViewFilterCatalog("PEOPLE", "PASTORAL_CARE"),
    );

    expect(result).toEqual({
      definition: filter,
      ok: true,
    });
  });

  it("omits finance-only amount fields from pastoral care catalogs", () => {
    const pastoralCatalog = getListViewFilterCatalog(
      "HOUSEHOLDS",
      "PASTORAL_CARE",
    );
    const financeCatalog = getListViewFilterCatalog("HOUSEHOLDS", "FINANCE");

    expect(pastoralCatalog.map((field) => field.id)).not.toContain(
      "totalGiven",
    );
    expect(financeCatalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldType: "MONEY",
          id: "totalGiven",
          permission: "finance:read_amounts",
        }),
      ]),
    );
  });

  it("exposes an adults-or-children filter without exposing direct record ID filters", () => {
    const catalog = getListViewFilterCatalog("PEOPLE", "ADMIN");
    const fields = catalog.map((field) => field.id);

    expect(fields).toContain("ageGroup");
    expect(fields).not.toContain("rockPersonId");
  });

  it("rejects manually submitted amount filters for pastoral care", () => {
    const result = validateFilterDefinition(
      {
        conditions: [
          {
            field: "totalGiven",
            operator: "GREATER_THAN",
            type: "condition",
            value: "1000.00",
          },
        ],
        mode: "all",
        type: "group",
      },
      getListViewFilterCatalog("PEOPLE", "PASTORAL_CARE"),
    );

    expect(result).toMatchObject({
      errors: [
        expect.objectContaining({
          code: "FORBIDDEN_FIELD",
          path: "$.conditions[0].field",
        }),
      ],
      ok: false,
    });
  });

  it("rejects unsupported operator and value combinations", () => {
    const result = validateFilterDefinition(
      {
        conditions: [
          {
            field: "search",
            operator: "GREATER_THAN",
            type: "condition",
            value: "Smith",
          },
          {
            field: "taskDueAt",
            operator: "BETWEEN",
            type: "condition",
            value: ["2026-04-01"],
          },
        ],
        mode: "all",
        type: "group",
      },
      getListViewFilterCatalog("PEOPLE", "ADMIN"),
    );

    expect(result).toMatchObject({
      errors: [
        expect.objectContaining({
          code: "INVALID_OPERATOR",
          path: "$.conditions[0].operator",
        }),
        expect.objectContaining({
          code: "INVALID_VALUE",
          path: "$.conditions[1].value",
        }),
      ],
      ok: false,
    });
  });

  it("allows relative date operands for date filters", () => {
    const result = validateFilterDefinition(
      {
        conditions: [
          {
            field: "givingRecency",
            operator: "AFTER",
            type: "condition",
            value: {
              amount: 90,
              unit: "DAYS",
            },
          },
        ],
        mode: "all",
        type: "group",
      },
      getListViewFilterCatalog("HOUSEHOLDS", "FINANCE"),
    );

    expect(result.ok).toBe(true);
  });
});
