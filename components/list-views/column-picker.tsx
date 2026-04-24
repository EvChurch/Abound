import type { ReactNode } from "react";

import { DropdownPanel } from "@/components/ui/dropdown-panel";
import type { FilterFieldDefinition } from "@/lib/list-views/filter-schema";

export function ColumnPicker({
  catalog,
  children,
}: {
  catalog: FilterFieldDefinition[];
  children: ReactNode;
}) {
  const amountFields = catalog.filter((field) => field.fieldType === "MONEY");

  return (
    <DropdownPanel
      align="right"
      panelClassName="rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_20px_40px_rgba(35,31,24,0.14)]"
      trigger={
        <>
          <span aria-hidden="true" className="text-[14px] leading-none">
            ::
          </span>
          <span>Columns</span>
          <span className="border-l border-app-border pl-2 text-[12px] font-medium text-app-muted">
            Core{amountFields.length > 0 ? " + giving" : " + care signals"}
          </span>
        </>
      }
      triggerClassName="inline-flex min-h-10 items-center gap-2 rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] font-semibold text-app-foreground shadow-[0_1px_1px_rgba(20,18,14,0.03)] transition hover:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/20"
      widthClassName="w-[min(360px,calc(100vw-3rem))]"
    >
      <div>
        {children}
      </div>
    </DropdownPanel>
  );
}
