import type { AppUserRepository } from "@/lib/auth/users";
import { toAuthenticatedIdentity } from "@/lib/auth/users";
import type { AccessState } from "@/lib/auth/types";

export async function resolveAccessState(
  sessionUser: unknown,
  users: AppUserRepository,
): Promise<AccessState> {
  const identity = toAuthenticatedIdentity(sessionUser);

  if (!identity) {
    return { status: "anonymous" };
  }

  const localUser = await users.findActiveByAuth0Subject(identity.sub);

  if (!localUser) {
    return { status: "needs_access", identity };
  }

  return { status: "authorized", user: localUser };
}

export async function getCurrentAccessState(sessionUser: unknown) {
  const { prismaAppUsers } = await import("@/lib/auth/prisma-users");
  return resolveAccessState(sessionUser, prismaAppUsers);
}
