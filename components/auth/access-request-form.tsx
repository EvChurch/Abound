import { submitAccessRequest } from "@/app/access-request/actions";

export function AccessRequestForm() {
  return (
    <form action={submitAccessRequest}>
      <button
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-app-accent bg-app-accent px-5 font-bold text-white"
        type="submit"
      >
        Request access
      </button>
    </form>
  );
}
