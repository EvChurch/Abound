"use client";

import { AnimatePresence, motion } from "motion/react";
import { Columns3 } from "lucide-react";
import { useState, type ReactNode } from "react";

export function ColumnsMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-controls="columns-menu-panel"
        aria-expanded={open}
        aria-label="Display columns"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[6px] border border-app-border bg-app-surface text-app-foreground hover:border-app-accent hover:bg-app-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/25"
        onClick={() => setOpen((current) => !current)}
        title="Display columns"
        type="button"
      >
        <Columns3
          aria-hidden="true"
          className="h-4 w-4"
          strokeWidth={2.4}
        />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="absolute right-0 top-11 z-30 w-56 origin-top-right overflow-hidden rounded-[7px] border border-app-border bg-app-surface p-2 shadow-[0_10px_24px_rgba(20,18,14,0.14)]"
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            id="columns-menu-panel"
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{
              duration: 0.16,
              ease: [0.2, 0.8, 0.2, 1],
            }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
