"use client";

import { ArrowDownAZ, ArrowDownZA } from "lucide-react";

import { AutoSubmitSelect } from "@/components/list-views/auto-submit-controls";
import {
  encodePeopleSortParam,
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
  const options = peopleSortOptions.flatMap((option) => {
    const mainOption = {
      label: option.label,
      value: encodePeopleSortParam({
        direction: "asc",
        field: option.value,
      }),
    };

    if (option.value !== sort.field) {
      return [mainOption];
    }

    return [
      mainOption,
      {
        indent: true,
        label: `Reverse (${sortDirectionLabel("desc")})`,
        value: encodePeopleSortParam({
          direction: "desc",
          field: option.value,
        }),
      },
    ];
  });
  const SortIcon = sort.direction === "desc" ? ArrowDownZA : ArrowDownAZ;

  return (
    <AutoSubmitSelect
      ariaLabel="Sort people"
      className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-app-border bg-app-surface text-app-foreground outline-none transition hover:border-app-accent hover:bg-app-chip focus-visible:ring-2 focus-visible:ring-app-accent/25"
      defaultValue={encodePeopleSortParam(sort)}
      hideChevron
      hideSelectedLabel
      menuClassName="fixed z-30 w-64 rounded-[8px] border border-app-border bg-app-background p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]"
      name="sort"
      options={options}
      rootClassName="relative hidden sm:inline-block"
      title={`Sort people: ${sortDirectionLabel(sort.direction)}`}
      triggerIcon={
        <SortIcon aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
      }
    />
  );
}

function sortDirectionLabel(direction: PeopleSortParam["direction"]) {
  return direction === "asc" ? "A-Z" : "Z-A";
}
