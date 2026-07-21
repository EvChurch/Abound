import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  resolveCommunicationAudience: vi.fn(),
}));

vi.mock("@/lib/communications/segments", () => ({
  resolveCommunicationAudience: mocks.resolveCommunicationAudience,
}));

import {
  clampPrepLimit,
  createCommunicationPrep,
  updateCommunicationPrep,
} from "@/lib/communications/prep";

const adminUser: LocalAppUser = {
  id: "user_1",
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  name: "Admin",
  active: true,
  rockPersonId: null,
};

const secondAdminUser: LocalAppUser = {
  ...adminUser,
  id: "user_2",
};

const otherAdminUser: LocalAppUser = {
  ...adminUser,
  id: "user_3",
};

describe("communication prep service", () => {
  it("creates a role-safe local prep record from an audience", async () => {
    mocks.resolveCommunicationAudience.mockResolvedValueOnce({
      audienceSize: 2,
      audienceTruncated: false,
      preview: [
        {
          campusName: "North",
          contactReady: true,
          contactState: "Email-ready",
          displayName: "Jane Donor",
          email: "jane@example.com",
          explanation: "Matches this audience's criteria.",
          householdName: "Donor Household",
          resource: "PERSON",
          rockId: 910001,
        },
      ],
      resource: "PEOPLE",
      savedViewId: "view_1",
      segmentDefinition: { conditions: [], mode: "all", type: "group" },
      segmentSummary: "Saved view: At-risk givers",
    });

    const create = vi.fn(async ({ data }) => ({
      id: "prep_1",
      status: "DRAFT",
      createdAt: new Date("2026-04-20T10:00:00.000Z"),
      updatedAt: new Date("2026-04-20T10:00:00.000Z"),
      approvedAt: null,
      canceledAt: null,
      handedOffAt: null,
      readyForReviewAt: null,
      ...data,
    }));
    const client = {
      communicationPrep: { create },
      rockHousehold: { findUnique: vi.fn(async () => null) },
      rockPerson: { findUnique: vi.fn(async () => null) },
    } as unknown as PrismaClient;

    await expect(
      createCommunicationPrep(
        {
          resource: "PEOPLE",
          savedViewId: "view_1",
          title: "  At-risk giver encouragement  ",
        },
        secondAdminUser,
        client,
      ),
    ).resolves.toMatchObject({
      audienceSize: 2,
      createdByUserId: "user_2",
      savedListViewId: "view_1",
      title: "At-risk giver encouragement",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        audiencePreview: expect.arrayContaining([
          expect.objectContaining({
            explanation: "Matches this audience's criteria.",
          }),
        ]),
        handoffTarget: null,
        segmentSummary: "Saved view: At-risk givers",
      }),
    });
  });

  it("allows another admin user to manage communication prep", async () => {
    mocks.resolveCommunicationAudience.mockResolvedValueOnce({
      audienceSize: 0,
      audienceTruncated: false,
      preview: [],
      resource: "HOUSEHOLDS",
      savedViewId: null,
      segmentDefinition: { conditions: [], mode: "all", type: "group" },
      segmentSummary: "Manual audience",
    });
    const client = {
      communicationPrep: {
        create: vi.fn(async ({ data }) => ({
          ...data,
          createdAt: new Date("2026-04-20T10:00:00.000Z"),
          id: "prep_2",
          status: "DRAFT",
          updatedAt: new Date("2026-04-20T10:00:00.000Z"),
        })),
      },
      rockHousehold: { findUnique: vi.fn(async () => null) },
      rockPerson: { findUnique: vi.fn(async () => null) },
    } as unknown as PrismaClient;

    await expect(
      createCommunicationPrep(
        {
          resource: "HOUSEHOLDS",
          title: "Admin comms",
        },
        otherAdminUser,
        client,
      ),
    ).resolves.toMatchObject({
      createdByUserId: "user_3",
      id: "prep_2",
      title: "Admin comms",
    });
  });

  it("stamps workflow timestamps when status changes", async () => {
    const update = vi.fn(async ({ data, where }) => ({
      id: where.id,
      title: "Review",
      status: data.status,
      readyForReviewAt: data.readyForReviewAt,
      approvedAt: data.approvedAt ?? null,
      canceledAt: data.canceledAt ?? null,
      handedOffAt: data.handedOffAt ?? null,
    }));
    const client = {
      communicationPrep: {
        findUnique: vi.fn(async () => ({ id: "prep_1" })),
        update,
      },
    } as unknown as PrismaClient;

    await expect(
      updateCommunicationPrep(
        {
          id: "prep_1",
          status: "READY_FOR_REVIEW",
        },
        adminUser,
        client,
      ),
    ).resolves.toMatchObject({
      readyForReviewAt: expect.any(Date),
      status: "READY_FOR_REVIEW",
    });
  });

  it("clamps communication prep list limits", () => {
    expect(clampPrepLimit(null)).toBe(20);
    expect(clampPrepLimit(0)).toBe(20);
    expect(clampPrepLimit(500)).toBe(50);
    expect(clampPrepLimit(12.8)).toBe(12);
  });
});
