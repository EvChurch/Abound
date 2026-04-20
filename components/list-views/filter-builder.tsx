import type { ReactNode } from "react";

import type { FilterFieldDefinition } from "@/lib/list-views/filter-schema";

export function FilterBuilder({
  activeCount,
  catalog,
  children,
}: {
  activeCount: number;
  catalog: FilterFieldDefinition[];
  children: ReactNode;
}) {
  return (
    <details className="group relative">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] font-semibold text-app-foreground shadow-[0_1px_1px_rgba(20,18,14,0.03)] hover:border-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/20 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="text-[15px] leading-none">
          +
        </span>
        <span>Filters</span>
        <span className="rounded-full bg-app-accent/10 px-2 py-0.5 text-[11px] font-bold text-app-accent-strong">
          {activeCount}
        </span>
        <span className="border-l border-app-border pl-2 text-[12px] font-medium text-app-muted">
          {catalog.length} fields
        </span>
      </summary>
      <div className="absolute left-0 top-12 z-20 w-[min(720px,calc(100vw-3rem))] rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_20px_40px_rgba(35,31,24,0.14)]">
        {children}
      </div>
    </details>
  );
}
