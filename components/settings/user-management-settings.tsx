import { APP_ROLES, type AppRole } from "@/lib/auth/roles";
import type {
  ManagedAccessRequest,
  ManagedAppUser,
  UserManagementSummary,
} from "@/lib/settings/users";
import { CustomSelect } from "@/components/ui/custom-select";
import { DropdownPanel } from "@/components/ui/dropdown-panel";

type UserManagementSettingsProps = {
  approveAction: (formData: FormData) => Promise<void>;
  denyAction: (formData: FormData) => Promise<void>;
  summary: UserManagementSummary;
  updateUserAction: (formData: FormData) => Promise<void>;
};

export function UserManagementSettings({
  approveAction,
  denyAction,
  summary,
  updateUserAction,
}: UserManagementSettingsProps) {
  const pendingAccessRequests = summary.accessRequests.filter(
    (request) => request.status === "PENDING",
  );

  return (
    <section className="grid gap-6">
      <header className="grid gap-4">
        <div className="grid gap-2">
          <p className="font-mono text-[11px] font-semibold uppercase text-app-accent-strong">
            Settings
          </p>
          <div className="grid gap-2">
            <h1 className="text-[32px] font-semibold leading-[1.12] tracking-normal text-app-foreground sm:text-[42px]">
              Users
            </h1>
            <p className="max-w-3xl text-[13px] leading-6 text-app-muted">
              Manage staff access, roles, and active status.
            </p>
          </div>
        </div>
      </header>

      {pendingAccessRequests.length > 0 ? (
        <section className="grid gap-4 rounded-[8px] border border-app-border bg-app-surface p-4">
          <div className="grid gap-1">
            <h2 className="text-[20px] font-semibold text-app-foreground">
              Access requests
            </h2>
            <p className="max-w-3xl text-[13px] leading-6 text-app-muted">
              Review pending requests and approve or deny access.
            </p>
          </div>

          <div className="grid gap-3">
            {pendingAccessRequests.map((request) => (
              <AccessRequestCard
                approveAction={approveAction}
                denyAction={denyAction}
                key={request.id}
                request={request}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4">
        {summary.users.length > 0 ? (
          <div className="grid gap-3">
            {summary.users.map((user) => (
              <UserCard
                key={user.id}
                updateUserAction={updateUserAction}
                user={user}
              />
            ))}
          </div>
        ) : (
          <EmptyPanel message="No local app users exist yet." />
        )}
      </section>
    </section>
  );
}

function AccessRequestCard({
  approveAction,
  denyAction,
  request,
}: {
  approveAction: (formData: FormData) => Promise<void>;
  denyAction: (formData: FormData) => Promise<void>;
  request: ManagedAccessRequest;
}) {
  const isPending = request.status === "PENDING";

  return (
    <article className="grid gap-4 rounded-[8px] border border-app-border-faint bg-app-background p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <RecordIdentity email={request.email} name={request.name}>
        <StatusBadge status={request.status} />
      </RecordIdentity>

      {isPending ? (
        <div className="flex flex-wrap gap-2">
          <form action={approveAction} className="flex flex-wrap gap-2">
            <input name="requestId" type="hidden" value={request.id} />
            <RoleSelect defaultValue="FINANCE" />
            <button className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-accent bg-app-accent px-3 text-[12.5px] font-semibold text-white">
              Approve
            </button>
          </form>
          <form action={denyAction}>
            <input name="requestId" type="hidden" value={request.id} />
            <button className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-border bg-app-surface px-3 text-[12.5px] font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground">
              Deny
            </button>
          </form>
        </div>
      ) : (
        <p className="text-[12px] font-semibold text-app-muted">
          Last updated {formatDateTime(request.updatedAt)}
        </p>
      )}
    </article>
  );
}

function UserCard({
  updateUserAction,
  user,
}: {
  updateUserAction: (formData: FormData) => Promise<void>;
  user: ManagedAppUser;
}) {
  const displayName =
    user.linkedPerson?.name ?? user.name ?? user.email ?? "User";
  const displayEmail = user.linkedPerson?.email ?? user.email;
  const avatarName =
    user.linkedPerson?.name ?? user.name ?? displayEmail ?? "User";

  return (
    <article className="grid gap-4 rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_1px_2px_rgba(150,140,120,0.12)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
      <RecordIdentity
        avatarName={avatarName}
        avatarUrl={user.linkedPerson?.photoUrl ?? null}
        email={displayEmail}
        name={displayName}
      />

      <UserActionsMenu updateUserAction={updateUserAction} user={user} />
    </article>
  );
}

function UserActionsMenu({
  updateUserAction,
  user,
}: {
  updateUserAction: (formData: FormData) => Promise<void>;
  user: ManagedAppUser;
}) {
  return (
    <div className="justify-self-end">
      <DropdownPanel
        align="right"
        panelClassName="w-60 rounded-[8px] border border-app-border bg-app-background p-3 shadow-lg"
        trigger={
          <>
            <span className="sr-only">Open user actions</span>
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M12 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
                fill="currentColor"
              />
            </svg>
          </>
        }
        triggerClassName="flex h-9 w-9 items-center justify-center rounded-[6px] border border-app-border bg-app-surface text-app-muted transition hover:bg-app-chip hover:text-app-foreground focus-visible:ring-2 focus-visible:ring-app-accent/25"
      >
        <form action={updateUserAction} className="grid gap-3">
          <input name="userId" type="hidden" value={user.id} />
          <RoleSelect defaultValue={user.role} />
          <label className="inline-flex min-h-9 items-center gap-2 rounded-[6px] border border-app-border bg-app-surface px-3 text-[12.5px] font-semibold text-app-muted">
            <input
              className="h-4 w-4 accent-app-accent"
              defaultChecked={user.active}
              name="active"
              type="checkbox"
            />
            Active
          </label>
          <button className="inline-flex min-h-9 items-center justify-center rounded-[6px] border border-app-accent bg-app-accent px-3 text-[12.5px] font-semibold text-white">
            Save
          </button>
        </form>
      </DropdownPanel>
    </div>
  );
}

function RecordIdentity({
  avatarName,
  avatarUrl,
  children,
  email,
  name,
}: {
  avatarName?: string;
  avatarUrl?: string | null;
  children?: React.ReactNode;
  email: string | null;
  name: string | null;
}) {
  const initials = initialsForName(avatarName ?? name ?? email ?? "User");

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-app-chip text-[11px] font-semibold uppercase text-app-muted">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            src={avatarUrl}
          />
        ) : (
          initials
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-semibold text-app-foreground">
            {name ?? email ?? "User"}
          </h3>
          {children}
        </div>
        {email && name ? (
          <p className="mt-0.5 text-[12px] leading-5 text-app-muted">{email}</p>
        ) : null}
      </div>
    </div>
  );
}

function RoleSelect({ defaultValue }: { defaultValue: AppRole }) {
  return (
    <label className="grid gap-1">
      <span className="sr-only">Role</span>
      <CustomSelect
        ariaLabel="Role"
        className="inline-flex h-9 w-full items-center justify-between gap-2 rounded-[5px] border border-app-border bg-app-surface px-3 text-[13px] text-app-foreground outline-none transition hover:border-app-border-strong focus-visible:ring-2 focus-visible:ring-app-accent/25"
        defaultValue={defaultValue}
        name="role"
        rootClassName="relative w-full"
        options={APP_ROLES.map((role) => ({
          label: formatRole(role),
          value: role,
        }))}
      />
    </label>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-app-border bg-app-background p-4 text-[13px] font-semibold text-app-muted">
      {message}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "PENDING"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : status === "APPROVED" || status === "ACTIVE"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`inline-flex rounded-[4px] border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${className}`}
    >
      {status.toLowerCase().replace(/_/g, " ")}
    </span>
  );
}

function formatRole(role: AppRole) {
  return role
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(value);
}

function initialsForName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "?";
}
