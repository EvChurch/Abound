import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AuthErrorPage from "@/app/auth/error/page";

describe("AuthErrorPage", () => {
  it("renders a safe stale-state explanation without raw callback details", async () => {
    render(
      await AuthErrorPage({
        searchParams: Promise.resolve({ reason: "InvalidStateError" }),
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: "Sign in could not be completed.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The login session expired or does not match this browser session.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Try again with Auth0" }),
    ).toHaveAttribute("href", "/auth/login");
    expect(screen.queryByText(/code=/i)).not.toBeInTheDocument();
  });
});
