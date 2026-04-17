import { redirect } from "next/navigation";

import { auth0 } from "@/lib/auth/auth0";
import { getCurrentAccessState } from "@/lib/auth/access-control";

export default async function AccessRequestSubmittedPage() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    redirect("/auth/login");
  }

  if (accessState.status === "authorized") {
    redirect("/");
  }

  return (
    <main className="min-h-screen px-7 py-12 sm:px-12">
      <section className="grid max-w-3xl gap-5 py-8 sm:py-14">
        <p className="text-sm font-bold uppercase text-app-accent-strong">
          Access request
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
          Your access request is ready for administrator review.
        </h1>
        <p className="max-w-2xl text-lg leading-7 text-app-muted">
          If you just submitted the form, the request has been recorded. An
          administrator can enable your local app profile and role before you
          continue.
        </p>
      </section>
    </main>
  );
}
