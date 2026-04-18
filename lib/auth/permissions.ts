import { GraphQLError } from "graphql";

import { hasPermission, type Permission } from "@/lib/auth/roles";
import type { LocalAppUser } from "@/lib/auth/types";

export function requireAppPermission(
  user: LocalAppUser,
  permission: Permission,
) {
  if (!hasPermission(user.role, permission)) {
    throw new GraphQLError(
      "You do not have permission to perform this action.",
      {
        extensions: {
          code: "FORBIDDEN",
        },
      },
    );
  }
}
