type AuthErrorPageProps = {
  searchParams: Promise<{
    reason?: string;
  }>;
};

const SAFE_REASON_LABELS: Record<string, string> = {
  AuthorizationCodeGrantRequestError:
    "Auth0 could not complete the login exchange.",
  AuthorizationError: "Auth0 returned an authorization error.",
  InvalidStateError:
    "The login session expired or does not match this browser session.",
  MissingStateError: "The login callback was missing required state.",
};

export default async function AuthErrorPage({
  searchParams,
}: AuthErrorPageProps) {
  const { reason } = await searchParams;
  const message =
    reason && SAFE_REASON_LABELS[reason]
      ? SAFE_REASON_LABELS[reason]
      : "Auth0 could not complete the login.";

  return (
    <main className="min-h-screen px-7 py-12 sm:px-12">
      <section className="grid max-w-3xl gap-5 py-8 sm:py-14">
        <p className="text-sm font-bold uppercase text-app-accent-strong">
          Authentication error
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
          Sign in could not be completed.
        </h1>
        <p className="max-w-2xl text-lg leading-7 text-app-muted">{message}</p>
        <a
          className="inline-flex min-h-11 w-fit items-center justify-center rounded-md border border-app-accent bg-app-accent px-5 font-bold text-white"
          href="/auth/login"
        >
          Try again with Auth0
        </a>
      </section>
    </main>
  );
}
