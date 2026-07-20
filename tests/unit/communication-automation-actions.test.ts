import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  archiveCommunicationAutomation: vi.fn(),
  cancelAutomationRun: vi.fn(),
  cancelAutomationRunReview: vi.fn(),
  completeAutomationRunReview: vi.fn(),
  createCommunicationAutomation: vi.fn(),
  createJoiningNeverGivenAutomation: vi.fn(),
  deleteCommunicationAutomation: vi.fn(),
  excludeAutomationRecipient: vi.fn(),
  getSession: vi.fn(),
  prepareAutomationRunSendNow: vi.fn(),
  redirect: vi.fn(),
  runCommunicationAutomationNow: vi.fn(),
  unarchiveCommunicationAutomation: vi.fn(),
  updateCommunicationAutomation: vi.fn(),
  updateAutomationRecipientReviewDecision: vi.fn(),
  updateCommunicationAutomationTemplate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: mocks.getSession,
  },
}));

vi.mock("@/lib/auth/access-control", () => ({
  getCurrentAccessState: vi.fn(async () => mocks.accessState),
}));

vi.mock("@/lib/communications/automation-runs", () => ({
  cancelAutomationRun: mocks.cancelAutomationRun,
  cancelAutomationRunReview: mocks.cancelAutomationRunReview,
  completeAutomationRunReview: mocks.completeAutomationRunReview,
  excludeAutomationRecipient: mocks.excludeAutomationRecipient,
  prepareAutomationRunSendNow: mocks.prepareAutomationRunSendNow,
  runCommunicationAutomationNow: mocks.runCommunicationAutomationNow,
  updateAutomationRecipientReviewDecision:
    mocks.updateAutomationRecipientReviewDecision,
}));

vi.mock("@/lib/communications/automations", () => ({
  archiveCommunicationAutomation: mocks.archiveCommunicationAutomation,
  createCommunicationAutomation: mocks.createCommunicationAutomation,
  createJoiningNeverGivenAutomation: mocks.createJoiningNeverGivenAutomation,
  deleteCommunicationAutomation: mocks.deleteCommunicationAutomation,
  unarchiveCommunicationAutomation: mocks.unarchiveCommunicationAutomation,
  updateCommunicationAutomation: mocks.updateCommunicationAutomation,
  updateCommunicationAutomationTemplate:
    mocks.updateCommunicationAutomationTemplate,
}));

import {
  archiveCommunicationAutomationAction,
  cancelCommunicationAutomationRunAction,
  cancelCommunicationAutomationRunReviewAction,
  completeCommunicationAutomationRunReviewAction,
  createCommunicationAutomationFromSegmentAction,
  createJoiningNeverGivenAutomationAction,
  deleteCommunicationAutomationAction,
  excludeAutomationRecipientAction,
  runCommunicationAutomationNowAction,
  sendCommunicationAutomationRunNowAction,
  unarchiveCommunicationAutomationAction,
  updateAutomationRecipientReviewDecisionInlineAction,
  updateAutomationRecipientReviewDecisionAction,
  updateCommunicationAutomationTemplateAction,
  updateCommunicationAutomationAction,
} from "@/app/communications/actions";

const adminUser = {
  active: true,
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  id: "user_1",
  name: "Admin",
  rockPersonId: null,
  role: "ADMIN" as const,
};

describe("communication automation actions", () => {
  beforeEach(() => {
    mocks.accessState = {
      status: "authorized",
      user: adminUser,
    };
    mocks.createJoiningNeverGivenAutomation.mockResolvedValue({
      id: "automation_1",
    });
    mocks.archiveCommunicationAutomation.mockResolvedValue({
      id: "automation_1",
    });
    mocks.cancelAutomationRun.mockResolvedValue({
      id: "run_1",
    });
    mocks.cancelAutomationRunReview.mockResolvedValue({
      id: "run_1",
    });
    mocks.completeAutomationRunReview.mockResolvedValue({
      id: "run_1",
    });
    mocks.createCommunicationAutomation.mockResolvedValue({
      id: "automation_2",
    });
    mocks.deleteCommunicationAutomation.mockResolvedValue(true);
    mocks.excludeAutomationRecipient.mockResolvedValue({
      id: "recipient_1",
    });
    mocks.getSession.mockResolvedValue(null);
    mocks.prepareAutomationRunSendNow.mockResolvedValue({
      id: "run_1",
    });
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
    mocks.runCommunicationAutomationNow.mockResolvedValue({
      id: "run_1",
      recipientCount: 1,
    });
    mocks.updateCommunicationAutomationTemplate.mockResolvedValue({
      id: "automation_1",
    });
    mocks.unarchiveCommunicationAutomation.mockResolvedValue({
      id: "automation_1",
    });
    mocks.updateCommunicationAutomation.mockResolvedValue({
      id: "automation_1",
    });
    mocks.updateAutomationRecipientReviewDecision.mockResolvedValue({
      id: "recipient_1",
    });
  });

  it("creates the preconfigured joining automation and redirects to detail", async () => {
    await expect(createJoiningNeverGivenAutomationAction()).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?created=1",
    );

    expect(mocks.createJoiningNeverGivenAutomation).toHaveBeenCalledWith(
      adminUser,
    );
  });

  it("creates an automation from a selected saved segment", async () => {
    const formData = new FormData();
    formData.set("savedListViewId", "view_123");
    formData.set("name", "First-time guests");
    formData.set("reviewerUserId", "user_2");
    formData.append("reviewerUserId", "user_3");
    formData.set("scheduleCron", "0 10 * * 3");
    formData.set("suppressionMode", "EVERY_RUN");
    formData.set("subject", "Welcome {{firstName}}");
    formData.set("previewText", "Before you visit");
    formData.set(
      "html",
      "<h1>Welcome {{firstName}}</h1><p>Here is what to expect.</p>",
    );
    formData.set("text", "Welcome {{firstName}}\n\nHere is what to expect.");
    formData.set("editorJson", '{"type":"doc","content":[]}');

    await expect(
      createCommunicationAutomationFromSegmentAction(formData),
    ).rejects.toThrow("NEXT_REDIRECT:/communications/automation_2?created=1");

    expect(mocks.createCommunicationAutomation).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "First-time guests",
        reviewerUserIds: ["user_2", "user_3"],
        savedListViewId: "view_123",
        scheduleCron: "0 10 * * 3",
        suppressionMode: "EVERY_RUN",
        templateFields: expect.objectContaining({
          format: "react-email-editor",
          html: "<h1>Welcome {{firstName}}</h1><p>Here is what to expect.</p>",
          subject: "Welcome {{firstName}}",
        }),
      }),
      adminUser,
    );
  });

  it("updates workflow settings and template output", async () => {
    const formData = new FormData();
    formData.set("id", "automation_1");
    formData.set("savedListViewId", "view_456");
    formData.set("name", "Returning guests");
    formData.set("reviewerUserId", "user_2");
    formData.append("reviewerUserId", "user_3");
    formData.set("scheduleCron", "30 8 * * 1");
    formData.set("suppressionMode", "COOLDOWN");
    formData.set("cooldownDays", "45");
    formData.set("subject", "Hello {{firstName}}");
    formData.set("previewText", "Preview");
    formData.set("html", "<h1>Hello {{firstName}}</h1><p>Body</p>");
    formData.set("text", "Hello {{firstName}}\n\nBody");
    formData.set("editorJson", '{"type":"doc","content":[]}');

    await expect(updateCommunicationAutomationAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?updated=1",
    );

    expect(mocks.updateCommunicationAutomation).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "automation_1",
        name: "Returning guests",
        reviewerUserIds: ["user_2", "user_3"],
        savedListViewId: "view_456",
        scheduleCron: "30 8 * * 1",
        suppressionMode: "COOLDOWN",
        cooldownDays: 45,
        templateFields: expect.objectContaining({
          format: "react-email-editor",
          html: "<h1>Hello {{firstName}}</h1><p>Body</p>",
          subject: "Hello {{firstName}}",
        }),
      }),
      adminUser,
    );
  });

  it("updates editor template output only through the service", async () => {
    const formData = new FormData();
    formData.set("id", "automation_1");
    formData.set("subject", "Hello {{firstName}}");
    formData.set("previewText", "Preview");
    formData.set("html", "<h1>Hello {{firstName}}</h1><p>Body</p>");
    formData.set("text", "Hello {{firstName}}\n\nBody");
    formData.set("editorJson", '{"type":"doc","content":[]}');

    await expect(
      updateCommunicationAutomationTemplateAction(formData),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?template=updated",
    );

    expect(mocks.updateCommunicationAutomationTemplate).toHaveBeenCalledWith(
      {
        id: "automation_1",
        templateFields: expect.objectContaining({
          format: "react-email-editor",
          html: "<h1>Hello {{firstName}}</h1><p>Body</p>",
          subject: "Hello {{firstName}}",
        }),
      },
      adminUser,
    );
  });

  it("excludes a frozen recipient from the review screen", async () => {
    const formData = new FormData();
    formData.set("automationId", "automation_1");
    formData.set("recipientId", "recipient_1");
    formData.set("reason", "Already contacted personally");

    await expect(excludeAutomationRecipientAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?recipient=excluded",
    );

    expect(mocks.excludeAutomationRecipient).toHaveBeenCalledWith(
      {
        reason: "Already contacted personally",
        recipientId: "recipient_1",
      },
      adminUser,
    );
  });

  it("updates a frozen recipient review decision from the review screen", async () => {
    const formData = new FormData();
    formData.set("automationId", "automation_1");
    formData.set("decision", "PERMANENTLY_EXCLUDE");
    formData.set("recipientId", "recipient_1");
    formData.set("runId", "run_1");

    await expect(
      updateAutomationRecipientReviewDecisionAction(formData),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1/runs/run_1?recipient=updated",
    );

    expect(mocks.updateAutomationRecipientReviewDecision).toHaveBeenCalledWith(
      {
        decision: "PERMANENTLY_EXCLUDE",
        recipientId: "recipient_1",
      },
      adminUser,
    );
  });

  it("updates a frozen recipient review decision inline without redirecting", async () => {
    mocks.redirect.mockClear();

    await expect(
      updateAutomationRecipientReviewDecisionInlineAction({
        decision: "SKIP_BATCH",
        recipientId: "recipient_1",
      }),
    ).resolves.toEqual({
      decision: "SKIP_BATCH",
      recipientId: "recipient_1",
    });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.updateAutomationRecipientReviewDecision).toHaveBeenCalledWith(
      {
        decision: "SKIP_BATCH",
        recipientId: "recipient_1",
      },
      adminUser,
    );
  });

  it("completes a scheduled run review with staged decisions", async () => {
    const formData = new FormData();
    formData.set("automationId", "automation_1");
    formData.set(
      "decisionsJson",
      JSON.stringify([
        { decision: "SEND", recipientId: "recipient_1" },
        { decision: "SKIP_BATCH", recipientId: "recipient_2" },
      ]),
    );
    formData.set("runId", "run_1");

    await expect(
      completeCommunicationAutomationRunReviewAction(formData),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?review=completed&runId=run_1",
    );

    expect(mocks.completeAutomationRunReview).toHaveBeenCalledWith(
      {
        decisions: [
          { decision: "SEND", recipientId: "recipient_1" },
          { decision: "SKIP_BATCH", recipientId: "recipient_2" },
        ],
        runId: "run_1",
      },
      adminUser,
    );
  });

  it("rejects a scheduled run review", async () => {
    const formData = new FormData();
    formData.set("automationId", "automation_1");
    formData.set("runId", "run_1");

    await expect(
      cancelCommunicationAutomationRunReviewAction(formData),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?review=rejected",
    );

    expect(mocks.cancelAutomationRunReview).toHaveBeenCalledWith(
      { runId: "run_1" },
      adminUser,
    );
  });

  it("cancels an unsent scheduled run from the detail page", async () => {
    const formData = new FormData();
    formData.set("automationId", "automation_1");
    formData.set("runId", "run_1");

    await expect(
      cancelCommunicationAutomationRunAction(formData),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?run=canceled",
    );

    expect(mocks.cancelAutomationRun).toHaveBeenCalledWith(
      { runId: "run_1" },
      adminUser,
    );
  });

  it("moves a ready scheduled run to now and returns to the workflow page", async () => {
    const formData = new FormData();
    formData.set("automationId", "automation_1");
    formData.set("runId", "run_1");

    await expect(
      sendCommunicationAutomationRunNowAction(formData),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?send=ready&runId=run_1",
    );

    expect(mocks.prepareAutomationRunSendNow).toHaveBeenCalledWith(
      { runId: "run_1" },
      adminUser,
    );
  });

  it("runs a workflow immediately and opens the run review page", async () => {
    const formData = new FormData();
    formData.set("id", "automation_1");

    await expect(runCommunicationAutomationNowAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1/runs/run_1",
    );

    expect(mocks.runCommunicationAutomationNow).toHaveBeenCalledWith(
      { automationId: "automation_1" },
      adminUser,
    );
  });

  it("shows an empty run notice when no recipients are eligible", async () => {
    mocks.runCommunicationAutomationNow.mockResolvedValueOnce(null);
    const formData = new FormData();
    formData.set("id", "automation_1");

    await expect(runCommunicationAutomationNowAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?run=empty",
    );
  });

  it("archives a workflow and returns to detail", async () => {
    const formData = new FormData();
    formData.set("id", "automation_1");

    await expect(
      archiveCommunicationAutomationAction(formData),
    ).rejects.toThrow("NEXT_REDIRECT:/communications/automation_1?archived=1");

    expect(mocks.archiveCommunicationAutomation).toHaveBeenCalledWith(
      "automation_1",
      adminUser,
    );
  });

  it("unarchives a workflow and returns to detail", async () => {
    const formData = new FormData();
    formData.set("id", "automation_1");

    await expect(
      unarchiveCommunicationAutomationAction(formData),
    ).rejects.toThrow(
      "NEXT_REDIRECT:/communications/automation_1?unarchived=1",
    );

    expect(mocks.unarchiveCommunicationAutomation).toHaveBeenCalledWith(
      "automation_1",
      adminUser,
    );
  });

  it("deletes a workflow and returns to communications", async () => {
    const formData = new FormData();
    formData.set("id", "automation_1");

    await expect(deleteCommunicationAutomationAction(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/communications?deleted=1",
    );

    expect(mocks.deleteCommunicationAutomation).toHaveBeenCalledWith(
      "automation_1",
      adminUser,
    );
  });
});
