import Link from "next/link";

export function LookupPage({ kind }: { kind: "person" | "household" }) {
  const title = kind === "person" ? "Find person" : "Find household";
  const action = kind === "person" ? "/people" : "/households";
  const otherHref = kind === "person" ? "/households" : "/people";
  const otherLabel = kind === "person" ? "Household lookup" : "Person lookup";

  return (
    <main className="min-h-screen bg-app-background px-7 py-7">
      <section className="mx-auto grid max-w-[740px] gap-6">
        <div className="flex items-center gap-[10px] text-[13.5px] font-semibold text-app-foreground">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-app-foreground font-mono text-[11px] font-semibold text-app-background">
            Ab
          </span>
          Abound
          <span className="rounded-[3px] border border-app-border bg-app-chip px-[6px] py-[2px] font-mono text-[11px] font-normal text-app-muted">
            STAFF
          </span>
        </div>

        <div className="rounded-[10px] border border-app-border bg-app-surface p-6 shadow-[0_1px_2px_rgba(150,140,120,0.16)]">
          <p className="font-mono text-[11px] font-medium uppercase text-app-accent-strong">
            Lookup
          </p>
          <h1 className="mt-3 text-[40px] font-bold leading-[1.08] tracking-normal text-app-foreground">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-[13px] leading-6 text-app-muted">
            Open a synced record directly. Broad directory search is
            intentionally deferred until profile privacy rules are settled.
          </p>

          <form
            action={action}
            className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <label className="grid gap-2">
              <span className="font-mono text-[11px] font-medium uppercase text-app-muted">
                Record ID
              </span>
              <input
                className="min-h-10 rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] text-app-foreground outline-none focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
                inputMode="numeric"
                name="rockId"
                placeholder="910001"
                required
              />
            </label>
            <button className="min-h-10 self-end rounded-[6px] border border-app-accent bg-app-accent px-4 text-[13px] font-semibold text-white hover:bg-app-accent-strong focus:outline-none focus:ring-2 focus:ring-app-accent/30">
              Open record
            </button>
          </form>

          <Link
            className="mt-5 inline-flex text-[13px] font-semibold text-app-accent hover:text-app-accent-strong"
            href={otherHref}
          >
            {otherLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
