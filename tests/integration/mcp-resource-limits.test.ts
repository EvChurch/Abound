// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import type { McpPrincipal } from "@/lib/mcp/auth";
import { createAboundMcpServer, handleMcpRequest } from "@/lib/mcp/server";
import { getListViewFilterCatalog } from "@/lib/list-views/filter-catalog";
import {
  type FilterDefinition,
  validateFilterDefinition,
} from "@/lib/list-views/filter-schema";

const principal: McpPrincipal = {
  authInfo: {
    clientId: "fixture",
    scopes: ["abound:staff:read"],
    token: "synthetic-test-token",
  },
  user: {
    active: true,
    auth0Subject: "fixture",
    email: "fixture@example.test",
    id: "fixture",
    name: "Fixture Staff",
    rockPersonId: null,
  },
};

function request(body: string) {
  return new Request("http://localhost/mcp", {
    body,
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    method: "POST",
  });
}

function callBody(filterDefinition: unknown) {
  return JSON.stringify({
    id: 1,
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      arguments: { filterDefinition, first: 100 },
      name: "query_people",
    },
  });
}

function campusFilter(ids: string[]): FilterDefinition {
  return {
    conditions: [
      {
        field: "primaryCampusRockId",
        operator: "IN",
        type: "condition",
        value: ids,
      },
    ],
    mode: "all",
    type: "group",
  };
}

async function queryPeople(body: string) {
  const listPeopleRows = vi.fn(async () => ({
    appliedView: { id: null, name: "All people", pageSize: 100 },
    edges: [],
    pageInfo: { endCursor: null, hasNextPage: false },
    resultCount: { filtered: 0, total: 0 },
  }));
  const recordAuditEvent = vi.fn(async () => {});
  const server = createAboundMcpServer(principal, {
    listPeopleRows,
    recordAuditEvent,
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);

  try {
    const response = await transport.handleRequest(request(body), {
      authInfo: principal.authInfo,
    });
    return {
      body: await response.json(),
      listPeopleRows,
      recordAuditEvent,
      status: response.status,
    };
  } finally {
    await server.close();
  }
}

describe("MCP authenticated input resource limits", () => {
  it("preserves valid IN filters and the existing first=100 boundary", async () => {
    const filterDefinition = campusFilter(Array(1_000).fill("123"));
    expect(
      validateFilterDefinition(
        filterDefinition,
        getListViewFilterCatalog("PEOPLE"),
      ).ok,
    ).toBe(true);
    const result = await queryPeople(callBody(filterDefinition));
    expect(result.status).toBe(200);
    expect(result.body.result.isError).not.toBe(true);
    expect(result.listPeopleRows).toHaveBeenCalledWith(
      expect.objectContaining({ filterDefinition, first: 100 }),
      principal.user,
    );
    expect(result.recordAuditEvent).toHaveBeenCalledTimes(1);
  });

  it("rejects wide valid filters before application validation or data access", async () => {
    const filterDefinition = campusFilter(Array(10_001).fill("1"));
    expect(
      validateFilterDefinition(
        filterDefinition,
        getListViewFilterCatalog("PEOPLE"),
      ).ok,
    ).toBe(true);
    const result = await queryPeople(callBody(filterDefinition));
    expect(result.body.result.isError).toBe(true);
    expect(result.body.result.content[0].text).toContain("maximum of 10000");
    expect(result.listPeopleRows).not.toHaveBeenCalled();
    expect(result.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("allows 10000 combined input members but rejects the next element", async () => {
    // The arguments/group/condition contribute ten members, in addition to IDs.
    const atLimit = await queryPeople(
      callBody(campusFilter(Array(9_990).fill("1"))),
    );
    expect(atLimit.body.result.isError).not.toBe(true);
    expect(atLimit.listPeopleRows).toHaveBeenCalledTimes(1);

    const overLimit = await queryPeople(
      callBody(campusFilter(Array(9_991).fill("1"))),
    );
    expect(overLimit.body.result.isError).toBe(true);
    expect(overLimit.listPeopleRows).not.toHaveBeenCalled();
  });

  it("preserves the existing three-level nested group contract", async () => {
    let filterDefinition = campusFilter(["123"]);
    for (let depth = 0; depth < 3; depth++) {
      filterDefinition = {
        conditions: [filterDefinition],
        mode: "all",
        type: "group",
      };
    }
    expect(
      validateFilterDefinition(
        filterDefinition,
        getListViewFilterCatalog("PEOPLE"),
      ).ok,
    ).toBe(true);
    const result = await queryPeople(callBody(filterDefinition));
    expect(result.body.result.isError).not.toBe(true);
    expect(result.listPeopleRows).toHaveBeenCalledTimes(1);
  });

  it("bounds deeply nested unknown filter input before application callbacks", async () => {
    // Construct JSON directly: serializing a hostile deep JS object can itself
    // overflow before reaching the actual HTTP/SDK input boundary under test.
    const nested = "[".repeat(10_001) + "0" + "]".repeat(10_001);
    const body = `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"query_people","arguments":{"filterDefinition":${nested}}}}`;
    const result = await queryPeople(body);
    expect(result.body.result.isError).toBe(true);
    expect(result.body.result.content[0].text).toContain("maximum of 10000");
    expect(result.listPeopleRows).not.toHaveBeenCalled();
  });

  it("keeps invalid first values rejected by the existing schema", async () => {
    const body = callBody(campusFilter(["123"])).replace(
      '"first":100',
      '"first":101',
    );
    const result = await queryPeople(body);
    expect(result.body.result.isError).toBe(true);
    expect(result.listPeopleRows).not.toHaveBeenCalled();
  });

  it("accepts a 64 KiB JSON body but rejects one extra byte in production transport", async () => {
    const ping = JSON.stringify({ id: 1, jsonrpc: "2.0", method: "ping" });
    const atLimit = ping.padEnd(64 * 1024, " ");
    const accepted = await handleMcpRequest(request(atLimit), principal);
    expect(accepted.status).toBe(200);
    expect((await accepted.json()).result).toEqual({});

    const rejected = await handleMcpRequest(request(atLimit + " "), principal);
    expect(rejected.status).toBe(413);
    expect((await rejected.json()).error.message).toContain("65536");
  });

  it("counts streamed UTF-8 bytes even without Content-Length", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(" ".repeat(32 * 1024)));
        controller.enqueue(encoder.encode("é".repeat(16 * 1024 + 1)));
        controller.close();
      },
    });
    const streamed = new Request("http://localhost/mcp", {
      body,
      duplex: "half",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      method: "POST",
    } as RequestInit);
    expect(streamed.headers.has("content-length")).toBe(false);
    const response = await handleMcpRequest(streamed, principal);
    expect(response.status).toBe(413);
  });
});
