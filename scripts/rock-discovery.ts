import "dotenv/config";

import { discoverRockEndpoints } from "@/lib/rock/discovery";

const baseUrl = process.env.ROCK_BASE_URL;
const restKey = process.env.ROCK_REST_KEY;

if (!baseUrl || !restKey) {
  console.error(
    "ROCK_BASE_URL and ROCK_REST_KEY must be set in .env or .env.local.",
  );
  process.exit(1);
}

const rockBaseUrl = baseUrl;
const rockRestKey = restKey;

async function main() {
  console.log("Rock discovery starting.");
  console.log(
    "Only endpoint status, content type, and top-level JSON shape will be printed.",
  );
  console.log("");

  const results = await discoverRockEndpoints({
    baseUrl: rockBaseUrl,
    restKey: rockRestKey,
  });

  for (const result of results) {
    const parts = [
      result.ok ? "OK" : "NO",
      `${result.status}`,
      result.label,
      result.path,
    ];

    if (result.contentType) {
      parts.push(result.contentType);
    }

    if (result.shape) {
      parts.push(result.shape);
    }

    if (result.error) {
      parts.push(result.error);
    }

    console.log(parts.join(" | "));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
