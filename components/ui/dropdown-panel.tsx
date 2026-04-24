"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type DropdownPanelProps = {
  align?: "left" | "right";
  panelClassName?: string;
  openOnHover?: boolean;
  trigger: ReactNode;
  triggerClassName?: string;
  widthClassName?: string;
  children: ReactNode;
};

export function DropdownPanel({
  align = "left",
  children,
  openOnHover = false,
  panelClassName,
  trigger,
  triggerClassName,
  widthClassName,
}: DropdownPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const resolvedTriggerClassName =
    triggerClassName ??
    "inline-flex min-h-10 items-center rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] font-semibold text-app-foreground shadow-[0_1px_1px_rgba(20,18,14,0.03)] transition hover:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/25";
  const resolvedPanelClassName =
    panelClassName ??
    "rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_20px_40px_rgba(35,31,24,0.14)]";
  const resolvedWidthClassName = widthClassName ?? "";

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (openOnHover) {
          setOpen(true);
        }
      }}
      onMouseLeave={() => {
        if (openOnHover) {
          setOpen(false);
        }
      }}
      ref={rootRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        className={resolvedTriggerClassName}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {trigger}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`absolute top-[calc(100%+8px)] z-40 ${align === "right" ? "right-0" : "left-0"} ${resolvedWidthClassName}`}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className={resolvedPanelClassName}>{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
