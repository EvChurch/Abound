import type { AuthenticatedIdentity, LocalAppUser } from "@/lib/auth/types";

export type AppUserRepository = {
  findActiveByAuth0Subject(auth0Subject: string): Promise<LocalAppUser | null>;
};

export function toAuthenticatedIdentity(
  user: unknown,
): AuthenticatedIdentity | null {
  if (!user || typeof user !== "object") {
    return null;
  }

  const maybeUser = user as Record<string, unknown>;
  const sub = maybeUser.sub;

  if (typeof sub !== "string" || sub.length === 0) {
    return null;
  }

  return {
    sub,
    email: typeof maybeUser.email === "string" ? maybeUser.email : null,
    name: typeof maybeUser.name === "string" ? maybeUser.name : null,
    picture: typeof maybeUser.picture === "string" ? maybeUser.picture : null,
  };
}
