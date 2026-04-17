import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/auth0", () => ({
  auth0: {
    getSession: vi.fn(async () => null),
  },
}));

vi.mock("@/lib/auth/access-control", () => ({
  getCurrentAccessState: vi.fn(async () => ({ status: "anonymous" })),
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
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
});
