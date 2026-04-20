import { NextResponse } from "next/server";

import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { rockGetImageUrl } from "@/lib/rock/photos";

type PersonPhotoRouteContext = {
  params: Promise<{
    photoId: string;
  }>;
};

export async function GET(_request: Request, context: PersonPhotoRouteContext) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    return NextResponse.json(
      { error: "Authentication is required." },
      { status: 401 },
    );
  }

  if (accessState.status === "needs_access") {
    return NextResponse.json(
      { error: "Local application access is required." },
      { status: 403 },
    );
  }

  if (
    !hasPermission(accessState.user.role, "people:read_limited") &&
    !hasPermission(accessState.user.role, "people:read_care_context")
  ) {
    return NextResponse.json(
      { error: "You do not have permission to view Rock profile photos." },
      { status: 403 },
    );
  }

  const photoId = Number((await context.params).photoId);

  if (!Number.isInteger(photoId) || photoId <= 0) {
    return NextResponse.json(
      { error: "Rock photo ID must be a positive integer." },
      { status: 400 },
    );
  }

  const linkedPerson = await prisma.rockPerson.findFirst({
    select: {
      rockId: true,
    },
    where: {
      photoRockId: photoId,
    },
  });

  if (!linkedPerson) {
    return NextResponse.json(
      { error: "Rock photo was not found." },
      {
        status: 404,
      },
    );
  }

  const baseUrl = process.env.ROCK_BASE_URL;
  const restKey = process.env.ROCK_REST_KEY;

  if (!baseUrl || !restKey) {
    return NextResponse.json(
      { error: "Rock image proxy is not configured." },
      { status: 503 },
    );
  }

  const response = await fetch(rockGetImageUrl(baseUrl, photoId), {
    headers: {
      Accept: "image/*",
      "Authorization-Token": restKey,
    },
    method: "GET",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "Rock photo could not be retrieved." },
      { status: response.status === 404 ? 404 : 502 },
    );
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    response.headers.get("Content-Type") ?? "image/jpeg",
  );
  headers.set("Cache-Control", "private, max-age=300");

  return new NextResponse(response.body ?? (await response.arrayBuffer()), {
    headers,
    status: 200,
  });
}
