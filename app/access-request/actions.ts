"use server";

import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth/auth0";
import { prismaAccessRequests } from "@/lib/auth/prisma-access-requests";
import { requestAccess } from "@/lib/auth/access-requests";
import { toAuthenticatedIdentity } from "@/lib/auth/users";

export async function submitAccessRequest() {
  const session = await auth0.getSession();
  const identity = toAuthenticatedIdentity(session?.user);

  if (!identity) {
    redirect("/auth/login");
  }

  await requestAccess(
    {
      auth0Subject: identity.sub,
      email: identity.email,
      name: identity.name,
    },
    prismaAccessRequests,
  );

  redirect("/access-request/submitted");
}
