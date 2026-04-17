import { submitAccessRequest } from "@/app/access-request/actions";

type AccessRequestFormProps = {
  email?: string | null;
};

export function AccessRequestForm({ email }: AccessRequestFormProps) {
  return (
    <form action={submitAccessRequest} className="grid max-w-xl gap-4">
      {email ? (
        <p className="rounded-md border border-slate-300 bg-white p-4 text-sm text-app-muted">
          Requesting access for <strong>{email}</strong>.
        </p>
      ) : null}
      <button
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-app-accent bg-app-accent px-5 font-bold text-white"
        type="submit"
      >
        Request access
      </button>
    </form>
  );
}
