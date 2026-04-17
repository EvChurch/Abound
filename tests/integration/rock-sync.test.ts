import "dotenv/config";

import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import sampleFixture from "@/lib/rock/fixtures/sanitized-rock-sample.json";
import { syncFixtureBundle } from "@/lib/sync/run-sync";
import type { SanitizedRockFixtureBundle } from "@/lib/rock/types";

const connectionString = process.env.TEST_DATABASE_URL;
const developmentConnectionString = process.env.DATABASE_URL;

describe.skipIf(!connectionString)("fixture-backed Rock sync", () => {
  it("persists a sanitized fixture sync into the test database", async () => {
    if (connectionString === developmentConnectionString) {
      throw new Error(
        "TEST_DATABASE_URL must not point at the same database as DATABASE_URL.",
      );
    }

    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: connectionString! }),
    });

    try {
      const result = await syncFixtureBundle(
        prisma,
        sampleFixture as SanitizedRockFixtureBundle,
      );

      expect(result.status).toBe("SUCCEEDED");
      expect(result.issueCount).toBe(0);

      await expect(
        prisma.rockPerson.findUniqueOrThrow({ where: { rockId: 910001 } }),
      ).resolves.toMatchObject({
        rockId: 910001,
        givingGroupRockId: 920001,
        primaryFamilyRockId: 920001,
      });
      await expect(
        prisma.rockHousehold.findUniqueOrThrow({ where: { rockId: 920001 } }),
      ).resolves.toMatchObject({
        rockId: 920001,
        groupTypeRockId: 10,
      });
      await expect(
        prisma.rockGroupMember.findUniqueOrThrow({ where: { rockId: 981001 } }),
      ).resolves.toMatchObject({
        activeConnectGroup: true,
      });

      const facts = await prisma.givingFact.findMany({
        where: {
          personRockId: 910001,
        },
        orderBy: {
          reliabilityKind: "asc",
        },
      });

      expect(facts.map((fact) => fact.reliabilityKind).sort()).toEqual([
        "ONE_OFF",
        "ONE_OFF",
        "SCHEDULED_RECURRING",
      ]);
    } finally {
      await prisma.$disconnect();
    }
  });
});
