import { createYoga } from "graphql-yoga";

import { createGraphQLContext } from "@/lib/graphql/context";
import { productionIntrospectionPlugins } from "@/lib/graphql/introspection";
import { schema } from "@/lib/graphql/schema";

type NextContext = {
  params: Promise<Record<string, string>>;
};

const { handleRequest } = createYoga<NextContext>({
  context: createGraphQLContext,
  fetchAPI: {
    Response,
  },
  graphqlEndpoint: "/api/graphql",
  graphiql: process.env.NODE_ENV !== "production",
  maskedErrors: process.env.NODE_ENV === "production",
  plugins: productionIntrospectionPlugins(),
  schema,
});

export {
  handleRequest as GET,
  handleRequest as OPTIONS,
  handleRequest as POST,
};
