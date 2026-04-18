import type { Plugin } from "@envelop/core";
import { GraphQLError } from "graphql";

const INTROSPECTION_ERROR_MESSAGE =
  "GraphQL introspection has been disabled in production.";

type GraphQLAstNode = {
  kind?: string;
  name?: {
    value?: string;
  };
  [key: string]: unknown;
};

function requestsIntrospection(node: unknown): boolean {
  if (!node || typeof node !== "object") {
    return false;
  }

  const astNode = node as GraphQLAstNode;

  if (
    astNode.kind === "Field" &&
    (astNode.name?.value === "__schema" || astNode.name?.value === "__type")
  ) {
    return true;
  }

  return ["definitions", "selectionSet", "selections"].some((key) => {
    const value = astNode[key];

    if (Array.isArray(value)) {
      return value.some(requestsIntrospection);
    }

    return requestsIntrospection(value);
  });
}

export function productionIntrospectionPlugins() {
  return [
    {
      onValidate({ params, setResult }) {
        if (
          process.env["NODE_ENV"] === "production" &&
          requestsIntrospection(params.documentAST)
        ) {
          setResult([new GraphQLError(INTROSPECTION_ERROR_MESSAGE)]);
        }
      },
    } satisfies Plugin,
  ];
}
