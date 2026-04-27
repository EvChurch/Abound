import { fireEvent, render, screen } from "@testing-library/react";
import Link from "next/link";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DropdownPanel } from "@/components/ui/dropdown-panel";

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: (
        _event: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        listeners.add(listener);
      },
      dispatchEvent: vi.fn(),
      matches,
      media: "(hover: hover) and (pointer: fine)",
      onchange: null,
      removeEventListener: (
        _event: string,
        listener: (event: MediaQueryListEvent) => void,
      ) => {
        listeners.delete(listener);
      },
    })),
  );
}

describe("DropdownPanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a navigable primary link on fine-pointer interfaces", () => {
    mockMatchMedia(true);

    render(
      <DropdownPanel
        navigateHref="/people"
        navigateLabel="People"
        openOnHover
        trigger={<span>People</span>}
      >
        <Link href="/households">Households</Link>
      </DropdownPanel>,
    );

    expect(screen.getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/people",
    );
    fireEvent.mouseEnter(screen.getByRole("link", { name: "People" }));
    expect(screen.getByRole("link", { name: "Households" })).toHaveAttribute(
      "href",
      "/households",
    );
  });

  it("keeps a single toggle button on touch-style interfaces", () => {
    mockMatchMedia(false);

    render(
      <DropdownPanel
        navigateHref="/people"
        navigateLabel="People"
        trigger={<span>People</span>}
      >
        <Link href="/households">Households</Link>
      </DropdownPanel>,
    );

    expect(
      screen.queryByRole("link", { name: "People" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "People" }));
    expect(screen.getByRole("link", { name: "Households" })).toHaveAttribute(
      "href",
      "/households",
    );
  });
});
