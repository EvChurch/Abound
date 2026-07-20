import { describe, expect, it } from "vitest";

import {
  JOINING_NEVER_GIVEN_TEMPLATE_KEY,
  normalizeTemplateFields,
  renderCommunicationTemplate,
} from "@/lib/communications/templates";
import {
  listTemplateTokens,
  renderApprovedTokens,
} from "@/lib/communications/template-tokens";

describe("communication template tokens", () => {
  it("renders approved tokens with safe fallbacks", () => {
    expect(
      renderApprovedTokens("Hi {{ firstName }} from {{ campusName }}", {
        campusName: "North",
        firstName: null,
      }),
    ).toBe("Hi there from North");
  });

  it("rejects unsupported tokens", () => {
    expect(() => renderApprovedTokens("Amount: {{ totalGiven }}", {})).toThrow(
      "Unsupported communication template token: totalGiven",
    );
  });

  it("lists approved tokens used by a field", () => {
    expect(
      listTemplateTokens("Hi {{firstName}} from {{ campusName }}"),
    ).toEqual(["firstName", "campusName"]);
  });
});

describe("communication templates", () => {
  it("normalizes React Email editor template output", () => {
    expect(
      normalizeTemplateFields(JOINING_NEVER_GIVEN_TEMPLATE_KEY, {
        format: "react-email-editor",
        html: " <p>Welcome {{ firstName }}</p> ",
        subject: "  Welcome {{ firstName }}  ",
      }),
    ).toMatchObject({
      format: "react-email-editor",
      html: "<p>Welcome {{ firstName }}</p>",
      subject: "Welcome {{ firstName }}",
    });
  });

  it("rejects old structured fields and unsupported tokens", () => {
    expect(() =>
      normalizeTemplateFields(JOINING_NEVER_GIVEN_TEMPLATE_KEY, {
        subject: "Hello",
      }),
    ).toThrow("React Email Editor");

    expect(() =>
      normalizeTemplateFields(JOINING_NEVER_GIVEN_TEMPLATE_KEY, {
        format: "react-email-editor",
        html: "<p>Amount: {{ totalGiven }}</p>",
        subject: "Hello",
      }),
    ).toThrow("Unsupported communication template token: totalGiven");
  });

  it("renders HTML and plain text without finance-only amount content", async () => {
    const rendered = await renderCommunicationTemplate({
      fields: {
        format: "react-email-editor",
        html: "<h1>Welcome {{ firstName }}</h1><p>Hi {{ firstName }}</p><p>We are glad you are connecting with {{ householdName }}.</p>",
        subject: "Welcome {{ firstName }}",
      },
      key: JOINING_NEVER_GIVEN_TEMPLATE_KEY,
      tokenContext: {
        campusName: "North",
        displayName: "Jane Joining",
        firstName: "Jane",
        householdName: "Joining Household",
      },
    });

    expect(rendered.subject).toBe("Welcome Jane");
    expect(rendered.previewText).toBe("A quick note from our church team.");
    expect(rendered.html).toContain("Welcome Jane");
    expect(rendered.html).toContain("Joining Household");
    expect(rendered.html).toContain("/email-assets/ev-church-header.png");
    expect(rendered.html).toContain(
      "You are receiving this because you are connected with our church.",
    );
    expect(rendered.text).toContain("Hi Jane");
    expect(rendered.text).not.toMatch(/\$|total|amount/i);
    expect(rendered.html).not.toMatch(/totalGiven|giving amount/i);
  });
});
