type RoadmapItem = {
  date: string;
  description: string;
  title: string;
};

const roadmapItems: RoadmapItem[] = [
  {
    date: "Now",
    description:
      "Make saved segments, exclusions, stale data, and contact quality easy to trust before any campaign runs.",
    title: "Audience Quality",
  },
  {
    date: "Now",
    description:
      "Build drip campaigns and event-based emails that can use safe context from the triggering event.",
    title: "Communication Journeys",
  },
  {
    date: "Next",
    description:
      "Show what each person or household has received, skipped, opened, or been excluded from.",
    title: "Communication History",
  },
  {
    date: "Next",
    description:
      "Find missed communication opportunities, under-served segments, and follow-up gaps.",
    title: "Opportunity Insights",
  },
  {
    date: "Later",
    description:
      "Give administrators and agents safe reporting and information collection tools through MCP.",
    title: "Admin MCP Reporting",
  },
  {
    date: "Later",
    description:
      "Use credible church giving research to shape communication ideas and generosity strategy.",
    title: "Research-Informed Strategy",
  },
];

export function RoadmapWorkspace() {
  return (
    <section className="min-h-[calc(100vh-3rem)] bg-app-background px-5 py-16 text-app-foreground sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-5xl gap-16">
        <header className="mx-auto grid max-w-3xl gap-6 text-center">
          <h1 className="text-[44px] font-bold leading-none tracking-normal sm:text-[56px]">
            Roadmap
          </h1>
          <p className="text-[19px] leading-8 text-app-muted sm:text-[22px]">
            What we are building next, in the simplest possible shape.
          </p>
        </header>

        <ol className="relative grid gap-14 pl-7 sm:gap-16 sm:pl-9">
          <span
            aria-hidden
            className="absolute bottom-[7px] left-0 top-[7px] w-px bg-app-accent/35"
          />
          {roadmapItems.map((item, index) => (
            <li
              className="relative grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-8"
              key={item.title}
            >
              <span
                aria-hidden
                className={`absolute -left-[34px] top-2 h-3.5 w-3.5 rounded-full border border-app-accent ${
                  index < 2
                    ? "bg-app-accent shadow-[0_0_18px_oklch(0.48_0.09_255_/_0.35)]"
                    : "bg-app-background"
                } sm:-left-[42px]`}
              />
              <div className="grid gap-2">
                <h2 className="text-[28px] font-medium leading-tight tracking-normal text-app-foreground sm:text-[32px]">
                  {item.title}
                </h2>
                <p className="max-w-3xl text-[17px] leading-7 text-app-muted sm:text-[19px]">
                  {item.description}
                </p>
              </div>
              <p className="pt-1 text-left text-[18px] leading-7 text-app-faint sm:text-right sm:text-[20px]">
                {item.date}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
