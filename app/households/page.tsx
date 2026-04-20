import { redirect } from "next/navigation";

import { ListViewShell } from "@/components/list-views/list-view-shell";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { listHouseholds } from "@/lib/list-views/households-list";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import {
  buildHouseholdFilter,
  householdFiltersFromParams,
  parseColumns,
  type HouseholdListQueryParams,
} from "@/lib/list-views/page-params";

type HouseholdLookupPageProps = {
  searchParams: Promise<HouseholdListQueryParams>;
};

export default async function HouseholdLookupPage({
  searchParams,
}: HouseholdLookupPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const params = await searchParams;
  const filterDefinition = buildHouseholdFilter(params);
  const connection = await listHouseholds(
    {
      after: params.after,
      filterDefinition,
      first: 50,
    },
    accessState.user,
  );

  return (
    <ListViewShell
      catalog={getListViewFilterCatalog("HOUSEHOLDS", accessState.user.role)}
      columns={parseColumns(params)}
      connection={connection}
      filters={householdFiltersFromParams(params)}
      kind="households"
      lifecycle={params.lifecycle}
      query={params.q}
    />
  );
}
