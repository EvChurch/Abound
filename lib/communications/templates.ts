import { toPlainText } from "@react-email/render";

import {
  assertApprovedTokens,
  renderApprovedTokens,
  type CommunicationTemplateTokenContext,
} from "@/lib/communications/template-tokens";
import {
  SYSTEM_EMAIL_HEADER_IMAGE_ALT,
  SYSTEM_EMAIL_HEADER_IMAGE_PATH,
} from "@/lib/communications/template-assets";

export const JOINING_NEVER_GIVEN_TEMPLATE_KEY = "joining-never-given";

export type CommunicationTemplateKey = typeof JOINING_NEVER_GIVEN_TEMPLATE_KEY;

export type CommunicationTemplateFieldValues = {
  editorJson?: unknown;
  format?: "react-email-editor";
  html?: string | null;
  previewText?: string | null;
  subject?: string | null;
  text?: string | null;
};

export type NormalizedEditorTemplateFields = {
  editorJson: object | null;
  format: "react-email-editor";
  html: string;
  previewText: string;
  subject: string;
  text: string | null;
};

export type RenderCommunicationTemplateInput = {
  fields: CommunicationTemplateFieldValues;
  key: CommunicationTemplateKey | string;
  tokenContext: CommunicationTemplateTokenContext;
};

export type RenderedCommunicationTemplate = {
  html: string;
  previewText: string;
  subject: string;
  text: string;
};

export const DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE = {
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
} satisfies Pick<
  NormalizedEditorTemplateFields,
  "html" | "previewText" | "subject"
>;

export const SYSTEM_EMAIL_FOOTER_HTML = `
  <p>You are receiving this because you are connected with our church.</p>
`;
const SYSTEM_EMAIL_FOOTER_TEXT =
  "You are receiving this because you are connected with our church.";

const FIELD_LIMITS = {
  previewText: 180,
  subject: 120,
} satisfies Record<"previewText" | "subject", number>;

const HTML_PATTERN = /<[^>]+>/;

export function normalizeTemplateFields(
  key: CommunicationTemplateKey | string,
  fields: CommunicationTemplateFieldValues,
) {
  assertSupportedTemplate(key);

  if (fields.format !== "react-email-editor") {
    throw new Error("Communication templates must use React Email Editor.");
  }

  const subject = normalizeField("subject", fields.subject ?? null);
  const previewText = normalizeOptionalField(
    "previewText",
    fields.previewText ?? DEFAULT_JOINING_NEVER_GIVEN_TEMPLATE.previewText,
  );
  const html = normalizeEditorHtml(fields.html);
  const text = normalizeOptionalText(fields.text);

  assertApprovedTokens(html);
  if (text) {
    assertApprovedTokens(text);
  }

  return {
    editorJson: normalizeEditorJson(fields.editorJson),
    format: "react-email-editor",
    html,
    previewText,
    subject,
    text,
  } satisfies NormalizedEditorTemplateFields;
}

export async function renderCommunicationTemplate({
  fields,
  key,
  tokenContext,
}: RenderCommunicationTemplateInput): Promise<RenderedCommunicationTemplate> {
  assertSupportedTemplate(key);

  const normalized = normalizeTemplateFields(key, fields);
  const contentHtml = renderApprovedTokens(normalized.html, tokenContext);
  const html = systemEmailDocument(contentHtml);

  return {
    html,
    previewText: renderApprovedTokens(normalized.previewText, tokenContext),
    subject: renderApprovedTokens(normalized.subject, tokenContext),
    text: normalized.text
      ? renderApprovedTokens(normalized.text, tokenContext)
      : toPlainText(appendSystemFooter(contentHtml)),
  };
}

function systemEmailDocument(contentHtml: string) {
  const header = hasSystemHeader(contentHtml)
    ? ""
    : `<div class="system-header"><img src="${systemEmailHeaderImageUrl()}" alt="${SYSTEM_EMAIL_HEADER_IMAGE_ALT}" /></div>`;
  const footer = hasSystemFooter(contentHtml)
    ? ""
    : `<div class="system-footer">${SYSTEM_EMAIL_FOOTER_HTML}</div>`;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        background: #f8f6f1;
        color: #2f332f;
        font-family: Arial, sans-serif;
        font-size: 15px;
        line-height: 24px;
      }

      .system-page {
        max-width: 600px;
        margin: 0 auto;
        padding: 32px 16px;
      }

      .system-header {
        margin: 0 0 16px;
        padding: 0 32px;
      }

      .system-header img {
        width: 48px;
        height: 48px;
        border-radius: 4px;
        display: block;
      }

      .system-content h1 {
        margin: 0 0 16px;
        color: #252923;
        font-size: 28px;
        font-weight: 700;
        line-height: 34px;
      }

      .system-content h2 {
        margin: 0 0 14px;
        color: #252923;
        font-size: 22px;
        font-weight: 700;
        line-height: 28px;
      }

      .system-content h3 {
        margin: 0 0 12px;
        color: #252923;
        font-size: 18px;
        font-weight: 700;
        line-height: 24px;
      }

      .system-content p {
        margin: 0 0 16px;
        color: #2f332f;
        font-size: 15px;
        line-height: 24px;
      }

      .system-content p:last-child {
        margin-bottom: 0;
      }

      .system-content a {
        color: #2f6f77;
        text-decoration: underline;
      }

      .system-content img {
        max-width: 100%;
        height: auto;
      }

      .system-content [style*="border"] {
        border-color: transparent !important;
      }

      .system-footer {
        margin-top: 16px;
        padding: 0 32px;
        color: #66746e;
        font-size: 12px;
        line-height: 20px;
      }

      .system-footer p {
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="system-page">
      ${header}
      <div class="system-content">
        ${contentHtml}
      </div>
      ${footer}
    </div>
  </body>
</html>`;
}

function hasSystemHeader(html: string) {
  return (
    html.includes(SYSTEM_EMAIL_HEADER_IMAGE_PATH) ||
    html.includes("ev-church-header.png") ||
    html.includes("GetImage.ashx?id=1631")
  );
}

function systemEmailHeaderImageUrl() {
  const appBaseUrl = process.env.APP_BASE_URL ?? "http://localhost:7000";
  return new URL(SYSTEM_EMAIL_HEADER_IMAGE_PATH, appBaseUrl).toString();
}

function appendSystemFooter(html: string) {
  if (hasSystemFooter(html)) {
    return html;
  }

  return `${html}\n${SYSTEM_EMAIL_FOOTER_HTML}`;
}

function hasSystemFooter(html: string) {
  return html.includes(SYSTEM_EMAIL_FOOTER_TEXT);
}

function normalizeField(
  field: "previewText" | "subject",
  value: string | null,
) {
  const text = String(value ?? "").trim();

  if (!text) {
    throw new Error(`Template field ${field} is required.`);
  }

  if (text.length > FIELD_LIMITS[field]) {
    throw new Error(`Template field ${field} is too long.`);
  }

  if (HTML_PATTERN.test(text)) {
    throw new Error("Template fields do not accept arbitrary HTML.");
  }

  assertApprovedTokens(text);
  return text;
}

function normalizeOptionalField(
  field: "previewText" | "subject",
  value: string | null,
) {
  const text = String(value ?? "").trim();

  if (!text) {
    return "";
  }

  if (text.length > FIELD_LIMITS[field]) {
    throw new Error(`Template field ${field} is too long.`);
  }

  if (HTML_PATTERN.test(text)) {
    throw new Error("Template fields do not accept arbitrary HTML.");
  }

  assertApprovedTokens(text);
  return text;
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeEditorHtml(value: string | null | undefined) {
  const html = String(value ?? "").trim();

  if (!html) {
    throw new Error("Template email content is required.");
  }

  if (html.length > 100_000) {
    throw new Error("Template email content is too long.");
  }

  return html;
}

function normalizeEditorJson(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value;
}

function assertSupportedTemplate(key: string) {
  if (key !== JOINING_NEVER_GIVEN_TEMPLATE_KEY) {
    throw new Error(`Unsupported communication template: ${key}`);
  }
}
