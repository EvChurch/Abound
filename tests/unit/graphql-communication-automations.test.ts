import { describe, expect, it } from "vitest";

import { requirePermission, type GraphQLContext } from "@/lib/graphql/context";
import { schema } from "@/lib/graphql/schema";

describe("GraphQL communication automation schema", () => {
  it("exposes automation reads, review fields, and controlled mutations", () => {
    expect(Object.keys(schema.getQueryType()?.getFields() ?? {})).toEqual(
      expect.arrayContaining([
        "communicationAutomation",
        "communicationAutomations",
        "communicationTemplatePreview",
      ]),
    );
    expect(Object.keys(schema.getMutationType()?.getFields() ?? {})).toEqual(
      expect.arrayContaining([
        "createJoiningNeverGivenAutomation",
        "excludeCommunicationAutomationRecipient",
        "updateCommunicationAutomationTemplate",
      ]),
    );
    expect(Object.keys(objectFields("CommunicationAutomation"))).toEqual(
      expect.arrayContaining([
        "activationReadinessIssues",
        "reviewers",
        "runs",
        "templateFieldsJson",
      ]),
    );
    expect(
      Object.keys(objectFields("CommunicationAutomationRecipient")),
    ).toEqual(
      expect.arrayContaining(["displayNameSnapshot", "skipReason", "status"]),
    );
  });

  it("uses local role permissions for automation access", () => {
    const financeContext: GraphQLContext = {
      accessState: {
        status: "authorized",
        user: {
          active: true,
          auth0Subject: "auth0|finance",
          email: "finance@example.com",
          id: "user_2",
          name: "Finance",
          rockPersonId: null,
          role: "FINANCE",
        },
      },
    };

    expect(() =>
      requirePermission(financeContext, "communications:automations:manage"),
    ).toThrow("You do not have permission to perform this action.");
  });
});

function objectFields(typeName: string) {
  const type = schema.getType(typeName) as
    | { getFields?: () => Record<string, unknown> }
    | undefined;

  return type?.getFields?.() ?? {};
}
