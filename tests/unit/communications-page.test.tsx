import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";
import type { CommunicationPrepRecord } from "@/lib/communications/prep";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  navSpy: vi.fn(() => <nav aria-label="Primary">Top nav</nav>),
  prep: {
    approvedAt: null,
    audiencePreview: [],
    audienceResource: "PEOPLE",
    audienceSize: 2,
    audienceTruncated: false,
    canceledAt: null,
    createdAt: new Date("2026-04-20T00:00:00.000Z"),
    createdByUserId: "user_1",
    handoffTarget: null,
    handedOffAt: null,
    id: "prep_1",
    personRockId: null,
    householdRockId: null,
    readyForReviewAt: null,
    reviewNotes: null,
    savedListViewId: null,
    segmentDefinition: {},
    segmentSummary: "Adult givers at risk",
    status: "DRAFT",
    title: "Spring follow-up",
    updatedAt: new Date("2026-04-21T00:00:00.000Z"),
  } satisfies CommunicationPrepRecord,
  preps: [] as CommunicationPrepRecord[],
  redirect: vi.fn(),
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

vi.mock("@/lib/communications/prep", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/communications/prep")>();

  return {
    ...actual,
    audiencePreviewFromRecord: vi.fn(() => []),
    getCommunicationPrep: vi.fn(async () => mocks.prep),
    listCommunicationPreps: vi.fn(async () => mocks.preps),
  };
});

vi.mock("@/components/navigation/app-top-nav", () => ({
  AppTopNav: mocks.navSpy,
}));

import CommunicationPrepDetailPage from "@/app/communications/[id]/page";
import CommunicationsPage from "@/app/communications/page";

describe("Communications pages", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.preps = [];
    mocks.navSpy.mockClear();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("passes settings visibility for admin users on the communications index", async () => {
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

    render(await CommunicationsPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "Communications" }),
    ).toBeInTheDocument();
    expect(mocks.navSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        active: "communications",
        canManageSettings: true,
        canManageTools: true,
      }),
      undefined,
    );
  });

  it("does not expose settings or pledge tools for pastoral care on the detail page", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        active: true,
        auth0Subject: "auth0|care",
        email: "care@example.com",
        id: "user_3",
        name: "Care",
        rockPersonId: null,
        role: "PASTORAL_CARE",
      },
    };

    render(
      await CommunicationPrepDetailPage({
        params: Promise.resolve({ id: "prep_1" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Spring follow-up" }),
    ).toBeInTheDocument();
    expect(mocks.navSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        active: "communications",
        canManageSettings: false,
        canManageTools: false,
      }),
      undefined,
    );
  });
});
