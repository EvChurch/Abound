"use server";

import { redirect } from "next/navigation";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import {
  archiveSavedListView,
  createSavedListView,
} from "@/lib/list-views/saved-views";
import {
  buildPeopleFilter,
  parseColumns,
  parsePeopleSortParam,
  type PeopleListQueryParams,
} from "@/lib/list-views/page-params";

export async function savePeopleSegmentAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const name = String(formData.get("name") ?? "").trim();
  const params = peopleParamsFromFormData(formData);
  const savedView = await createSavedListView(
    {
      columnDefinition: {
        columns: parseColumns(params),
      },
      filterDefinition: buildPeopleFilter(params),
      name,
      resource: "PEOPLE",
      sortDefinition: sortDefinitionFromParam(params.sort),
    },
    accessState.user,
  );

  redirect(`/people?savedViewId=${savedView.id}&saved=1`);
}

export async function archivePeopleSegmentAction(formData: FormData) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const segmentId = String(formData.get("segmentId") ?? "").trim();
  if (segmentId) {
    await archiveSavedListView(segmentId, accessState.user);
  }

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  redirect(safePeopleReturnPath(returnTo));
}

function peopleParamsFromFormData(formData: FormData): PeopleListQueryParams {
  return {
    ageGroup: optionalString(formData.get("ageGroup")),
    campus: optionalString(formData.get("campus")),
    columns: optionalString(formData.get("columns")),
    connectionStatus: valuesFromFormData(formData, "connectionStatus"),
    connectGroup: optionalString(formData.get("connectGroup")),
    emailStatus: optionalString(formData.get("emailStatus")),
    householdGivingState: optionalString(formData.get("householdGivingState")),
    lifecycle: valuesFromFormData(formData, "lifecycle"),
    pledgeState: valuesFromFormData(formData, "pledgeState"),
    q: optionalString(formData.get("q")),
    recordStatus: valuesFromFormData(formData, "recordStatus"),
    sort: optionalString(formData.get("sort")),
    taskPriority: optionalString(formData.get("taskPriority")),
    taskStatus: optionalString(formData.get("taskStatus")),
  };
}

function sortDefinitionFromParam(value: string | undefined) {
  const sort = parsePeopleSortParam(value);

  return {
    direction: sort.direction.toUpperCase(),
    field: sort.field,
  };
}

function optionalString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return undefined;
  }

  const text = value.trim();
  return text || undefined;
}

function valuesFromFormData(formData: FormData, key: string) {
  const values = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    return undefined;
  }

  return values.length === 1 ? values[0] : values;
}

function safePeopleReturnPath(value: string) {
  return value === "/people" || value.startsWith("/people?")
    ? value
    : "/people";
}
