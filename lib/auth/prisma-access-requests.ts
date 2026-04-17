import { prisma } from "@/lib/db/prisma";
import type { AccessRequestRepository } from "@/lib/auth/access-requests";

export const prismaAccessRequests: AccessRequestRepository = {
  async upsertPending(input) {
    const request = await prisma.accessRequest.upsert({
      where: { auth0Subject: input.auth0Subject },
      create: {
        auth0Subject: input.auth0Subject,
        email: input.email,
        name: input.name,
      },
      update: {
        email: input.email,
        name: input.name,
        status: "PENDING",
      },
    });

    return request;
  },
};
