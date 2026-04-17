import { prisma } from "@/lib/db/prisma";
import type { AccessRequestRepository } from "@/lib/auth/access-requests";

export const prismaAccessRequests: AccessRequestRepository = {
  async createPending(input) {
    return prisma.accessRequest.create({
      data: {
        auth0Subject: input.auth0Subject,
        email: input.email,
        name: input.name,
      },
    });
  },

  async findByAuth0Subject(auth0Subject) {
    return prisma.accessRequest.findUnique({
      where: { auth0Subject },
    });
  },

  async updatePendingContact(input) {
    return prisma.accessRequest.update({
      where: { auth0Subject: input.auth0Subject },
      data: {
        email: input.email,
        name: input.name,
      },
    });
  },
};
