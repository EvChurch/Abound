import Link from "next/link";

type AppTopNavProps = {
  active: "dashboard" | "households" | "people" | "sync";
};

const links: Array<{
  active: AppTopNavProps["active"];
  href: string;
  label: string;
}> = [
  { active: "dashboard", href: "/", label: "Dashboard" },
  { active: "people", href: "/people", label: "People" },
  { active: "households", href: "/households", label: "Households" },
  { active: "sync", href: "/sync", label: "Sync" },
];

export function AppTopNav({ active }: AppTopNavProps) {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 h-12 border-b border-app-border bg-[oklch(0.99_0.003_75_/_0.92)] backdrop-blur-md [backdrop-filter:saturate(1.4)_blur(8px)]">
        <div className="mx-auto flex h-full max-w-[1280px] flex-wrap items-center gap-5 px-7">
          <Link
            className="flex items-center gap-[10px] text-[13.5px] font-semibold text-app-foreground"
            href="/"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-app-foreground font-mono text-[11px] font-semibold text-app-background">
              Ab
            </span>
            <span>Abound</span>
          </Link>
          <nav
            aria-label="Primary"
            className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[12.5px]"
          >
            {links.map((link) => {
              const current = link.active === active;

              return (
                <Link
                  aria-current={current ? "page" : undefined}
                  className={
                    current
                      ? "inline-flex h-8 items-center rounded-[6px] bg-app-chip px-3 font-semibold text-app-foreground"
                      : "inline-flex h-8 items-center rounded-[6px] px-3 font-semibold text-app-muted hover:bg-app-chip hover:text-app-foreground focus:outline-none focus:ring-2 focus:ring-app-accent/25"
                  }
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div aria-hidden="true" className="h-12" />
    </>
  );
}
