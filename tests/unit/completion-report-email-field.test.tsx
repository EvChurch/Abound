import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CompletionReportEmailField } from "@/components/communications/completion-report-email-field";

describe("CompletionReportEmailField", () => {
  it("renders saved report emails as removable chips", () => {
    const { container } = render(
      <form>
        <CompletionReportEmailField
          defaultEmails={["Membership@Example.com", "care@example.com"]}
        />
      </form>,
    );

    expect(screen.getByText("membership@example.com")).toBeInTheDocument();
    expect(screen.getByText("care@example.com")).toBeInTheDocument();
    expect(
      container.querySelectorAll('input[name="completionReportEmail"]'),
    ).toHaveLength(2);

    fireEvent.click(
      screen.getByRole("button", { name: "Remove membership@example.com" }),
    );

    expect(
      screen.queryByText("membership@example.com"),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('input[name="completionReportEmail"]'),
    ).toHaveLength(1);
  });

  it("turns typed and pasted email lists into hidden form values", () => {
    const { container } = render(
      <form>
        <CompletionReportEmailField />
      </form>,
    );
    const input = screen.getByLabelText("Completion report");

    fireEvent.change(input, { target: { value: "membership@example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.paste(input, {
      clipboardData: {
        getData: () =>
          "care@example.com; admin@example.com membership@example.com",
      },
    });

    const values = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'input[name="completionReportEmail"]',
      ),
    ).map((field) => field.value);

    expect(values).toEqual([
      "membership@example.com",
      "care@example.com",
      "admin@example.com",
    ]);
  });

  it("keeps invalid typed addresses out of the chip list", () => {
    const { container } = render(
      <form>
        <CompletionReportEmailField />
      </form>,
    );
    const input = screen.getByLabelText("Completion report");

    fireEvent.change(input, { target: { value: "not-an-email" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveValue("not-an-email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid email address before adding it.",
    );
    expect(
      container.querySelectorAll('input[name="completionReportEmail"]'),
    ).toHaveLength(0);
  });

  it("adds valid pasted addresses while keeping invalid entries in the input", () => {
    const { container } = render(
      <form>
        <CompletionReportEmailField />
      </form>,
    );
    const input = screen.getByLabelText("Completion report");

    fireEvent.paste(input, {
      clipboardData: {
        getData: () => "care@example.com, bad-address, admin@example.com",
      },
    });

    const values = Array.from(
      container.querySelectorAll<HTMLInputElement>(
        'input[name="completionReportEmail"]',
      ),
    ).map((field) => field.value);

    expect(values).toEqual(["care@example.com", "admin@example.com"]);
    expect(input).toHaveValue("bad-address");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
