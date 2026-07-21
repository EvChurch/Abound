import { GraphQLError } from "graphql";

import { resolveAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import type { AccessState, LocalAppUser } from "@/lib/auth/types";
import { prismaAppUsers } from "@/lib/auth/prisma-users";
import type { AppUserRepository } from "@/lib/auth/users";

export type GraphQLContext = {
  accessState: AccessState;
};

export async function createGraphQLContext(): Promise<GraphQLContext> {
  const session = await auth0.getSession();

  return resolveGraphQLContext(session?.user);
}

export async function resolveGraphQLContext(
  sessionUser: unknown,
  users: AppUserRepository = prismaAppUsers,
): Promise<GraphQLContext> {
  return {
    accessState: await resolveAccessState(sessionUser, users),
  };
}

export function requireStaffUser(context: GraphQLContext): LocalAppUser {
  if (context.accessState.status === "anonymous") {
    throw new GraphQLError("Authentication is required.", {
      extensions: {
        code: "UNAUTHENTICATED",
      },
    });
  }

  if (context.accessState.status === "needs_access") {
    throw new GraphQLError("Local application access is required.", {
      extensions: {
        code: "FORBIDDEN",
      },
    });
  }

  return context.accessState.user;
}
