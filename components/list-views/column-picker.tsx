import type { ReactNode } from "react";

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
    <details className="group relative">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] font-semibold text-app-foreground shadow-[0_1px_1px_rgba(20,18,14,0.03)] hover:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/20 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-[14px] leading-none">
          ::
        </span>
        <span>Columns</span>
        <span className="border-l border-app-border pl-2 text-[12px] font-medium text-app-muted">
          Core{amountFields.length > 0 ? " + giving" : " + care signals"}
        </span>
      </summary>
      <div className="absolute right-0 top-12 z-20 w-[min(360px,calc(100vw-3rem))] rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_20px_40px_rgba(35,31,24,0.14)]">
        {children}
      </div>
    </details>
  );
}
