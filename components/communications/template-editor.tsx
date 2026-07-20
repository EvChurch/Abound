"use client";

import {
  EmailEditor,
  type EmailEditorProps,
  type EmailEditorRef,
} from "@react-email/editor";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";

import { updateCommunicationAutomationTemplateAction } from "@/app/communications/actions";
import {
  SYSTEM_EMAIL_HEADER_IMAGE_ALT,
  SYSTEM_EMAIL_HEADER_IMAGE_PATH,
} from "@/lib/communications/template-assets";

type TemplateEditorProps = {
  automationId: string;
  templateFields: Prisma.JsonValue;
  templateKey: string;
};

type TemplateFieldsProps = {
  formId?: string;
  includeGeneratedTextField?: boolean;
  templateFields: Prisma.JsonValue;
  templateKey: string;
};

type TemplateMetadataFieldsProps = {
  formId?: string;
  templateFields: Prisma.JsonValue;
};

type EditorTemplatePayload = {
  editorJson?: unknown;
  format?: "react-email-editor";
  html?: string | null;
  previewText?: string | null;
  subject?: string | null;
  text?: string | null;
};

const DEFAULT_TEMPLATE = {
  html: `
    <h1>Thanks for connecting with us</h1>
    <p>Hi {{ firstName }},</p>
    <p>We are grateful that you are taking steps to connect more deeply with our church.</p>
    <p>If you have any questions about giving, stewardship, or how to get involved, we would love to help.</p>
    <p><a href="https://example.org/give">Learn about giving</a></p>
    <p>With gratitude,<br />The Stewardship Team</p>
  `,
  previewText: "A quick note from our church team.",
  subject: "Thanks for connecting with us",
};

const ABOUND_EMAIL_THEME = {
  extends: "basic",
  styles: {
    body: {
      backgroundColor: "#f8f6f1",
      color: "#2f332f",
      fontSize: "15px",
      lineHeight: "24px",
    },
    button: {
      backgroundColor: "#2f6f77",
      borderRadius: "6px",
      color: "#ffffff",
      fontWeight: 700,
      padding: "12px 18px",
    },
    container: {
      backgroundColor: "#ffffff",
      borderColor: "#e3ded4",
      borderRadius: "8px",
      borderStyle: "solid",
      borderWidth: "1px",
      padding: "32px",
    },
    h1: {
      color: "#252923",
      fontSize: "28px",
      fontWeight: 700,
      lineHeight: "34px",
    },
    h2: {
      color: "#252923",
      fontSize: "22px",
      fontWeight: 700,
      lineHeight: "28px",
    },
    h3: {
      color: "#252923",
      fontSize: "18px",
      fontWeight: 700,
      lineHeight: "24px",
    },
    link: {
      color: "#2f6f77",
      textDecoration: "underline",
    },
    paragraph: {
      color: "#2f332f",
      fontSize: "15px",
      lineHeight: "24px",
    },
  },
} satisfies NonNullable<EmailEditorProps["theme"]>;

export function TemplateEditor({
  automationId,
  templateFields,
  templateKey,
}: TemplateEditorProps) {
  return (
    <form
      action={updateCommunicationAutomationTemplateAction}
      className="grid gap-3"
    >
      <input name="id" type="hidden" value={automationId} />
      <TemplateMetadataFields templateFields={templateFields} />
      <TemplateFields
        includeGeneratedTextField={false}
        templateFields={templateFields}
        templateKey={templateKey}
      />
      <button
        className="inline-flex min-h-9 w-fit cursor-pointer items-center justify-center rounded-[6px] bg-app-accent px-3 text-[12px] font-semibold text-white hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent/30"
        type="submit"
      >
        Save template
      </button>
    </form>
  );
}

export function TemplateFields(props: TemplateFieldsProps) {
  const { formId, includeGeneratedTextField = true, templateFields } = props;
  const initialPayload = useMemo(
    () => readTemplatePayload(templateFields),
    [templateFields],
  );
  const editorRef = useRef<EmailEditorRef>(null);
  const [editorJson, setEditorJson] = useState(initialPayload.editorJson);
  const [html, setHtml] = useState(initialPayload.html);
  const [text, setText] = useState(initialPayload.text);

  const syncEditorOutput = useCallback(async (ref: EmailEditorRef) => {
    const email = await ref.getEmail();
    setEditorJson(ref.getJSON());
    setHtml(email.html);
    setText(email.text);
  }, []);

  return (
    <div className="grid h-full min-h-0">
      <input
        form={formId}
        name="editorJson"
        type="hidden"
        value={JSON.stringify(editorJson)}
      />
      <input
        form={formId}
        name="format"
        type="hidden"
        value="react-email-editor"
      />
      <input form={formId} name="html" type="hidden" value={html} />
      {includeGeneratedTextField ? (
        <input form={formId} name="text" type="hidden" value={text} />
      ) : null}

      <div className="h-full min-h-[620px] overflow-auto bg-[#f8f6f1] px-4 py-8 sm:px-8 lg:min-h-0">
        <div className="mx-auto max-w-[600px]">
          <div className="mb-4 px-8">
            <Image
              alt={SYSTEM_EMAIL_HEADER_IMAGE_ALT}
              className="h-12 w-12 rounded-[4px]"
              height={48}
              src={SYSTEM_EMAIL_HEADER_IMAGE_PATH}
              width={48}
            />
          </div>
          <EmailEditor
            ref={editorRef}
            content={initialPayload.content}
            onReady={syncEditorOutput}
            onUpdate={syncEditorOutput}
            placeholder="Write the email..."
            theme={ABOUND_EMAIL_THEME}
          />
          <div className="mt-4 px-8 text-[12px] leading-5 text-[#66746e]">
            You are receiving this because you are connected with our church.
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplateMetadataFields({
  formId,
  templateFields,
}: TemplateMetadataFieldsProps) {
  const initialPayload = useMemo(
    () => readTemplatePayload(templateFields),
    [templateFields],
  );

  return (
    <>
      <label className="grid gap-1">
        <span className="text-[12px] font-semibold text-app-muted">
          Subject
        </span>
        <input
          className="min-h-10 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
          defaultValue={initialPayload.subject}
          form={formId}
          name="subject"
          required
          type="text"
        />
      </label>
      <label className="grid gap-1">
        <span className="text-[12px] font-semibold text-app-muted">
          Preview
        </span>
        <input
          className="min-h-10 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
          defaultValue={initialPayload.previewText}
          form={formId}
          name="previewText"
          type="text"
        />
        <span className="text-[12px] leading-5 text-app-muted">
          Shown by email clients as the short snippet beside the subject.
        </span>
      </label>
    </>
  );
}

function readTemplatePayload(value: Prisma.JsonValue) {
  const fields = jsonFields(value);

  if (fields.format === "react-email-editor" && fields.html) {
    return {
      content: (fields.editorJson ??
        fields.html) as EmailEditorProps["content"],
      editorJson: fields.editorJson ?? null,
      html: fields.html,
      previewText: fields.previewText ?? DEFAULT_TEMPLATE.previewText,
      subject: fields.subject ?? DEFAULT_TEMPLATE.subject,
      text: fields.text ?? "",
    };
  }

  return {
    content: DEFAULT_TEMPLATE.html as EmailEditorProps["content"],
    editorJson: null,
    html: DEFAULT_TEMPLATE.html,
    previewText: DEFAULT_TEMPLATE.previewText,
    subject: DEFAULT_TEMPLATE.subject,
    text: "",
  };
}

function jsonFields(value: Prisma.JsonValue): EditorTemplatePayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as EditorTemplatePayload;
}
