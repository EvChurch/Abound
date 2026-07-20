import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { CommunicationAutomationRecord } from "@/lib/communications/automations";
import type { PeopleConnection } from "@/lib/list-views/people-list";
import type { SavedListViewRecord } from "@/lib/list-views/saved-views";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  automation: {
    audienceResource: "PEOPLE",
    activatedAt: null,
    activatedByUserId: null,
    archivedAt: null,
    cooldownDays: null,
    createdAt: new Date("2026-07-02T00:00:00.000Z"),
    createdByUserId: "user_1",
    fromEmail: null,
    fromName: null,
    id: "automation_1",
    name: "Joining never-given follow-up",
    nextNoticeAt: null,
    nextSendAt: null,
    pausedAt: null,
    preSendNoticeMinutes: 1440,
    replyToEmail: null,
    reviewers: [
      {
        automationId: "automation_1",
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: "reviewer_1",
        reviewer: {
          email: "admin@example.com",
          id: "user_1",
          name: "Admin",
          role: "ADMIN",
        },
        reviewerUserId: "user_1",
      },
      {
        automationId: "automation_1",
        createdAt: new Date("2026-07-02T00:00:00.000Z"),
        id: "reviewer_2",
        reviewer: {
          email: "care@example.com",
          id: "user_2",
          name: "Care",
          role: "PASTORAL_CARE",
        },
        reviewerUserId: "user_2",
      },
    ],
    runs: [
      {
        acceptedCount: 2,
        automationId: "automation_1",
        completedAt: null,
        createdAt: new Date("2026-07-08T00:00:00.000Z"),
        deliverableCount: 2,
        excludedCount: 1,
        events: [],
        failedCount: 0,
        id: "run_1",
        noticeDueAt: new Date("2026-07-07T21:00:00.000Z"),
        noticeSentAt: null,
        recipientCount: 3,
        recipients: [],
        scheduledSendAt: new Date("2026-07-08T21:00:00.000Z"),
        sendStartedAt: null,
        skippedCount: 0,
        status: "PENDING_NOTICE",
        updatedAt: new Date("2026-07-08T00:00:00.000Z"),
        workerJobId: null,
      },
    ],
    savedListView: {
      id: "view_1",
      name: "Joining - Never Given",
      resource: "PEOPLE",
    },
    savedListViewId: "view_1",
    scheduleCron: "0 9 * * 2",
    scheduleTimezone: "Pacific/Auckland",
    segmentSummary: "Saved view: Joining - Never Given",
    suppressionMode: "NEVER_RESEND",
    templateFields: {
      format: "react-email-editor",
      html: "<h1>Thanks for connecting</h1><p>Hello {{firstName}}</p>",
      previewText: "A quick note",
      subject: "Thanks",
      text: "Thanks for connecting\n\nHello {{firstName}}",
    },
    templateKey: "joining-never-given",
    templateVersion: 1,
    updatedAt: new Date("2026-07-02T00:00:00.000Z"),
  } as CommunicationAutomationRecord,
  automations: [] as CommunicationAutomationRecord[],
  getAutomation: vi.fn(),
  getAutomationRun: vi.fn(),
  getLifecycleAction: vi.fn(),
  listReviewerOptions: vi.fn(),
  listAutomations: vi.fn(),
  listPeopleByRockIds: vi.fn(),
  listSavedListViews: vi.fn(),
  navSpy: vi.fn(() => <nav aria-label="Primary">Top nav</nav>),
  redirect: vi.fn(),
  segments: [
    {
      archivedAt: null,
      columnDefinition: { columns: [] },
      createdAt: new Date("2026-07-01T00:00:00.000Z"),
      density: "COMFORTABLE",
      description: null,
      filterDefinition: { kind: "group", logic: "AND", rules: [] },
      id: "view_1",
      isDefault: false,
      name: "New believers",
      pageSize: 50,
      resource: "PEOPLE",
      sortDefinition: { direction: "ASC", field: "rockId" },
      updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    },
  ] as SavedListViewRecord[],
  reviewerOptions: [
    {
      id: "user_1",
      label: "Admin",
    },
    {
      id: "user_2",
      label: "Care",
    },
  ],
  recipientPeopleConnection: {
    appliedView: {
      id: null,
      name: "Selected people",
      pageSize: 1,
    },
    edges: [
      {
        cursor: "person_123",
        node: {
          amountsHidden: false,
          connectionStatus: "Member",
          deceased: false,
          displayName: "Jane Joining",
          email: "jane@example.com",
          emailActive: true,
          givingPresence: [],
          givingSummary: {
            accountSummaries: [],
            firstGiftAt: new Date("2025-07-01T00:00:00.000Z"),
            lastGiftAmount: "50.00",
            lastGiftAt: new Date("2026-06-01T00:00:00.000Z"),
            lastTwelveMonthsTotal: "300.00",
            monthlyGiving: [
              "0.00",
              "25.00",
              "50.00",
              "25.00",
              "50.00",
              "25.00",
              "50.00",
              "25.00",
              "50.00",
              "25.00",
              "50.00",
              "25.00",
            ].map((totalGiven, index) => ({
              giftCount: totalGiven === "0.00" ? 0 : 1,
              month: new Date(Date.UTC(2025, 6 + index, 1))
                .toISOString()
                .slice(0, 7),
              previousGiftCount: 0,
              previousMonth: new Date(Date.UTC(2024, 6 + index, 1))
                .toISOString()
                .slice(0, 7),
              previousTotalGiven: "0.00",
              totalGiven,
            })),
            monthsWithGiving: 11,
            reliabilityKinds: ["ONE_OFF"],
            sourceExplanation:
              "Derived from local GivingFact rows synced from Rock.",
            totalGiven: "300.00",
          },
          lastGiftMonth: "Jun 2026",
          lastSyncedAt: new Date("2026-07-08T00:00:00.000Z"),
          lifecycle: [
            {
              lifecycle: "NEW",
              summary: "Recent first gift.",
              windowEndedAt: new Date("2026-07-08T00:00:00.000Z"),
            },
          ],
          openTaskCount: 0,
          pledgeSummary: null,
          photoUrl: null,
          primaryCampus: { name: "Central", rockId: 1, shortCode: "CEN" },
          primaryHousehold: null,
          recordStatus: "Active",
          rockId: 123,
        },
      },
    ],
    pageInfo: {
      endCursor: null,
      hasNextPage: false,
    },
    resultCount: {
      filtered: 1,
      total: 1,
    },
  } as PeopleConnection,
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: mocks.redirect,
}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: vi.fn(async () => null),
  },
}));

vi.mock("@/lib/auth/access-control", () => ({
  getCurrentAccessState: vi.fn(async () => mocks.accessState),
}));

vi.mock("@/lib/communications/automations", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/communications/automations")>();

  return {
    ...actual,
    getCommunicationAutomation: mocks.getAutomation,
    getCommunicationAutomationRun: mocks.getAutomationRun,
    getCommunicationAutomationLifecycleAction: mocks.getLifecycleAction,
    listCommunicationAutomationReviewerOptions: mocks.listReviewerOptions,
    listCommunicationAutomations: mocks.listAutomations,
  };
});

vi.mock("@/lib/list-views/saved-views", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/list-views/saved-views")>();

  return {
    ...actual,
    listSavedListViews: mocks.listSavedListViews,
  };
});

vi.mock("@/lib/list-views/people-list", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/list-views/people-list")>();

  return {
    ...actual,
    listPeopleByRockIds: mocks.listPeopleByRockIds,
  };
});

vi.mock("@/components/navigation/app-top-nav", () => ({
  AppTopNav: mocks.navSpy,
}));

vi.mock("@react-email/editor", () => ({
  EmailEditor: ({ placeholder }: { placeholder?: string }) => (
    <div aria-label="Email body" role="textbox">
      {placeholder ?? "Write the email..."}
    </div>
  ),
}));

import CommunicationAutomationDetailPage from "@/app/communications/[id]/page";
import EditCommunicationAutomationPage from "@/app/communications/[id]/edit/page";
import CommunicationAutomationRecipientPreviewPage from "@/app/communications/[id]/runs/[runId]/recipients/[recipientId]/preview/page";
import CommunicationAutomationRunPage from "@/app/communications/[id]/runs/[runId]/page";
import NewCommunicationAutomationPage from "@/app/communications/new/page";
import CommunicationAutomationsPage from "@/app/communications/page";

describe("Communication workflow pages", () => {
  beforeEach(() => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|admin",
        email: "admin@example.com",
        id: "user_1",
        name: "Admin",
        rockPersonId: null,
        role: "ADMIN",
      },
    };
    mocks.automations = [mocks.automation];
    mocks.getAutomation.mockResolvedValue(mocks.automation);
    mocks.getAutomationRun.mockResolvedValue(null);
    mocks.getLifecycleAction.mockResolvedValue({
      action: "archive",
      hasRuns: true,
      hasSentEmails: true,
    });
    mocks.listAutomations.mockImplementation(async () => mocks.automations);
    mocks.listReviewerOptions.mockImplementation(
      async () => mocks.reviewerOptions,
    );
    mocks.listPeopleByRockIds.mockImplementation(
      async () => mocks.recipientPeopleConnection,
    );
    mocks.listSavedListViews.mockImplementation(async () => mocks.segments);
    mocks.navSpy.mockClear();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("renders configured workflows with a create link", async () => {
    render(await CommunicationAutomationsPage());

    expect(
      screen.getByRole("heading", { name: "Communications" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Joining never-given follow-up" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", {
        name: "Workflow actions for Joining never-given follow-up",
      }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("heading", { name: "New automation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Create workflow" }),
    ).toHaveAttribute("href", "/communications/new");
    expect(
      screen.getAllByRole("link", {
        name: "Joining never-given follow-up",
      }),
    ).toHaveLength(2);
  });

  it("renders segment setup on the create page", async () => {
    render(await NewCommunicationAutomationPage());

    expect(
      screen.getByRole("link", { name: "Create Workflow" }),
    ).toHaveAttribute("href", "/communications");
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText(/Preview/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Shown by email clients as the short snippet beside the subject.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Text")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Template editor" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Email body" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Run review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Readiness" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Abound Giving")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Draft the email, choose the People segment/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Segment" })).toHaveTextContent(
      "New believers",
    );
    expect(screen.getByRole("checkbox", { name: "Admin" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Care" })).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Repeat sending" }),
    ).toHaveTextContent("Send once per person");
    expect(screen.queryByLabelText("Timezone")).not.toBeInTheDocument();
    expect(screen.getByText("Tuesday at 9:00 AM")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders setup and scheduled runs on the detail page", async () => {
    mocks.getAutomation.mockResolvedValueOnce({
      ...mocks.automation,
      runs: [
        mocks.automation.runs[0],
        {
          ...mocks.automation.runs[0],
          acceptedCount: 0,
          deliverableCount: 0,
          excludedCount: 2,
          failedCount: 0,
          id: "run_canceled",
          recipientCount: 2,
          scheduledSendAt: new Date("2026-07-09T21:00:00.000Z"),
          status: "CANCELED",
        },
        {
          ...mocks.automation.runs[0],
          id: "run_ready",
          scheduledSendAt: new Date("2026-07-10T21:00:00.000Z"),
          status: "READY_TO_SEND",
        },
        {
          ...mocks.automation.runs[0],
          acceptedCount: 2,
          completedAt: new Date("2026-07-11T21:10:00.000Z"),
          deliverableCount: 2,
          events: [
            {
              automationId: "automation_1",
              createdAt: new Date("2026-07-11T21:11:00.000Z"),
              eventType: "OPENED",
              id: "event_opened_1",
              metadata: null,
              occurredAt: new Date("2026-07-11T21:11:00.000Z"),
              providerEventId: "email.opened:email_1",
              providerMessageId: "email_1",
              recipientId: "recipient_1",
              runId: "run_sent",
              summary: "Resend email.opened event.",
            },
          ],
          failedCount: 0,
          id: "run_sent",
          scheduledSendAt: new Date("2026-07-11T21:00:00.000Z"),
          status: "SENT",
        },
      ],
    });

    render(
      await CommunicationAutomationDetailPage({
        params: Promise.resolve({ id: "automation_1" }),
        searchParams: Promise.resolve({ run: "empty" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Joining never-given follow-up" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Repeat sending")).toBeInTheDocument();
    expect(screen.getByText("Send once per person")).toBeInTheDocument();
    expect(screen.getByText("Reviewers")).toBeInTheDocument();
    expect(screen.getByText("Admin, Care")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Scheduled runs" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no run was created because there are no eligible/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /no run was created because there are no eligible/i,
    );
    expect(
      screen
        .getAllByRole("link", { name: "Review recipients" })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/communications/automation_1/runs/run_1",
        ),
    ).toBe(true);
    expect(screen.getByRole("button", { name: "Schedule" })).toBeDisabled();
    expect(
      screen.getByText(/already an active scheduled run/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Discard run" }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("link", { name: "Review recipients" }).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Discard run" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Discard scheduled run?")).toBeInTheDocument();
    expect(
      screen.getByText(/permanently excluded will stay excluded/i),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByText("Discard scheduled run?"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Run" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(/ready to send/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Discarded").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 ready, 1 excluded").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("More (3 runs)")).toBeInTheDocument();
    expect(
      screen.getAllByText("Sent, 2 sent, 1 opened").length,
    ).toBeGreaterThan(0);
    expect(
      screen
        .getAllByRole("link", { name: "View recipients" })
        .some(
          (link) =>
            link.getAttribute("href") ===
            "/communications/automation_1/runs/run_sent",
        ),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Archive communication?")).toBeInTheDocument();
    expect(
      screen.getByText(/stops this workflow from sending again/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Email" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Thanks")).not.toBeInTheDocument();
    expect(screen.queryByText("A quick note")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Subject")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Preview/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Text")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("textbox", { name: "Email body" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Abound Giving")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Run review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Readiness" }),
    ).not.toBeInTheDocument();
  });

  it("shows a send-ready notice on the workflow detail page", async () => {
    mocks.getAutomation.mockResolvedValueOnce({
      ...mocks.automation,
      runs: [
        {
          ...mocks.automation.runs[0],
          id: "run_ready",
          scheduledSendAt: new Date("2026-07-10T21:00:00.000Z"),
          status: "READY_TO_SEND",
        },
      ],
    });

    render(
      await CommunicationAutomationDetailPage({
        params: Promise.resolve({ id: "automation_1" }),
        searchParams: Promise.resolve({
          runId: "run_ready",
          send: "ready",
        }),
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "This run is ready to send now.",
    );
  });

  it("renders the template editor on the edit page", async () => {
    render(
      await EditCommunicationAutomationPage({
        params: Promise.resolve({ id: "automation_1" }),
      }),
    );

    expect(screen.getByRole("link", { name: "Edit Workflow" })).toHaveAttribute(
      "href",
      "/communications/automation_1",
    );
    expect(screen.getByLabelText("Subject")).toBeInTheDocument();
    expect(screen.getByLabelText(/Preview/)).toBeInTheDocument();
    expect(screen.getByLabelText("Workflow name")).toHaveValue(
      "Joining never-given follow-up",
    );
    expect(screen.getByRole("button", { name: "Segment" })).toHaveTextContent(
      "New believers",
    );
    expect(screen.getByRole("checkbox", { name: "Admin" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Care" })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Repeat sending" }),
    ).toHaveTextContent("Send once per person");
    expect(screen.getByLabelText(/Schedule/)).toHaveValue("0 9 * * 2");
    expect(screen.getByText("Tuesday at 9:00 AM")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Email body" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("renders the pending run review page", async () => {
    mocks.getAutomation.mockResolvedValueOnce({
      ...mocks.automation,
      runs: [
        {
          ...mocks.automation.runs[0],
          recipients: [
            {
              acceptedAt: null,
              automationId: "automation_1",
              contactState: "Email-ready",
              createdAt: new Date("2026-07-08T00:00:00.000Z"),
              deliveredAt: null,
              displayNameSnapshot: "Jane Joining",
              emailSnapshot: "jane@example.com",
              excludedAt: null,
              excludedByUserId: null,
              exclusionReason: null,
              failedAt: null,
              householdRockId: null,
              id: "recipient_1",
              personRockId: 123,
              providerMessageId: null,
              recipientKey: "person:123",
              resource: "PERSON",
              runId: "run_1",
              skipReason: null,
              status: "READY",
              updatedAt: new Date("2026-07-08T00:00:00.000Z"),
            },
          ],
        },
      ],
    });

    render(
      await CommunicationAutomationRunPage({
        params: Promise.resolve({ id: "automation_1", runId: "run_1" }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "9 Jul 2026, 9:00 am",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Joining never-given follow-up · Ready for review"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Joining never-given follow-up" }),
    ).toHaveAttribute("href", "/communications/automation_1");
    expect(
      screen.getByRole("heading", { name: "Recipients" }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Jane Joining" })
        .every((link) => link.getAttribute("href") === "/people/123"),
    ).toBe(true);
    expect(
      screen.getAllByText("Central · Member · jane@example.com").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(
      screen.getByRole("img", {
        name: "Giving trend over the last 12 months",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Send").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Don't send recipient" })[0],
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen
        .getAllByRole("link", { name: "Preview email" })
        .every(
          (link) =>
            link.getAttribute("href") ===
              "/communications/automation_1/runs/run_1/recipients/recipient_1/preview" &&
            link.getAttribute("target") === "_blank",
        ),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Ready to Send" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Discard run" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Exclude" })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Exclude recipient?")).toBeInTheDocument();
    expect(screen.getByText(/future schedules/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Exclude recipient?")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Complete review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reject schedule" }),
    ).not.toBeInTheDocument();
    expect(mocks.listPeopleByRockIds).toHaveBeenCalledWith(
      { rockIds: [123] },
      expect.objectContaining({ id: "user_1" }),
    );
    expect(screen.queryByText("Email-ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Status")).not.toBeInTheDocument();
    expect(screen.queryByText("Contact")).not.toBeInTheDocument();
    expect(screen.queryByText("Note")).not.toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("loads a requested run that is outside the workflow summary", async () => {
    const directRun = {
      ...mocks.automation.runs[0],
      id: "run_outside_summary",
      recipients: [
        {
          acceptedAt: null,
          automationId: "automation_1",
          contactState: "Email-ready",
          createdAt: new Date("2026-07-08T00:00:00.000Z"),
          deliveredAt: null,
          displayNameSnapshot: "Jane Joining",
          emailSnapshot: "jane@example.com",
          excludedAt: null,
          excludedByUserId: null,
          exclusionReason: null,
          failedAt: null,
          householdRockId: null,
          id: "recipient_1",
          personRockId: 123,
          providerMessageId: null,
          recipientKey: "person:123",
          resource: "PERSON",
          runId: "run_outside_summary",
          skipReason: null,
          status: "READY",
          updatedAt: new Date("2026-07-08T00:00:00.000Z"),
        },
      ],
    };
    mocks.getAutomation.mockResolvedValueOnce({
      ...mocks.automation,
      runs: [],
    });
    mocks.getAutomationRun.mockResolvedValueOnce(directRun);

    render(
      await CommunicationAutomationRunPage({
        params: Promise.resolve({
          id: "automation_1",
          runId: "run_outside_summary",
        }),
      }),
    );

    expect(mocks.getAutomationRun).toHaveBeenCalledWith(
      "automation_1",
      "run_outside_summary",
      expect.objectContaining({ id: "user_1" }),
    );
    expect(
      screen.queryByText("This communication does not have that scheduled run"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "9 Jul 2026, 9:00 am" }),
    ).toBeInTheDocument();
  });

  it("renders a ready scheduled run without reopening review", async () => {
    mocks.getAutomation.mockResolvedValueOnce({
      ...mocks.automation,
      runs: [
        {
          ...mocks.automation.runs[0],
          id: "run_ready",
          recipients: [
            {
              acceptedAt: null,
              automationId: "automation_1",
              contactState: "Email-ready",
              createdAt: new Date("2026-07-08T00:00:00.000Z"),
              deliveredAt: null,
              displayNameSnapshot: "Jane Joining",
              emailSnapshot: "jane@example.com",
              excludedAt: null,
              excludedByUserId: null,
              exclusionReason: null,
              failedAt: null,
              householdRockId: null,
              id: "recipient_1",
              personRockId: 123,
              providerMessageId: null,
              recipientKey: "person:123",
              resource: "PERSON",
              runId: "run_ready",
              skipReason: null,
              status: "READY",
              updatedAt: new Date("2026-07-08T00:00:00.000Z"),
            },
          ],
          status: "READY_TO_SEND",
        },
      ],
    });

    render(
      await CommunicationAutomationRunPage({
        params: Promise.resolve({ id: "automation_1", runId: "run_ready" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "9 Jul 2026, 9:00 am" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Joining never-given follow-up · Ready To Send"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send back to review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send now" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Discard run" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ready to Send" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Complete review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reject schedule" }),
    ).not.toBeInTheDocument();
  });

  it("renders a sent scheduled run as read-only recipients", async () => {
    mocks.getAutomation.mockResolvedValueOnce({
      ...mocks.automation,
      runs: [
        {
          ...mocks.automation.runs[0],
          acceptedCount: 1,
          completedAt: new Date("2026-07-08T22:00:00.000Z"),
          events: [
            {
              automationId: "automation_1",
              createdAt: new Date("2026-07-08T21:06:00.000Z"),
              eventType: "OPENED",
              id: "event_opened_1",
              metadata: null,
              occurredAt: new Date("2026-07-08T21:06:00.000Z"),
              providerEventId: "email.opened:maildev_123",
              providerMessageId: "maildev_123",
              recipientId: "recipient_1",
              runId: "run_sent",
              summary: "Resend email.opened event.",
            },
          ],
          id: "run_sent",
          recipients: [
            {
              acceptedAt: new Date("2026-07-08T21:05:00.000Z"),
              automationId: "automation_1",
              contactState: "Email-ready",
              createdAt: new Date("2026-07-08T00:00:00.000Z"),
              deliveredAt: null,
              displayNameSnapshot: "Jane Joining",
              emailSnapshot: "jane@example.com",
              excludedAt: null,
              excludedByUserId: null,
              exclusionReason: null,
              failedAt: null,
              householdRockId: null,
              id: "recipient_1",
              personRockId: 123,
              providerMessageId: "maildev_123",
              recipientKey: "person:123",
              resource: "PERSON",
              runId: "run_sent",
              skipReason: null,
              status: "ACCEPTED",
              updatedAt: new Date("2026-07-08T22:00:00.000Z"),
            },
          ],
          status: "SENT",
        },
      ],
    });

    render(
      await CommunicationAutomationRunPage({
        params: Promise.resolve({ id: "automation_1", runId: "run_sent" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "9 Jul 2026, 9:00 am" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Joining never-given follow-up · Sent"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Recipients" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Delivery" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Opened")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("link", { name: "Jane Joining" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send now" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Send back to review" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ready to Send" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("This communication does not have that scheduled run"),
    ).not.toBeInTheDocument();
  });

  it("renders a real recipient email preview", async () => {
    mocks.getAutomation.mockResolvedValueOnce({
      ...mocks.automation,
      runs: [
        {
          ...mocks.automation.runs[0],
          recipients: [
            {
              acceptedAt: null,
              automationId: "automation_1",
              contactState: "Email-ready",
              createdAt: new Date("2026-07-08T00:00:00.000Z"),
              deliveredAt: null,
              displayNameSnapshot: "Jane Joining",
              emailSnapshot: "jane@example.com",
              excludedAt: null,
              excludedByUserId: null,
              exclusionReason: null,
              failedAt: null,
              householdRockId: null,
              id: "recipient_1",
              personRockId: 123,
              providerMessageId: null,
              recipientKey: "person:123",
              resource: "PERSON",
              runId: "run_1",
              skipReason: null,
              status: "READY",
              updatedAt: new Date("2026-07-08T00:00:00.000Z"),
            },
          ],
        },
      ],
    });

    render(
      await CommunicationAutomationRecipientPreviewPage({
        params: Promise.resolve({
          id: "automation_1",
          recipientId: "recipient_1",
          runId: "run_1",
        }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Email preview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("From")).toBeInTheDocument();
    expect(screen.getByText("Exec Team <exec@ev.church>")).toBeInTheDocument();
    expect(
      screen.getByText("Jane Joining <jane@example.com>"),
    ).toBeInTheDocument();
    expect(screen.getByText("Subject")).toBeInTheDocument();
    expect(screen.getByText("Thanks")).toBeInTheDocument();
    expect(screen.getByText("A quick note")).toBeInTheDocument();
    expect(screen.getByTitle("Rendered email body")).toHaveAttribute(
      "srcdoc",
      expect.stringContaining("Hello Jane"),
    );
  });
});
