import SchemaBuilder from "@pothos/core";
import PrismaPlugin from "@pothos/plugin-prisma";

import { prisma } from "@/lib/db/prisma";
import type { GraphQLContext } from "@/lib/graphql/context";
import PrismaTypes, { getDatamodel } from "@/lib/graphql/pothos-prisma-types";

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  PrismaTypes: PrismaTypes;
}>({
  plugins: [PrismaPlugin],
  prisma: {
    client: prisma,
    dmmf: getDatamodel(),
    onUnusedQuery: process.env.NODE_ENV === "production" ? null : "warn",
  },
});
