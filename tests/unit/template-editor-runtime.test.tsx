import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EmailEditor, type EmailEditorRef } from "@react-email/editor";
import { createRef } from "react";

afterEach(cleanup);

it("pastes and serializes ordinary staff email content with the real editor", async () => {
  const ref = createRef<EmailEditorRef>();
  const ready = vi.fn();
  const updated = vi.fn();
  render(
    <EmailEditor
      ref={ref}
      content="<p>Hi {{ firstName }},</p>"
      onReady={ready}
      onUpdate={updated}
      placeholder="Write the email..."
    />,
  );
  await waitFor(() => expect(ready).toHaveBeenCalled());
  const api = ref.current;
  if (!api?.editor) throw new Error("Email editor did not initialize");
  act(() => {
    api.editor?.commands.setTextSelection(1);
    api.editor?.view.pasteHTML(
      "<p>Thanks for connecting <strong>today</strong>.</p>",
      Object.assign(new Event("paste"), { clipboardData: null }),
    );
  });
  await waitFor(() => expect(updated).toHaveBeenCalled());
  expect(JSON.stringify(api.getJSON())).toContain("Thanks for connecting");
  expect(JSON.stringify(api.getJSON())).toContain("firstName");
  const email = await api.getEmail();
  expect(email.html).toContain("Thanks for connecting");
  expect(email.html).toContain("<strong");
  expect(email.text).toContain("Thanks for connecting");
});
