import { prisma } from "@/lib/db/prisma";
import { APP_ROLES, type AppRole, hasPermission } from "@/lib/auth/roles";
import type { AccessRequestStatus, LocalAppUser } from "@/lib/auth/types";
import { rockPersonPhotoPath } from "@/lib/rock/photos";

export type ManagedLinkedRockPerson = {
  email: string | null;
  name: string;
  photoUrl: string | null;
  rockId: string;
};

export type ManagedAppUser = {
  id: string;
  active: boolean;
  auth0Subject: string;
  email: string | null;
  name: string | null;
  role: AppRole;
  rockPersonId: string | null;
  linkedPerson: ManagedLinkedRockPerson | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ManagedAccessRequest = {
  id: string;
  auth0Subject: string;
  email: string | null;
  name: string | null;
  status: AccessRequestStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UserManagementSummary = {
  accessRequests: ManagedAccessRequest[];
  activeUserCount: number;
  pendingRequestCount: number;
  users: ManagedAppUser[];
};

export type ApproveAccessRequestInput = {
  requestId: string;
  role: AppRole;
};

export type DenyAccessRequestInput = {
  requestId: string;
};

export type UpdateAppUserInput = {
  userId: string;
  active: boolean;
  role: AppRole;
};

export async function listUserManagementSummary(actor: LocalAppUser) {
  requireUserManagement(actor);

  const [users, accessRequests] = await Promise.all([
    prisma.appUser.findMany({
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    }),
    prisma.accessRequest.findMany({
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);
  const linkedRockPersonIds = Array.from(
    new Set(
      users.flatMap((user) => {
        if (!user.rockPersonId) {
          return [];
        }

        const rockId = Number(user.rockPersonId);
        if (!Number.isInteger(rockId) || rockId <= 0) {
          return [];
        }

        return [rockId];
      }),
    ),
  );
  const linkedPeople = linkedRockPersonIds.length
    ? await prisma.rockPerson.findMany({
        select: {
          email: true,
          firstName: true,
          lastName: true,
          nickName: true,
          photoRockId: true,
          rockId: true,
        },
        where: {
          rockId: {
            in: linkedRockPersonIds,
          },
        },
      })
    : [];
  const linkedPeopleById = new Map(
    linkedPeople.map((person) => [
      String(person.rockId),
      {
        email: person.email,
        name: formatRockPersonName(person),
        photoUrl: rockPersonPhotoPath(person.photoRockId),
        rockId: String(person.rockId),
      } satisfies ManagedLinkedRockPerson,
    ]),
  );

  const sortedAccessRequests = accessRequests.sort((first, second) => {
    const firstWeight = first.status === "PENDING" ? 0 : 1;
    const secondWeight = second.status === "PENDING" ? 0 : 1;

    if (firstWeight !== secondWeight) return firstWeight - secondWeight;

    return second.updatedAt.getTime() - first.updatedAt.getTime();
  });

  return {
    accessRequests: sortedAccessRequests.map((request) => ({
      id: request.id,
      auth0Subject: request.auth0Subject,
      email: request.email,
      name: request.name,
      status: request.status as AccessRequestStatus,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
    })),
    activeUserCount: users.filter((user) => user.active).length,
    pendingRequestCount: accessRequests.filter(
      (request) => request.status === "PENDING",
    ).length,
    users: users.map((user) => ({
      id: user.id,
      active: user.active,
      auth0Subject: user.auth0Subject,
      email: user.email,
      name: user.name,
      role: user.role as AppRole,
      rockPersonId: user.rockPersonId,
      linkedPerson: user.rockPersonId
        ? linkedPeopleById.get(user.rockPersonId) ?? null
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  } satisfies UserManagementSummary;
}

export async function approveAccessRequest(
  input: ApproveAccessRequestInput,
  actor: LocalAppUser,
) {
  requireUserManagement(actor);
  const role = normalizeRole(input.role);

  const request = await prisma.accessRequest.findUnique({
    where: { id: input.requestId },
  });

  if (!request) {
    throw new Error("Access request not found.");
  }

  const existingUser = await prisma.appUser.findUnique({
    where: { auth0Subject: request.auth0Subject },
  });

  const autoLinkedRockPersonId = await findRockPersonIdForAuth0Subject(
    request.auth0Subject,
  );
  const resolvedRockPersonId =
    autoLinkedRockPersonId ?? existingUser?.rockPersonId ?? null;

  await prisma.$transaction([
    prisma.appUser.upsert({
      where: { auth0Subject: request.auth0Subject },
      create: {
        active: true,
        auth0Subject: request.auth0Subject,
        email: request.email,
        name: request.name,
        role,
        rockPersonId: resolvedRockPersonId,
      },
      update: {
        active: true,
        email: request.email,
        name: request.name,
        role,
        rockPersonId: resolvedRockPersonId,
      },
    }),
    prisma.accessRequest.update({
      where: { id: request.id },
      data: { status: "APPROVED" },
    }),
  ]);
}

export async function denyAccessRequest(
  input: DenyAccessRequestInput,
  actor: LocalAppUser,
) {
  requireUserManagement(actor);

  await prisma.accessRequest.update({
    where: { id: input.requestId },
    data: { status: "DENIED" },
  });
}

export async function updateAppUser(
  input: UpdateAppUserInput,
  actor: LocalAppUser,
) {
  requireUserManagement(actor);
  const role = normalizeRole(input.role);

  if (input.userId === actor.id && (!input.active || role !== "ADMIN")) {
    throw new Error("You cannot remove your own administrator access.");
  }

  const currentUser = await prisma.appUser.findUnique({
    where: { id: input.userId },
    select: {
      auth0Subject: true,
      rockPersonId: true,
    },
  });

  if (!currentUser) {
    throw new Error("User not found.");
  }

  const autoLinkedRockPersonId = await findRockPersonIdForAuth0Subject(
    currentUser.auth0Subject,
  );

  await prisma.appUser.update({
    where: { id: input.userId },
    data: {
      active: input.active,
      role,
      rockPersonId: autoLinkedRockPersonId ?? currentUser.rockPersonId,
    },
  });
}

function requireUserManagement(actor: LocalAppUser) {
  if (!hasPermission(actor.role, "settings:manage")) {
    throw new Error("Settings management permission is required.");
  }
}

function normalizeRole(role: AppRole) {
  if (!APP_ROLES.includes(role)) {
    throw new Error("Invalid app role.");
  }

  return role;
}

async function findRockPersonIdForAuth0Subject(auth0Subject: string) {
  const baseUrl = process.env.ROCK_BASE_URL;
  const restKey = process.env.ROCK_REST_KEY;

  if (!baseUrl || !restKey || !auth0Subject.trim()) {
    return null;
  }

  const candidates = buildRockUsernameCandidates(auth0Subject);

  for (const username of candidates) {
    const personId = await findRockPersonIdByUsername(
      baseUrl,
      restKey,
      username,
    );
    if (personId) {
      return personId;
    }
  }

  return null;
}

function buildRockUsernameCandidates(auth0Subject: string) {
  const trimmed = auth0Subject.trim();

  return Array.from(new Set([`AUTH0_${trimmed}`, `auth0_${trimmed}`, trimmed]));
}

async function findRockPersonIdByUsername(
  baseUrl: string,
  restKey: string,
  username: string,
) {
  const url = new URL("/api/UserLogins", baseUrl);
  url.searchParams.set("$select", "PersonId,UserName");
  url.searchParams.set("$top", "5");
  url.searchParams.set(
    "$filter",
    `UserName eq '${escapeODataString(username)}'`,
  );

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Authorization-Token": restKey,
      },
      method: "GET",
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    const rows = normalizeUserLoginRows(payload);
    const exactMatches = rows.filter((row) => row.userName === username);

    if (exactMatches.length !== 1) {
      return null;
    }

    const personId = Number(exactMatches[0].personId);
    if (!Number.isInteger(personId) || personId <= 0) {
      return null;
    }

    return String(personId);
  } catch {
    return null;
  }
}

function normalizeUserLoginRows(payload: unknown) {
  if (Array.isArray(payload)) {
    return normalizeUserLoginRowRecords(payload);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const typedPayload = payload as {
    d?: { results?: unknown };
    value?: unknown;
  };
  const source = Array.isArray(typedPayload.value)
    ? typedPayload.value
    : Array.isArray(typedPayload.d?.results)
      ? typedPayload.d.results
      : [];

  return normalizeUserLoginRowRecords(source);
}

function normalizeUserLoginRowRecords(source: unknown[]) {
  return source.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const record = item as Record<string, unknown>;
    const userName = record.UserName;
    const personId = record.PersonId;

    if (typeof userName !== "string") {
      return [];
    }

    return [
      {
        userName,
        personId,
      },
    ];
  });
}

function escapeODataString(value: string) {
  return value.replaceAll("'", "''");
}

function formatRockPersonName(person: {
  firstName: string | null;
  lastName: string | null;
  nickName: string | null;
  rockId: number;
}) {
  const combined = [person.nickName || person.firstName, person.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ")
    .trim();

  if (combined.length > 0) {
    return combined;
  }

  return `Person ${person.rockId}`;
}
