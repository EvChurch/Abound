import "dotenv/config";

import { spawnSync } from "node:child_process";
import { Client } from "pg";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const developmentDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl) {
  console.error("TEST_DATABASE_URL is required to reset the test database.");
  process.exit(1);
}

if (testDatabaseUrl === developmentDatabaseUrl) {
  console.error("TEST_DATABASE_URL must not match DATABASE_URL.");
  process.exit(1);
}

const databaseName = new URL(testDatabaseUrl).pathname.replace(/^\//, "");

if (!databaseName.toLowerCase().includes("test")) {
  console.error(
    `Refusing to reset "${databaseName}". TEST_DATABASE_URL database name must include "test".`,
  );
  process.exit(1);
}

const maintenanceDatabaseUrl = new URL(testDatabaseUrl);
maintenanceDatabaseUrl.pathname = "/postgres";

async function main() {
  const client = new Client({
    connectionString: maintenanceDatabaseUrl.toString(),
  });

  try {
    await client.connect();
    const existingDatabase = await client.query(
      "select 1 from pg_database where datname = $1",
      [databaseName],
    );

    if (existingDatabase.rowCount === 0) {
      await client.query(
        `create database "${databaseName.replaceAll('"', '""')}"`,
      );
    }
  } finally {
    await client.end();
  }

  const result = spawnSync("pnpm", ["prisma", "migrate", "reset", "--force"], {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl,
    },
    stdio: "inherit",
  });

  process.exit(result.status ?? 1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
