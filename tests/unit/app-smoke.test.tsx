import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  accessState: { status: "anonymous" } as AccessState,
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
  });

  it("renders the sign-in entry point for anonymous users", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", {
        name: "Staff tools for clear, careful giving work.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
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
