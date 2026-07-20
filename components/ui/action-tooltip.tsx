"use client";

import type { ReactNode } from "react";
import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ActionTooltipProps = {
  children: ReactNode;
  label: string;
};

export function ActionTooltip({ children, label }: ActionTooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number }>();
  function showTooltip() {
    const rect = triggerRef.current?.getBoundingClientRect();

    if (rect) {
      setPosition({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 8,
      });
    }

    setOpen(true);
  }

  const tooltip =
    open && position ? (
      <span
        className="pointer-events-none fixed z-50 -translate-x-1/2 whitespace-nowrap rounded-[6px] border border-app-border bg-app-surface px-2 py-1 text-[11px] font-semibold text-app-muted shadow-[0_10px_24px_rgba(35,32,28,0.14)] before:absolute before:left-1/2 before:top-0 before:size-2 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:border-l before:border-t before:border-app-border before:bg-app-surface before:content-['']"
        id={id}
        role="tooltip"
        style={position}
      >
        {label}
      </span>
    ) : null;

  return (
    <span
      aria-describedby={open ? id : undefined}
      className="inline-flex"
      onBlur={() => setOpen(false)}
      onFocus={showTooltip}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setOpen(false)}
      ref={triggerRef}
    >
      {children}
      {tooltip && typeof document !== "undefined"
        ? createPortal(tooltip, document.body)
        : null}
    </span>
  );
}
