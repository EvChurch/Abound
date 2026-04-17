import { describe, expect, it } from "vitest";

import {
  buildRockUrl,
  discoverRockEndpoints,
  redactSensitiveKeyName,
  redactSensitiveText,
  summarizeJsonShape,
} from "@/lib/rock/discovery";

describe("Rock discovery helpers", () => {
  it("builds Rock URLs without duplicate slashes", () => {
    expect(buildRockUrl("https://rock.example.org/", "/api/v2")).toBe(
      "https://rock.example.org/api/v2",
    );
    expect(buildRockUrl("https://rock.example.org", "api/v2")).toBe(
      "https://rock.example.org/api/v2",
    );
  });

  it("summarizes JSON shape without exposing values", () => {
    expect(
      summarizeJsonShape([
        {
          Email: "person@example.test",
          FirstName: "Person",
          Id: 1,
        },
      ]),
    ).toBe("array(object(keys: Email, FirstName, Id))");
  });

  it("marks sensitive key names in JSON shape summaries", () => {
    expect(redactSensitiveKeyName("GatewayCustomerId")).toBe(
      "GatewayCustomerId:[REDACTED_KEY]",
    );
  });

  it("redacts obvious token values from errors", () => {
    expect(redactSensitiveText("Bearer abc.def.ghi failed")).toBe(
      "Bearer [REDACTED] failed",
    );
    expect(redactSensitiveText("Authorization-Token=secret-value failed")).toBe(
      "Authorization-Token=[REDACTED] failed",
    );
  });

  it("returns status and shape without response values", async () => {
    const results = await discoverRockEndpoints({
      baseUrl: "https://rock.example.org",
      restKey: "secret-rest-key",
      endpoints: [{ label: "People", path: "/api/v2/People?$top=1" }],
      fetcher: async () =>
        new Response(
          JSON.stringify([
            {
              Email: "person@example.test",
              FirstName: "Person",
              Id: 1,
            },
          ]),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
            },
          },
        ),
    });

    expect(results).toEqual([
      {
        label: "People",
        path: "/api/v2/People?$top=1",
        status: 200,
        ok: true,
        contentType: "application/json",
        shape: "array(object(keys: Email, FirstName, Id))",
      },
    ]);
  });
});
