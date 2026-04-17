"use server";

import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth/auth0";
import { resolveAccessState } from "@/lib/auth/access-control";
import { prismaAppUsers } from "@/lib/auth/prisma-users";
import { prismaAccessRequests } from "@/lib/auth/prisma-access-requests";
import { requestAccess } from "@/lib/auth/access-requests";

export async function submitAccessRequest() {
  const session = await auth0.getSession();
  const accessState = await resolveAccessState(session?.user, prismaAppUsers);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "authorized") {
    redirect("/");
  }

  await requestAccess(
    {
      auth0Subject: accessState.identity.sub,
      email: accessState.identity.email,
      name: accessState.identity.name,
    },
    prismaAccessRequests,
  );

  redirect("/access-request/submitted");
}
