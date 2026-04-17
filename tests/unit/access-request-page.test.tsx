import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessState } from "@/lib/auth/types";

const mocks = vi.hoisted(() => ({
  accessState: { status: "needs_access" } as AccessState,
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

vi.mock("@/components/auth/access-request-form", () => ({
  AccessRequestForm: ({ email }: { email?: string | null }) => (
    <div>
      <span>Mock access request form</span>
      {email ? <span>{email}</span> : null}
    </div>
  ),
}));

import AccessRequestPage from "@/app/access-request/page";
import AccessRequestSubmittedPage from "@/app/access-request/submitted/page";

describe("AccessRequestPage", () => {
  beforeEach(() => {
    mocks.accessState = {
      status: "needs_access",
      identity: {
        sub: "auth0|pending",
        email: "pending@example.com",
        name: "Pending User",
        picture: null,
      },
    };
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to Auth0 login", async () => {
    mocks.accessState = { status: "anonymous" };

    await expect(AccessRequestPage()).rejects.toThrow(
      "NEXT_REDIRECT:/auth/login",
    );
  });

  it("redirects authorized local users home", async () => {
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

    await expect(AccessRequestPage()).rejects.toThrow("NEXT_REDIRECT:/");
  });

  it("renders the request form only for authenticated users without local access", async () => {
    render(await AccessRequestPage());

    expect(
      screen.getByRole("heading", {
        name: "Ask an administrator to enable your account.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mock access request form")).toBeInTheDocument();
    expect(screen.getByText("pending@example.com")).toBeInTheDocument();
  });
});

describe("AccessRequestSubmittedPage", () => {
  beforeEach(() => {
    mocks.accessState = {
      status: "needs_access",
      identity: {
        sub: "auth0|pending",
        email: "pending@example.com",
        name: "Pending User",
        picture: null,
      },
    };
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    });
  });

  it("redirects anonymous users to Auth0 login", async () => {
    mocks.accessState = { status: "anonymous" };

    await expect(AccessRequestSubmittedPage()).rejects.toThrow(
      "NEXT_REDIRECT:/auth/login",
    );
  });

  it("uses neutral submitted copy for authenticated users without local access", async () => {
    render(await AccessRequestSubmittedPage());

    expect(
      screen.getByRole("heading", {
        name: "Your access request is ready for administrator review.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/If you just submitted the form/),
    ).toBeInTheDocument();
  });
});
