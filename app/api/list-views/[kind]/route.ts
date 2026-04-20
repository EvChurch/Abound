import { NextResponse } from "next/server";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { listHouseholds } from "@/lib/list-views/households-list";
import { listPeople } from "@/lib/list-views/people-list";
import {
  buildHouseholdFilter,
  buildPeopleFilter,
  paramsFromSearch,
} from "@/lib/list-views/page-params";

type RouteContext = {
  params: Promise<{
    kind: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (accessState.status === "needs_access") {
    return NextResponse.json({ error: "Access required." }, { status: 403 });
  }

  const { kind } = await context.params;
  const params = paramsFromSearch(new URL(request.url).searchParams);

  if (kind === "people") {
    const connection = await listPeople(
      {
        after: params.after,
        filterDefinition: buildPeopleFilter(params),
        first: 50,
      },
      accessState.user,
    );

    return NextResponse.json(connection);
  }

  if (kind === "households") {
    const connection = await listHouseholds(
      {
        after: params.after,
        filterDefinition: buildHouseholdFilter(params),
        first: 50,
      },
      accessState.user,
    );

    return NextResponse.json(connection);
  }

  return NextResponse.json({ error: "Unknown list view." }, { status: 404 });
}
