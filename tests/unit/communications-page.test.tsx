import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { CommunicationAutomationRecord } from "@/lib/communications/automations";
import type { SavedListViewRecord } from "@/lib/list-views/saved-views";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  automation: {
    audienceResource: "PEOPLE",
    activatedAt: null,
    activatedByUserId: null,
    archivedAt: null,
    completionReportRecipients: [],
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
    reviewers: [],
    runs: [],
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
      body: "Hello {{firstName}}",
      ctaLabel: "Learn about giving",
      ctaUrl: "https://example.org/give",
      heading: "Thanks for connecting",
      previewText: "A quick note",
      signature: "The Team",
      subject: "Thanks",
    },
    templateKey: "joining-never-given",
    templateVersion: 1,
    updatedAt: new Date("2026-07-02T00:00:00.000Z"),
  } as CommunicationAutomationRecord,
  automations: [] as CommunicationAutomationRecord[],
  getAutomation: vi.fn(),
  getLifecycleAction: vi.fn(),
  listAutomations: vi.fn(),
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
    getCommunicationAutomationLifecycleAction: mocks.getLifecycleAction,
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
import CommunicationsPage from "@/app/communications/page";

describe("Communications pages", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.automations = [mocks.automation];
    mocks.getAutomation.mockResolvedValue(mocks.automation);
    mocks.getLifecycleAction.mockResolvedValue({
      action: "archive",
      hasRuns: false,
      hasSentEmails: true,
    });
    mocks.listAutomations.mockImplementation(async () => mocks.automations);
    mocks.listSavedListViews.mockImplementation(async () => mocks.segments);
    mocks.navSpy.mockClear();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("shows workflows on the communications index", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|admin",
        email: "admin@example.com",
        id: "user_1",
        name: "Admin",
        rockPersonId: null,
      },
    };

    render(await CommunicationsPage());

    expect(
      screen.getByRole("heading", { name: "Communications" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Tools")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Joining never-given follow-up" }),
    ).toHaveLength(2);
    expect(
      screen.queryByRole("link", { name: "Back to communications" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Scheduled workflows owned by this app"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("1 loaded")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Saved view: Joining - Never Given"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Tuesday at 9:00 AM")).toHaveLength(2);
    expect(screen.queryByText("0 9 * * 2")).not.toBeInTheDocument();
    fireEvent.click(
      screen.getAllByRole("button", {
        name: "Workflow actions for Joining never-given follow-up",
      })[0],
    );
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute(
      "href",
      "/communications/automation_1",
    );
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/communications/automation_1/edit",
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toHaveClass("min-w-[960px]");
    expect(mocks.navSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        active: "communications",
        canManageSettings: true,
        canManageTools: true,
      }),
      undefined,
    );
  });

  it("exposes settings and pledge tools on the detail page", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|care",
        email: "care@example.com",
        id: "user_3",
        name: "Care",
        rockPersonId: null,
      },
    };

    render(
      await CommunicationAutomationDetailPage({
        params: Promise.resolve({ id: "automation_1" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Joining never-given follow-up" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Communications" }),
    ).toHaveAttribute("href", "/communications");
    expect(
      screen.queryByRole("link", { name: "Back to communications" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Scheduled runs" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Latest scheduled workflow runs"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Saved view: Joining - Never Given"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Joining - Never Given")).toBeInTheDocument();
    expect(screen.getByText("Tuesday at 9:00 AM")).toBeInTheDocument();
    expect(screen.queryByText("Cron")).not.toBeInTheDocument();
    expect(mocks.navSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        active: "communications",
        canManageSettings: true,
        canManageTools: true,
      }),
      undefined,
    );
  });
});
