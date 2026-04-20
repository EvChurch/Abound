import { redirect } from "next/navigation";

import { ListViewShell } from "@/components/list-views/list-view-shell";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import { listPeople } from "@/lib/list-views/people-list";
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
  const connection = await listPeople(
    {
      after: params.after,
      filterDefinition,
      first: 50,
    },
    accessState.user,
  );

  return (
    <ListViewShell
      catalog={getListViewFilterCatalog("PEOPLE", accessState.user.role)}
      columns={parseColumns(params)}
      connection={connection}
      ageGroup={params.ageGroup}
      filters={peopleFiltersFromParams(params)}
      kind="people"
      lifecycle={params.lifecycle}
      query={params.q}
    />
  );
}
