import type { AccessRequestInput, AccessRequestRecord } from "@/lib/auth/types";

export type AccessRequestRepository = {
  createPending(input: AccessRequestInput): Promise<AccessRequestRecord>;
  findByAuth0Subject(auth0Subject: string): Promise<AccessRequestRecord | null>;
  updatePendingContact(input: AccessRequestInput): Promise<AccessRequestRecord>;
};

export async function requestAccess(
  input: AccessRequestInput,
  repository: AccessRequestRepository,
) {
  const auth0Subject = input.auth0Subject.trim();

  if (!auth0Subject) {
    throw new Error("Auth0 subject is required to request access.");
  }

  const normalizedInput = {
    auth0Subject,
    email: normalizeOptional(input.email),
    name: normalizeOptional(input.name),
  };

  const existingRequest = await repository.findByAuth0Subject(auth0Subject);

  if (!existingRequest) {
    return repository.createPending(normalizedInput);
  }

  if (existingRequest.status !== "PENDING") {
    return existingRequest;
  }

  return repository.updatePendingContact(normalizedInput);
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
