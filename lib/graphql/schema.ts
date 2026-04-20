import { builder } from "@/lib/graphql/builder";
import { registerCommunicationTypes } from "@/lib/graphql/types/communications";
import { registerListViewTypes } from "@/lib/graphql/types/list-views";
import { registerPeopleTypes } from "@/lib/graphql/types/people";
import { registerSyncTypes } from "@/lib/graphql/types/sync";
import { registerTaskTypes } from "@/lib/graphql/types/tasks";
import { requireStaffUser } from "@/lib/graphql/context";

const viewerType = builder
  .objectRef<{
    id: string;
    email: string | null;
    name: string | null;
    role: string;
  }>("Viewer")
  .implement({
    fields: (t) => ({
      id: t.exposeString("id"),
      email: t.exposeString("email", { nullable: true }),
      name: t.exposeString("name", { nullable: true }),
      role: t.exposeString("role"),
    }),
  });

builder.queryType({
  fields: (t) => ({
    viewer: t.field({
      nullable: true,
      type: viewerType,
      resolve: (_root, _args, context) => {
        const user = requireStaffUser(context);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  }),
});

builder.mutationType({});

registerSyncTypes();
registerTaskTypes();
registerPeopleTypes();
registerListViewTypes();
registerCommunicationTypes();

export const schema = builder.toSchema();
