// @vitest-environment node
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { expect, it } from "vitest";

const maildevPackage = realpathSync(
  resolve("node_modules/maildev/package.json"),
);
const apiRequire = createRequire(
  realpathSync(
    resolve(dirname(maildevPackage), "..", "@maildev/api/package.json"),
  ),
);
const createFastify = apiRequire("fastify") as () => {
  get: (
    path: string,
    options: {
      schema: {
        headers: {
          type: "object";
          propertyNames: { not: { enum: string[] } };
        };
      };
    },
    handler: () => { ok: boolean },
  ) => void;
  inject: (options: {
    method: "GET";
    url: string;
    headers: Record<string, string>;
  }) => Promise<{ statusCode: number }>;
  close: () => Promise<void>;
};

it("enforces canonical-case header names through Maildev's installed Fastify", async () => {
  const server = createFastify();
  try {
    server.get(
      "/fixture",
      {
        schema: {
          headers: {
            type: "object",
            // GHSA-389g-gv7q-r4x8: Node lowercases request header names.
            propertyNames: { not: { enum: ["X-Debug-Override"] } },
          },
        },
      },
      () => ({ ok: true }),
    );
    const allowed = await server.inject({
      method: "GET",
      url: "/fixture",
      headers: { "X-Fixture": "synthetic" },
    });
    expect(allowed.statusCode).toBe(200);
    const denied = await server.inject({
      method: "GET",
      url: "/fixture",
      headers: { "X-Debug-Override": "synthetic" },
    });
    expect(denied.statusCode).toBe(400);
  } finally {
    await server.close();
  }
});
