import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AutomationLifecycleAction } from "@/components/communications/automation-lifecycle-action";

describe("AutomationLifecycleAction", () => {
  it("renders delete as an icon-only trigger with an accessible name", () => {
    render(
      <AutomationLifecycleAction
        action={vi.fn()}
        automationId="automation_1"
        mode="delete"
      />,
    );

    const trigger = screen.getByRole("button", { name: "Delete" });

    expect(trigger).toHaveClass("h-8", "w-8");
    expect(within(trigger).getByText("Delete")).toHaveClass("sr-only");
  });
});
