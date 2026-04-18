import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
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

import HomePage from "@/app/page";

describe("HomePage", () => {
  beforeEach(() => {
    mocks.accessState = { status: "anonymous" };
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to the Auth0 login handler", async () => {
    await expect(HomePage()).rejects.toThrow("NEXT_REDIRECT:/auth/login");
  });

  it("renders the access request entry point for authenticated users without a local profile", async () => {
    mocks.accessState = {
      status: "needs_access",
      identity: {
        sub: "auth0|pending",
        email: "pending@example.com",
        name: "Pending User",
        picture: null,
      },
    };

    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        name: "You need administrator approval to continue.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Request access" }),
    ).toHaveAttribute("href", "/access-request");
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
  });

  it("renders authorized local users without access request or sign-in links", async () => {
    mocks.accessState = {
      status: "authorized",
      user: {
        id: "user_1",
        auth0Subject: "auth0|admin",
        email: "admin@example.com",
        name: "Admin",
        role: "ADMIN",
        active: true,
        rockPersonId: null,
      },
    };

    render(await HomePage());

    expect(
      screen.getByRole("heading", { name: "Welcome back." }),
    ).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Request access" }),
    ).not.toBeInTheDocument();
  });
});
