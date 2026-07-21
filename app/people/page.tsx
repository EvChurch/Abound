import { redirect } from "next/navigation";

import { ListViewShell } from "@/components/list-views/list-view-shell";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { getCampusFilterOptions } from "@/lib/list-views/campus-options";
import { getPersonConnectionStatusFilterOptions } from "@/lib/list-views/connection-status-options";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import { listPeople } from "@/lib/list-views/people-list";
import { getPersonRecordStatusFilterOptions } from "@/lib/list-views/record-status-options";
import { listSavedListViews } from "@/lib/list-views/saved-views";
import {
  buildPeopleFilter,
  parseColumns,
  parsePeopleSortParam,
  parsePeopleViewMode,
  peopleFiltersFromParams,
  type PeopleListQueryParams,
} from "@/lib/list-views/page-params";

type PeopleLookupPageProps = {
  searchParams: Promise<PeopleListQueryParams>;
};

export const metadata = {
  title: "People",
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
  const hasExplicitFilters = hasExplicitPeopleFilters(params);
  const filterDefinition = hasExplicitFilters
    ? buildPeopleFilter(params)
    : undefined;
  const [
    campusOptions,
    connectionStatusOptions,
    recordStatusOptions,
    connection,
    savedSegments,
  ] = await Promise.all([
    getCampusFilterOptions(),
    getPersonConnectionStatusFilterOptions(),
    getPersonRecordStatusFilterOptions(),
    listPeople(
      {
        after: params.after,
        filterDefinition,
        first: 50,
        savedViewId: params.savedViewId,
        sortDefinition: sortDefinitionFromParam(params.sort),
      },
      accessState.user,
    ),
    listSavedListViews("PEOPLE", accessState.user),
  ]);

  return (
    <ListViewShell
      campusOptions={campusOptions}
      catalog={getListViewFilterCatalog("PEOPLE")}
      columns={parseColumns(params)}
      connection={connection}
      canManageSettings
      canManageTools
      ageGroup={params.ageGroup}
      filters={peopleFiltersFromParams(params)}
      kind="people"
      lifecycle={params.lifecycle}
      query={params.q}
      sort={params.sort}
      connectionStatusOptions={connectionStatusOptions}
      recordStatusOptions={recordStatusOptions}
      savedSegments={savedSegments}
      viewMode={parsePeopleViewMode(params)}
    />
  );
}

function hasExplicitPeopleFilters(params: PeopleListQueryParams) {
  return Boolean(
    params.q?.trim() ||
    params.lifecycle ||
    params.ageGroup?.trim() ||
    params.campus?.trim() ||
    params.connectionStatus ||
    params.recordStatus ||
    params.emailStatus?.trim() ||
    params.connectGroup?.trim() ||
    params.householdGivingState?.trim() ||
    params.pledgeState ||
    params.taskStatus?.trim() ||
    params.taskPriority?.trim(),
  );
}

function sortDefinitionFromParam(value: string | undefined) {
  if (!value) return undefined;

  const sort = parsePeopleSortParam(value);

  return {
    direction: sort.direction.toUpperCase(),
    field: sort.field,
  };
}
