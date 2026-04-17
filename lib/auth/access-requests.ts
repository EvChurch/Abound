import type { AccessRequestInput, AccessRequestRecord } from "@/lib/auth/types";

export type AccessRequestRepository = {
  upsertPending(input: AccessRequestInput): Promise<AccessRequestRecord>;
};

export async function requestAccess(
  input: AccessRequestInput,
  repository: AccessRequestRepository,
) {
  const auth0Subject = input.auth0Subject.trim();

  if (!auth0Subject) {
    throw new Error("Auth0 subject is required to request access.");
  }

  return repository.upsertPending({
    auth0Subject,
    email: normalizeOptional(input.email),
    name: normalizeOptional(input.name),
  });
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
