import type { AppliedListView } from "@/lib/list-views/people-list";

export function SavedViewMenu({
  appliedView,
}: {
  appliedView: AppliedListView;
}) {
  return (
    <div className="inline-flex min-h-10 items-center gap-3 rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] shadow-[0_1px_1px_rgba(20,18,14,0.03)]">
      <span className="font-mono text-[10px] font-semibold uppercase text-app-muted">
        View
      </span>
      <span className="font-semibold text-app-foreground">
        {appliedView.name}
      </span>
      <span className="rounded-full bg-app-surface px-2 py-0.5 text-[11px] font-medium text-app-muted">
        {appliedView.pageSize}/page
      </span>
    </div>
  );
}
