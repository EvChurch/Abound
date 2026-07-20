import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { AppTopNav } from "@/components/navigation/app-top-nav";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import { getCommunicationAutomation } from "@/lib/communications/automations";
import {
  renderCommunicationTemplate,
  type CommunicationTemplateFieldValues,
} from "@/lib/communications/templates";

type CommunicationAutomationRecipientPreviewPageProps = {
  params: Promise<{
    id: string;
    recipientId: string;
    runId: string;
  }>;
};

export async function generateMetadata({
  params,
}: CommunicationAutomationRecipientPreviewPageProps) {
  const { recipientId } = await params;

  return {
    title: `Email preview ${recipientId}`,
  };
}

export default async function CommunicationAutomationRecipientPreviewPage({
  params,
}: CommunicationAutomationRecipientPreviewPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const { id, recipientId, runId } = await params;
  const automation = await getCommunicationAutomation(
    id,
    accessState.user,
  ).catch((error: unknown) => {
    if (isNotFoundError(error)) {
      notFound();
    }

    throw error;
  });
  const run = automation.runs.find((candidate) => candidate.id === runId);
  const recipient = run?.recipients.find(
    (candidate) => candidate.id === recipientId,
  );

  if (!run || !recipient) {
    notFound();
  }

  const rendered = await renderCommunicationTemplate({
    fields: automation.templateFields as CommunicationTemplateFieldValues,
    key: automation.templateKey,
    tokenContext: {
      displayName: recipient.displayNameSnapshot,
      firstName: firstNameFromDisplayName(recipient.displayNameSnapshot),
    },
  });

  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav
        active="communications"
        canManageSettings={hasPermission(
          accessState.user.role,
          "settings:manage",
        )}
        canManageTools={hasPermission(accessState.user.role, "pledges:manage")}
      />
      <main className="mx-auto grid w-full max-w-[1120px] gap-5 px-4 py-5 sm:px-7 sm:py-7">
        <section className="grid gap-3">
          <Link
            className="inline-flex w-fit items-center gap-1 font-mono text-[11px] font-semibold uppercase text-app-accent-strong hover:text-app-accent focus:outline-none focus:ring-2 focus:ring-app-accent/30"
            href={`/communications/${automation.id}/runs/${run.id}`}
          >
            <ChevronLeft aria-hidden="true" className="size-3.5" />
            {automation.name}
          </Link>
          <div className="grid gap-1">
            <h1 className="text-[28px] font-semibold leading-tight tracking-normal text-app-foreground sm:text-[34px]">
              Email preview
            </h1>
            <p className="text-[13px] text-app-muted">
              {recipient.displayNameSnapshot}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[8px] bg-app-surface shadow-[0_1px_2px_rgba(150,140,120,0.12)]">
          <div className="grid gap-0 border-b border-app-border bg-app-soft">
            <EmailHeaderRow label="From" value={senderAddress(automation)} />
            <EmailHeaderRow label="To" value={recipientAddress(recipient)} />
            <EmailHeaderRow
              label="Subject"
              subvalue={rendered.previewText}
              value={rendered.subject}
            />
          </div>
          <div className="bg-[#f8f6f1]">
            <iframe
              className="block h-[720px] w-full border-0 bg-[#f8f6f1]"
              sandbox=""
              srcDoc={rendered.html}
              title="Rendered email body"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function EmailHeaderRow({
  label,
  subvalue,
  value,
}: {
  label: string;
  subvalue?: string;
  value: string;
}) {
  return (
    <div className="grid min-h-11 grid-cols-[88px_minmax(0,1fr)] items-center border-b border-app-border px-4 py-2 last:border-b-0 sm:grid-cols-[112px_minmax(0,1fr)] sm:px-5">
      <div className="font-mono text-[11px] font-semibold uppercase text-app-muted">
        {label}
      </div>
      <div className="grid min-w-0 gap-0.5">
        <div className="truncate text-[13px] font-medium text-app-foreground">
          {value || "Not set"}
        </div>
        {subvalue ? (
          <div className="truncate text-[12px] text-app-muted">{subvalue}</div>
        ) : null}
      </div>
    </div>
  );
}

function firstNameFromDisplayName(displayName: string) {
  return displayName.trim().split(/\s+/)[0] ?? "";
}

function senderAddress(automation: {
  fromEmail: string | null;
  fromName: string | null;
}) {
  const email =
    automation.fromEmail ?? process.env.RESEND_FROM_EMAIL ?? "exec@ev.church";
  const name =
    automation.fromName ?? process.env.RESEND_FROM_NAME ?? "Exec Team";

  return name ? `${name} <${email}>` : email;
}

function recipientAddress(recipient: {
  displayNameSnapshot: string;
  emailSnapshot: string | null;
}) {
  if (!recipient.emailSnapshot) {
    return recipient.displayNameSnapshot;
  }

  return `${recipient.displayNameSnapshot} <${recipient.emailSnapshot}>`;
}

function isNotFoundError(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "extensions" in error &&
    (error as { extensions?: { code?: string } }).extensions?.code ===
      "NOT_FOUND"
  );
}
