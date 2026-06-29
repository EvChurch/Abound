"use client";

import { ArrowDownAZ } from "lucide-react";

import { AutoSubmitSelect } from "@/components/list-views/auto-submit-controls";
import {
  encodePeopleSortParam,
  parsePeopleSortParam,
  type PeopleSortParam,
} from "@/lib/list-views/page-params";

type PeopleSortOption = PeopleSortParam["field"];

const peopleSortOptions: ReadonlyArray<{
  label: string;
  value: PeopleSortOption;
}> = [
  { label: "First name", value: "firstName" },
  { label: "Last name", value: "lastName" },
];

export function PeopleSortControl({ sort }: { sort: PeopleSortParam }) {
  const options = peopleSortOptions.map((option) => ({
    ...option,
    label:
      option.value === sort.field
        ? `${option.label} (${sortDirectionLabel(sort.direction)})`
        : option.label,
    value:
      option.value === sort.field ? encodePeopleSortParam(sort) : option.value,
  }));

  return (
    <AutoSubmitSelect
      ariaLabel="Sort people"
      className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-app-border bg-app-surface text-app-foreground outline-none transition hover:border-app-accent hover:bg-app-chip focus-visible:ring-2 focus-visible:ring-app-accent/25"
      defaultValue={encodePeopleSortParam(sort)}
      hideChevron
      hideSelectedLabel
      menuClassName="fixed z-30 w-40 rounded-[8px] border border-app-border bg-app-background p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
      name="sort"
      options={options}
      rootClassName="relative hidden sm:inline-block"
      submittedValue={(value) => nextPeopleSortValue(value, sort)}
      title="Sort people"
      triggerIcon={
        <ArrowDownAZ aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
      }
    />
  );
}

function nextPeopleSortValue(value: string, current: PeopleSortParam) {
  const selected = parsePeopleSortParam(value);

  if (selected.field !== current.field) {
    return encodePeopleSortParam({ direction: "asc", field: selected.field });
  }

  return encodePeopleSortParam({
    direction: current.direction === "asc" ? "desc" : "asc",
    field: current.field,
  });
}

function sortDirectionLabel(direction: PeopleSortParam["direction"]) {
  return direction === "asc" ? "A-Z" : "Z-A";
}
