"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

export type FilterAccordionItem = {
  children: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  id: string;
  title: string;
};

export function FilterAccordion({ items }: { items: FilterAccordionItem[] }) {
  const initialOpenId =
    items.find((item) => item.defaultOpen)?.id ?? items[0]?.id ?? null;
  const [openId, setOpenId] = useState<string | null>(initialOpenId);

  return (
    <div className="overflow-hidden rounded-[7px] border border-app-border bg-app-surface shadow-[0_1px_1px_rgba(20,18,14,0.03)]">
      {items.map((item, index) => {
        const open = openId === item.id;
        const panelId = `filter-panel-${item.id}`;

        return (
          <section
            className={index > 0 ? "border-t border-app-border" : undefined}
            key={item.id}
          >
            <button
              aria-controls={panelId}
              aria-expanded={open}
              className="flex min-h-10 w-full items-center justify-between gap-3 px-3 text-left text-[13px] font-semibold text-app-foreground outline-none hover:bg-app-chip/70 focus-visible:ring-2 focus-visible:ring-app-accent/25"
              onClick={() => setOpenId(open ? null : item.id)}
              type="button"
            >
              <span>{item.title}</span>
              <span className="inline-flex items-center gap-2">
                {item.count && item.count > 0 ? (
                  <span className="rounded-full bg-app-chip px-2 py-0.5 text-[11px] font-semibold text-app-muted">
                    {item.count}
                  </span>
                ) : null}
                <ChevronRight
                  aria-hidden="true"
                  className={`h-3.5 w-3.5 text-app-muted transition-transform ${
                    open ? "rotate-90" : ""
                  }`}
                  strokeWidth={2.4}
                />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open ? (
                <motion.div
                  animate={{ height: "auto", opacity: 1 }}
                  className="overflow-hidden border-t border-app-border"
                  exit={{ height: 0, opacity: 0 }}
                  id={panelId}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{
                    duration: 0.18,
                    ease: [0.2, 0.8, 0.2, 1],
                  }}
                >
                  <div className="grid gap-3 px-3 py-3">{item.children}</div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
