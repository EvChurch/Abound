import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateCommunicationPrepStatusAction } from "@/app/communications/actions";
import { AppTopNav } from "@/components/navigation/app-top-nav";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import {
  audiencePreviewFromRecord,
  getCommunicationPrep,
  type CommunicationPrepRecord,
} from "@/lib/communications/prep";

type CommunicationPrepDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function CommunicationPrepDetailPage({
  params,
}: CommunicationPrepDetailPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const { id } = await params;
  const prep = await getCommunicationPrep(id, accessState.user).catch(
    (error: unknown) => {
      if (
        error &&
        typeof error === "object" &&
        "extensions" in error &&
        (error as { extensions?: { code?: string } }).extensions?.code ===
          "NOT_FOUND"
      ) {
        notFound();
      }

      throw error;
    },
  );
  const preview = audiencePreviewFromRecord(prep);

  return (
    <div className="min-h-screen bg-app-background">
      <AppTopNav active="communications" />
      <main className="grid gap-6 px-7 py-7">
        <section className="grid gap-3">
          <Link
            className="w-fit text-[13px] font-semibold text-app-accent"
            href="/communications"
          >
            Back to communications
          </Link>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="grid gap-2">
              <h1 className="text-[34px] font-semibold leading-tight tracking-normal text-app-foreground">
                {prep.title}
              </h1>
              <p className="max-w-4xl text-[13px] leading-6 text-app-muted">
                {prep.segmentSummary}
              </p>
            </div>
            <StatusBadge status={prep.status} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
            <div className="flex min-h-14 items-center justify-between border-b border-app-border bg-app-soft px-4">
              <div>
                <h2 className="text-[14px] font-semibold text-app-foreground">
                  Audience preview
                </h2>
                <p className="text-[12px] text-app-muted">
                  {prep.audienceSize}
                  {prep.audienceTruncated ? "+" : ""} matching{" "}
                  {prep.audienceResource.toLowerCase()}
                </p>
              </div>
              <span className="rounded-[6px] border border-app-border bg-app-background px-2.5 py-1 text-[12px] font-semibold text-app-muted">
                {preview.length} previewed
              </span>
            </div>

            {preview.length === 0 ? (
              <div className="px-4 py-10 text-center text-[13px] text-app-muted">
                No matching audience members.
              </div>
            ) : (
              <div className="divide-y divide-app-border">
                {preview.map((member) => (
                  <article
                    className="grid gap-2 px-4 py-4"
                    key={`${member.resource}:${member.rockId}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="grid gap-1">
                        <Link
                          className="font-semibold text-app-accent"
                          href={
                            member.resource === "PERSON"
                              ? `/people/${member.rockId}`
                              : `/households/${member.rockId}`
                          }
                        >
                          {member.displayName}
                        </Link>
                        <span className="text-[12px] text-app-muted">
                          {member.householdName ??
                            member.campusName ??
                            "No household context"}
                        </span>
                      </div>
                      <ContactBadge ready={member.contactReady}>
                        {member.contactState}
                      </ContactBadge>
                    </div>
                    <p className="text-[13px] leading-6 text-app-muted">
                      {member.explanation}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="grid h-fit gap-4 rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
            <div className="grid gap-1">
              <h2 className="text-[14px] font-semibold text-app-foreground">
                Review
              </h2>
              <p className="text-[12px] leading-5 text-app-muted">
                {workflowState(prep)}
              </p>
            </div>

            <form
              action={updateCommunicationPrepStatusAction}
              className="grid gap-3"
            >
              <input name="id" type="hidden" value={prep.id} />
              <label className="grid gap-1">
                <span className="text-[12px] font-semibold text-app-muted">
                  Handoff target
                </span>
                <input
                  className="min-h-9 rounded-[6px] border border-app-border bg-app-background px-2.5 text-[13px] text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                  defaultValue={prep.handoffTarget ?? ""}
                  name="handoffTarget"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[12px] font-semibold text-app-muted">
                  Review notes
                </span>
                <textarea
                  className="min-h-28 rounded-[6px] border border-app-border bg-app-background px-2.5 py-2 text-[13px] text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                  defaultValue={prep.reviewNotes ?? ""}
                  name="reviewNotes"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <StatusButton status="READY_FOR_REVIEW">Ready</StatusButton>
                <StatusButton status="APPROVED">Approve</StatusButton>
                <StatusButton status="HANDED_OFF">Hand off</StatusButton>
                <StatusButton status="CANCELED">Cancel</StatusButton>
              </div>
            </form>
          </aside>
        </section>
      </main>
    </div>
  );
}

function StatusButton({
  children,
  status,
}: {
  children: string;
  status: string;
}) {
  return (
    <button
      className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-border bg-app-background px-3 text-[12px] font-semibold text-app-muted hover:border-app-accent hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/30"
      name="status"
      type="submit"
      value={status}
    >
      {children}
    </button>
  );
}

function StatusBadge({
  status,
}: {
  status: CommunicationPrepRecord["status"];
}) {
  const tone = {
    APPROVED: "border-emerald-700 bg-emerald-50 text-emerald-950",
    CANCELED: "border-app-border bg-app-chip text-app-muted",
    DRAFT: "border-sky-700 bg-sky-50 text-sky-950",
    HANDED_OFF:
      "border-app-border-strong bg-app-background text-app-foreground",
    READY_FOR_REVIEW: "border-amber-700 bg-amber-50 text-amber-950",
  } satisfies Record<CommunicationPrepRecord["status"], string>;

  return (
    <span
      className={`inline-flex min-h-8 w-fit items-center rounded-[6px] border px-3 text-[12px] font-semibold ${tone[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function ContactBadge({
  children,
  ready,
}: {
  children: string;
  ready: boolean;
}) {
  return (
    <span
      className={
        ready
          ? "inline-flex min-h-7 items-center rounded-[6px] border border-emerald-700 bg-emerald-50 px-2.5 text-[12px] font-semibold text-emerald-950"
          : "inline-flex min-h-7 items-center rounded-[6px] border border-amber-700 bg-amber-50 px-2.5 text-[12px] font-semibold text-amber-950"
      }
    >
      {children}
    </span>
  );
}

function workflowState(prep: CommunicationPrepRecord) {
  if (prep.handedOffAt) {
    return `Handed off ${formatDate(prep.handedOffAt)}`;
  }

  if (prep.approvedAt) {
    return `Approved ${formatDate(prep.approvedAt)}`;
  }

  if (prep.readyForReviewAt) {
    return `Ready for review ${formatDate(prep.readyForReviewAt)}`;
  }

  return "Draft";
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
