"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { ListTable } from "@/components/list-views/list-table";
import type { ListColumnKey } from "@/lib/list-views/columns";
import type {
  HouseholdListRow,
  HouseholdsConnection,
} from "@/lib/list-views/households-list";
import type {
  PeopleConnection,
  PersonListRow,
} from "@/lib/list-views/people-list";

type InfiniteListTableProps =
  | {
      columns: ListColumnKey[];
      connection: PeopleConnection;
      kind: "people";
      queryString: string;
    }
  | {
      columns: ListColumnKey[];
      connection: HouseholdsConnection;
      kind: "households";
      queryString: string;
    };

type ListConnection = PeopleConnection | HouseholdsConnection;

export function InfiniteListTable({
  columns,
  connection,
  kind,
  queryString,
}: InfiniteListTableProps) {
  const [currentConnection, setCurrentConnection] =
    useState<ListConnection>(connection);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingCursorRef = useRef<string | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (!sentinel || !currentConnection.pageInfo.hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const cursor = currentConnection.pageInfo.endCursor;

        if (
          !entry?.isIntersecting ||
          !cursor ||
          loadingCursorRef.current === cursor
        ) {
          return;
        }

        loadingCursorRef.current = cursor;
        startTransition(async () => {
          const nextConnection = await fetchNextConnection(
            kind,
            queryString,
            cursor,
          );

          setCurrentConnection((previous) =>
            appendConnection(previous, nextConnection),
          );
          loadingCursorRef.current = null;
        });
      },
      { rootMargin: "700px 0px" },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    currentConnection.pageInfo.endCursor,
    currentConnection.pageInfo.hasNextPage,
    kind,
    queryString,
  ]);

  return (
    <div className="h-[calc(100vh-48px)] overflow-auto">
      {kind === "people" ? (
        <ListTable
          columns={columns}
          connection={currentConnection as PeopleConnection}
          kind="people"
        />
      ) : (
        <ListTable
          columns={columns}
          connection={currentConnection as HouseholdsConnection}
          kind="households"
        />
      )}
      {currentConnection.pageInfo.hasNextPage ? (
        <div
          className="flex min-h-16 items-center justify-center border-t border-app-border bg-app-surface text-[12px] font-medium text-app-muted"
          ref={sentinelRef}
        >
          {isPending ? "Loading more..." : null}
        </div>
      ) : null}
    </div>
  );
}

async function fetchNextConnection(
  kind: "households" | "people",
  queryString: string,
  cursor: string,
) {
  const params = new URLSearchParams(queryString);
  params.set("after", cursor);

  const response = await fetch(`/api/list-views/${kind}?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Unable to load more list rows.");
  }

  return (await response.json()) as ListConnection;
}

function appendConnection(
  previous: ListConnection,
  nextConnection: ListConnection,
): ListConnection {
  const seenCursors = new Set(previous.edges.map((edge) => edge.cursor));
  const nextEdges = nextConnection.edges.filter(
    (edge) => !seenCursors.has(edge.cursor),
  );

  return {
    ...previous,
    edges: [...previous.edges, ...nextEdges] as Array<{
      cursor: string;
      node: PersonListRow | HouseholdListRow;
    }>,
    pageInfo: nextConnection.pageInfo,
  } as ListConnection;
}
