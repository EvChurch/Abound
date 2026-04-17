export default function AccessRequestSubmittedPage() {
  return (
    <main className="min-h-screen px-7 py-12 sm:px-12">
      <section className="grid max-w-3xl gap-5 py-8 sm:py-14">
        <p className="text-sm font-bold uppercase text-app-accent-strong">
          Request saved
        </p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
          Your access request has been recorded.
        </h1>
        <p className="max-w-2xl text-lg leading-7 text-app-muted">
          An administrator can enable your local app profile and role before you
          continue.
        </p>
      </section>
    </main>
  );
}
