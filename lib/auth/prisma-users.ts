import { prisma } from "@/lib/db/prisma";
import type { AppRole } from "@/lib/auth/roles";
import type { AppUserRepository } from "@/lib/auth/users";

export const prismaAppUsers: AppUserRepository = {
  async findActiveByAuth0Subject(auth0Subject) {
    const user = await prisma.appUser.findUnique({
      where: { auth0Subject },
    });

    if (!user || !user.active) {
      return null;
    }

    return {
      id: user.id,
      auth0Subject: user.auth0Subject,
      email: user.email,
      name: user.name,
      role: user.role as AppRole,
      active: user.active,
      rockPersonId: user.rockPersonId,
    };
  },
};
