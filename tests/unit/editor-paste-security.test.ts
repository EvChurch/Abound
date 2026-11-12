// @vitest-environment-options {"jsdom":{"runScripts":"dangerously"}}
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

// Resolve through the mounted email editor, never a separate test-only version.
const appRequire = createRequire(`${process.cwd()}/package.json`);
const editorRequire = createRequire(appRequire.resolve("@react-email/editor"));
const pmRequire = createRequire(editorRequire.resolve("@tiptap/pm/view"));
const { Schema, DOMSerializer } = pmRequire("prosemirror-model");
const { EditorState } = pmRequire("prosemirror-state");
const { EditorView } = pmRequire("prosemirror-view");

const views: { destroy: () => void }[] = [];
afterEach(() => {
  for (const view of views.splice(0)) view.destroy();
  document.body.replaceChildren();
  delete document.documentElement.dataset.pasteExecuted;
});

function paste(html: string) {
  // A small schema makes the publisher's clipboard-context validation contract
  // explicit. The handler is intentionally forbidden by the attribute validator.
  const schema = new Schema({
    nodes: {
      doc: { content: "block+" },
      paragraph: {
        group: "block",
        content: "text*",
        parseDOM: [{ tag: "p" }],
        toDOM: () => ["p", 0],
      },
      wrapper: {
        group: "block",
        content: "block+",
        attrs: {
          handler: {
            default: "",
            validate(value: unknown) {
              if (value !== "") throw new RangeError("Unexpected handler");
            },
          },
        },
        toDOM: (node: { attrs: { handler: string } }) => [
          "div",
          { onclick: node.attrs.handler },
          0,
        ],
      },
      text: { group: "inline" },
    },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const output = document.createElement("div");
  document.body.append(output);
  let serialized = "";
  const view = new EditorView(host, {
    state: EditorState.create({ schema }),
    handlePaste(
      _view: unknown,
      _event: unknown,
      slice: { content: unknown; toJSON: () => unknown },
    ) {
      serialized = JSON.stringify(slice.toJSON());
      output.append(
        DOMSerializer.fromSchema(schema).serializeFragment(slice.content),
      );
      return true;
    },
  });
  views.push(view);
  expect(
    view.pasteHTML(
      html,
      Object.assign(new Event("paste"), { clipboardData: null }),
    ),
  ).toBe(true);
  for (const element of output.querySelectorAll<HTMLElement>("*"))
    element.click();
  return { output, serialized };
}

describe("email editor's ProseMirror paste runtime", () => {
  it("rejects invalid slice-context attributes before rendering or serialization", () => {
    const context = JSON.stringify([
      "wrapper",
      { handler: "document.documentElement.dataset.pasteExecuted='yes'" },
    ]);
    const { output, serialized } = paste(
      `<p data-pm-slice='0 0 ${context.replaceAll("'", "&#39;")}'>Synthetic note</p>`,
    );
    expect(document.documentElement.dataset.pasteExecuted).toBeUndefined();
    expect(serialized).not.toContain("pasteExecuted");
    expect(output.querySelector("[onclick]")).toBeNull();
    expect(output.textContent).toBe("Synthetic note");
  });

  it("preserves ordinary HTML paste and serializable text", () => {
    const { output, serialized } = paste(
      "<p>Thanks for connecting</p><p>Kind regards</p>",
    );
    expect(output.innerHTML).toBe(
      "<p>Thanks for connecting</p><p>Kind regards</p>",
    );
    expect(JSON.parse(serialized).content).toEqual([
      {
        type: "paragraph",
        content: [{ type: "text", text: "Thanks for connecting" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Kind regards" }] },
    ]);
  });
});
