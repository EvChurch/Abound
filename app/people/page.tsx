import { redirect } from "next/navigation";

import { ListViewShell } from "@/components/list-views/list-view-shell";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { getCampusFilterOptions } from "@/lib/list-views/campus-options";
import { getPersonConnectionStatusFilterOptions } from "@/lib/list-views/connection-status-options";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import { listPeople } from "@/lib/list-views/people-list";
import { getPersonRecordStatusFilterOptions } from "@/lib/list-views/record-status-options";
import {
  buildPeopleFilter,
  parseColumns,
  peopleFiltersFromParams,
  type PeopleListQueryParams,
} from "@/lib/list-views/page-params";

type PeopleLookupPageProps = {
  searchParams: Promise<PeopleListQueryParams>;
};

export default async function PeopleLookupPage({
  searchParams,
}: PeopleLookupPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const params = await searchParams;
  const filterDefinition = buildPeopleFilter(params);
  const [
    campusOptions,
    connectionStatusOptions,
    recordStatusOptions,
    connection,
  ] = await Promise.all([
    getCampusFilterOptions(),
    getPersonConnectionStatusFilterOptions(),
    getPersonRecordStatusFilterOptions(),
    listPeople(
      {
        after: params.after,
        filterDefinition,
        first: 50,
      },
      accessState.user,
    ),
  ]);

  return (
    <ListViewShell
      campusOptions={campusOptions}
      catalog={getListViewFilterCatalog("PEOPLE", accessState.user.role)}
      columns={parseColumns(params)}
      connection={connection}
      canManageSettings={hasPermission(
        accessState.user.role,
        "settings:manage",
      )}
      canManageTools={hasPermission(accessState.user.role, "pledges:manage")}
      ageGroup={params.ageGroup}
      filters={peopleFiltersFromParams(params)}
      kind="people"
      lifecycle={params.lifecycle}
      query={params.q}
      connectionStatusOptions={connectionStatusOptions}
      recordStatusOptions={recordStatusOptions}
    />
  );
}
