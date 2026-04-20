import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocalAppUser } from "@/lib/auth/types";
import { GET } from "@/app/api/rock/person-photo/[photoId]/route";

const adminUser: LocalAppUser = {
  active: true,
  auth0Subject: "auth0|admin",
  email: "admin@example.com",
  id: "user_1",
  name: "Admin",
  rockPersonId: null,
  role: "ADMIN",
};

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  findFirst: vi.fn(),
  getCurrentAccessState: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: mocks.getSession,
  },
}));

vi.mock("@/lib/auth/access-control", () => ({
  getCurrentAccessState: mocks.getCurrentAccessState,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    rockPerson: {
      findFirst: mocks.findFirst,
    },
  },
}));

describe("Rock person photo route", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mocks.fetch);
    vi.stubEnv("ROCK_BASE_URL", "https://rock.example.test");
    vi.stubEnv("ROCK_REST_KEY", "rest_key");
    mocks.fetch.mockReset();
    mocks.findFirst.mockReset();
    mocks.getCurrentAccessState.mockReset();
    mocks.getSession.mockReset();
    mocks.getSession.mockResolvedValue({ user: { sub: "auth0|admin" } });
  });

  it("requires an authenticated local app user", async () => {
    mocks.getCurrentAccessState.mockResolvedValue({ status: "anonymous" });

    const response = await GET(new Request("https://app.test/photo"), {
      params: Promise.resolve({ photoId: "12345" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("does not fetch unlinked Rock photo ids", async () => {
    mocks.getCurrentAccessState.mockResolvedValue({
      status: "authorized",
      user: adminUser,
    });
    mocks.findFirst.mockResolvedValue(null);

    const response = await GET(new Request("https://app.test/photo"), {
      params: Promise.resolve({ photoId: "12345" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("proxies linked Rock photos without exposing the REST key", async () => {
    mocks.getCurrentAccessState.mockResolvedValue({
      status: "authorized",
      user: adminUser,
    });
    mocks.findFirst.mockResolvedValue({ rockId: 910001 });
    mocks.fetch.mockResolvedValue(
      new Response("image-bytes", {
        headers: {
          "Content-Type": "image/png",
        },
        status: 200,
      }),
    );

    const response = await GET(new Request("https://app.test/photo"), {
      params: Promise.resolve({ photoId: "12345" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(await response.text()).toBe("image-bytes");
    expect(mocks.fetch).toHaveBeenCalledWith(
      new URL("https://rock.example.test/GetImage.ashx?id=12345"),
      {
        headers: {
          Accept: "image/*",
          "Authorization-Token": "rest_key",
        },
        method: "GET",
      },
    );
  });
});
