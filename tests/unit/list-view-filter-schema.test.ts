import { describe, expect, it } from "vitest";

import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import {
  validateFilterDefinition,
  type FilterDefinition,
} from "@/lib/list-views/filter-schema";

describe("list view filter schema", () => {
  it("validates nested people filters against the shared catalog", () => {
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
      getListViewFilterCatalog("PEOPLE"),
    );

    expect(result).toEqual({
      definition: filter,
      ok: true,
    });
  });

  it("includes amount fields in shared catalogs", () => {
    const catalog = getListViewFilterCatalog("HOUSEHOLDS");

    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldType: "MONEY",
          id: "totalGiven",
        }),
      ]),
    );
  });

  it("exposes an adults-or-children filter without exposing direct record ID filters", () => {
    const catalog = getListViewFilterCatalog("PEOPLE");
    const fields = catalog.map((field) => field.id);

    expect(fields).toContain("ageGroup");
    expect(fields).not.toContain("rockPersonId");
  });

  it("accepts manually submitted amount filters", () => {
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
      getListViewFilterCatalog("PEOPLE"),
    );

    expect(result).toMatchObject({
      definition: expect.objectContaining({
        conditions: [
          expect.objectContaining({
            field: "totalGiven",
          }),
        ],
      }),
      ok: true,
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
      getListViewFilterCatalog("PEOPLE"),
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
      getListViewFilterCatalog("HOUSEHOLDS"),
    );

    expect(result.ok).toBe(true);
  });
});
