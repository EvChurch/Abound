import type { AppRole } from "@/lib/auth/roles";

export type AuthenticatedIdentity = {
  sub: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
};

export type LocalAppUser = {
  id: string;
  auth0Subject: string;
  email: string | null;
  name: string | null;
  role: AppRole;
  active: boolean;
  rockPersonId: string | null;
};

export type AccessState =
  | { status: "anonymous" }
  | { status: "needs_access"; identity: AuthenticatedIdentity }
  | { status: "authorized"; user: LocalAppUser };

export type AccessRequestStatus = "PENDING" | "APPROVED" | "DENIED";

export type AccessRequestInput = {
  auth0Subject: string;
  email?: string | null;
  name?: string | null;
};

export type AccessRequestRecord = {
  id: string;
  auth0Subject: string;
  email: string | null;
  name: string | null;
  status: AccessRequestStatus;
  createdAt: Date;
  updatedAt: Date;
};
