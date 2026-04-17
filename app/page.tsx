import Link from "next/link";

import { auth0 } from "@/lib/auth/auth0";
import { getCurrentAccessState } from "@/lib/auth/access-control";

export default async function HomePage() {
  const session = await auth0.getSession();
  const accessState = await getCurrentAccessState(session?.user);

  if (accessState.status === "anonymous") {
    return (
      <main className="min-h-screen px-7 py-12 sm:px-12">
        <section className="grid max-w-3xl gap-5 py-8 sm:py-14">
          <p className="text-sm font-bold uppercase text-app-accent-strong">
            Giving Management
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
            Staff tools for clear, careful giving work.
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-app-muted">
            Sign in with Auth0 to continue. Access is granted from local app
            roles, not from Rock user sync.
          </p>
          <a
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-app-accent bg-app-accent px-5 font-bold text-white"
            href="/auth/login"
          >
            Sign in
          </a>
        </section>
      </main>
    );
  }

  if (accessState.status === "needs_access") {
    return (
      <main className="min-h-screen px-7 py-12 sm:px-12">
        <section className="grid max-w-3xl gap-5 py-8 sm:py-14">
          <p className="text-sm font-bold uppercase text-app-accent-strong">
            Access needed
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
            You need administrator approval to continue.
          </h1>
          <p className="max-w-2xl text-lg leading-7 text-app-muted">
            Your Auth0 login worked, but this app requires a local user profile
            and role before staff data is visible.
          </p>
          <Link
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-app-accent bg-app-accent px-5 font-bold text-white"
            href="/access-request"
          >
            Request access
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-7 py-12 sm:px-12">
      <section className="grid max-w-3xl gap-5 py-8 sm:py-14">
        <p className="text-sm font-bold uppercase text-app-accent-strong">
          Giving Management
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
          Welcome back.
        </h1>
        <p className="max-w-2xl text-lg leading-7 text-app-muted">
          Role: <strong>{accessState.user.role}</strong>
        </p>
      </section>
    </main>
  );
}
