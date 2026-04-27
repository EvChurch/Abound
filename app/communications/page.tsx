import Link from "next/link";
import { redirect } from "next/navigation";

import { AppTopNav } from "@/components/navigation/app-top-nav";
import { getCurrentAccessState } from "@/lib/auth/access-control";
import { auth0 } from "@/lib/auth/auth0";
import { hasPermission } from "@/lib/auth/roles";
import {
  audiencePreviewFromRecord,
  listCommunicationPreps,
  type CommunicationPrepRecord,
} from "@/lib/communications/prep";

type CommunicationsPageProps = {
  searchParams: Promise<{
    created?: string;
  }>;
};

export default async function CommunicationsPage({
  searchParams,
}: CommunicationsPageProps) {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "needs_access") {
    redirect("/access-request");
  }

  const params = await searchParams;
  const preps = await listCommunicationPreps({ limit: 25 }, accessState.user);

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
      <main className="grid gap-6 px-7 py-7">
        <section className="grid gap-3">
          <h1 className="text-[34px] font-semibold leading-tight tracking-normal text-app-foreground">
            Communications
          </h1>
          <p className="max-w-4xl text-[13px] leading-6 text-app-muted">
            Role-safe audiences, review notes, and Rock handoff tracking for
            church communication work.
          </p>
        </section>

        <section className="overflow-hidden rounded-[8px] border border-app-border bg-app-surface shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
          <div className="flex min-h-14 items-center justify-between border-b border-app-border bg-app-soft px-4">
            <div>
              <h2 className="text-[14px] font-semibold text-app-foreground">
                Prep records
              </h2>
              <p className="text-[12px] text-app-muted">
                Drafts, reviews, approvals, and Rock handoffs
              </p>
            </div>
            <span className="rounded-[6px] border border-app-border bg-app-background px-2.5 py-1 text-[12px] font-semibold text-app-muted">
              {preps.length} loaded
            </span>
          </div>

          {preps.length === 0 ? (
            <div className="grid min-h-52 place-items-center px-6 py-10 text-center">
              <div className="grid max-w-xl gap-2">
                <h3 className="text-[18px] font-semibold text-app-foreground">
                  No communication prep records yet.
                </h3>
                <p className="text-[13px] leading-6 text-app-muted">
                  Audience drafts prepared from People and Households will
                  appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-[13px]">
                <thead className="text-[11px] uppercase text-app-muted">
                  <tr>
                    <TableHead>Prep</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Handoff</TableHead>
                    <TableHead>Preview</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {preps.map((prep) => (
                    <CommunicationPrepRow
                      highlighted={prep.id === params.created}
                      key={prep.id}
                      prep={prep}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function CommunicationPrepRow({
  highlighted,
  prep,
}: {
  highlighted: boolean;
  prep: CommunicationPrepRecord;
}) {
  const preview = audiencePreviewFromRecord(prep).slice(0, 3);

  return (
    <tr
      className={
        highlighted
          ? "border-t border-app-border bg-app-accent/10"
          : "border-t border-app-border hover:bg-app-surface-subtle"
      }
    >
      <td className="px-4 py-4 align-top">
        <div className="grid gap-1">
          <Link
            className="font-semibold text-app-accent"
            href={`/communications/${prep.id}`}
          >
            {prep.title}
          </Link>
          <span className="text-[12px] leading-5 text-app-muted">
            {prep.segmentSummary}
          </span>
          <span className="font-mono text-[11px] uppercase text-app-faint">
            Created {formatDate(prep.createdAt)}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <StatusBadge status={prep.status} />
      </td>
      <td className="px-4 py-4 align-top">
        <div className="grid gap-1">
          <span className="font-semibold text-app-foreground">
            {prep.audienceSize}
            {prep.audienceTruncated ? "+" : ""}{" "}
            {prep.audienceResource.toLowerCase()}
          </span>
          <span className="text-[12px] text-app-muted">
            {prep.savedListViewId ? "Saved view audience" : "Custom audience"}
          </span>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="grid gap-1 text-[12px] leading-5">
          <span className="font-semibold text-app-foreground">
            {prep.handoffTarget ?? "Not selected"}
          </span>
          <span className="text-app-muted">{handoffState(prep)}</span>
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="grid gap-2">
          {preview.length > 0 ? (
            preview.map((member) => (
              <div
                className="grid gap-1"
                key={`${member.resource}:${member.rockId}`}
              >
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
                <span className="text-[12px] leading-5 text-app-muted">
                  {member.contactState} · {member.explanation}
                </span>
              </div>
            ))
          ) : (
            <span className="text-[12px] text-app-muted">
              No matching audience members.
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function TableHead({ children }: { children: string }) {
  return (
    <th className="border-b border-app-border bg-app-soft px-4 py-3 font-semibold">
      {children}
    </th>
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
      className={`inline-flex min-h-7 items-center rounded-[6px] border px-2.5 text-[12px] font-semibold ${tone[status]}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function handoffState(prep: CommunicationPrepRecord) {
  if (prep.handedOffAt) {
    return `Handed off ${formatDate(prep.handedOffAt)}`;
  }

  if (prep.approvedAt) {
    return `Approved ${formatDate(prep.approvedAt)}`;
  }

  if (prep.readyForReviewAt) {
    return `Ready ${formatDate(prep.readyForReviewAt)}`;
  }

  return "Review pending";
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
