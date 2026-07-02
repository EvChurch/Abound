"use client";

import Link from "next/link";

import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type DropdownPanelProps = {
  align?: "left" | "right";
  panelClassName?: string;
  openOnHover?: boolean;
  portal?: boolean;
  side?: "bottom" | "left";
  navigateHref?: string;
  navigateLabel?: string;
  trigger: ReactNode;
  triggerClassName?: string;
  widthClassName?: string;
  wrapperClassName?: string;
  children: ReactNode;
};

export function DropdownPanel({
  align = "left",
  children,
  navigateHref,
  navigateLabel,
  openOnHover = false,
  panelClassName,
  portal = false,
  side = "bottom",
  trigger,
  triggerClassName,
  widthClassName,
  wrapperClassName,
}: DropdownPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [open, setOpen] = useState(false);
  const [portalStyle, setPortalStyle] = useState<CSSProperties | null>(null);
  const [prefersHoverNav, setPrefersHoverNav] = useState(
    Boolean(navigateHref && navigateLabel && openOnHover),
  );

  useEffect(() => {
    return () => {
      if (hoverCloseTimeoutRef.current) {
        clearTimeout(hoverCloseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
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

  useEffect(() => {
    if (!open || !portal) {
      return;
    }

    const updatePortalStyle = () => {
      const rect = rootRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setPortalStyle(portalPanelStyle({ align, rect, side }));
    };

    updatePortalStyle();
    window.addEventListener("resize", updatePortalStyle);
    window.addEventListener("scroll", updatePortalStyle, true);

    return () => {
      window.removeEventListener("resize", updatePortalStyle);
      window.removeEventListener("scroll", updatePortalStyle, true);
    };
  }, [align, open, portal, side]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updatePreference = () => {
      setPrefersHoverNav(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  const resolvedTriggerClassName =
    triggerClassName ??
    "inline-flex min-h-10 items-center rounded-[6px] border border-app-border bg-app-background px-3 text-[13px] font-semibold text-app-foreground shadow-[0_1px_1px_rgba(20,18,14,0.03)] transition hover:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/25";
  const resolvedPanelClassName =
    panelClassName ??
    "rounded-[8px] border border-app-border bg-app-surface p-4 shadow-[0_20px_40px_rgba(35,31,24,0.14)]";
  const resolvedWidthClassName = widthClassName ?? "";
  const canNavigateWithPrimaryTrigger = Boolean(
    navigateHref && navigateLabel && prefersHoverNav,
  );
  const openPanel = () => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }

    setOpen(true);
  };
  const closePanel = () => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
    }

    hoverCloseTimeoutRef.current = setTimeout(
      () => {
        setOpen(false);
      },
      portal ? 90 : 0,
    );
  };
  const panel = open ? (
    <motion.div
      animate={portal ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      className={`${portal ? "fixed" : "absolute"} z-40 ${
        portal ? "" : dropdownPanelPosition({ align, side })
      } ${resolvedWidthClassName}`}
      exit={portal ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -4 }}
      initial={portal ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -6 }}
      onMouseEnter={() => {
        if (openOnHover) {
          openPanel();
        }
      }}
      onMouseLeave={() => {
        if (openOnHover) {
          closePanel();
        }
      }}
      ref={panelRef}
      style={portal ? (portalStyle ?? undefined) : undefined}
      transition={{ duration: 0.16, ease: "easeOut" }}
    >
      <div className={resolvedPanelClassName}>{children}</div>
    </motion.div>
  ) : null;

  return (
    <div
      className={wrapperClassName ?? "relative"}
      onMouseEnter={() => {
        if (openOnHover) {
          openPanel();
        }
      }}
      onMouseLeave={() => {
        if (openOnHover) {
          closePanel();
        }
      }}
      ref={rootRef}
    >
      {canNavigateWithPrimaryTrigger ? (
        <Link
          className={resolvedTriggerClassName}
          href={navigateHref!}
          onMouseEnter={() => {
            if (openOnHover) {
              openPanel();
            }
          }}
          onMouseLeave={() => {
            if (openOnHover) {
              closePanel();
            }
          }}
          onPointerEnter={() => {
            if (openOnHover) {
              openPanel();
            }
          }}
          onPointerLeave={() => {
            if (openOnHover) {
              closePanel();
            }
          }}
        >
          {trigger}
        </Link>
      ) : (
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          className={resolvedTriggerClassName}
          onClick={() => setOpen((current) => !current)}
          onMouseEnter={() => {
            if (openOnHover) {
              openPanel();
            }
          }}
          onMouseLeave={() => {
            if (openOnHover) {
              closePanel();
            }
          }}
          onPointerEnter={() => {
            if (openOnHover) {
              openPanel();
            }
          }}
          onPointerLeave={() => {
            if (openOnHover) {
              closePanel();
            }
          }}
          type="button"
        >
          {trigger}
        </button>
      )}
      {portal && typeof document !== "undefined" ? (
        createPortal(<AnimatePresence>{panel}</AnimatePresence>, document.body)
      ) : (
        <AnimatePresence>{panel}</AnimatePresence>
      )}
    </div>
  );
}

function dropdownPanelPosition({
  align,
  side,
}: {
  align: NonNullable<DropdownPanelProps["align"]>;
  side: NonNullable<DropdownPanelProps["side"]>;
}) {
  if (side === "left") {
    return "right-[calc(100%+8px)] top-1/2 -translate-y-1/2";
  }

  return `top-[calc(100%+8px)] ${align === "right" ? "right-0" : "left-0"}`;
}

function portalPanelStyle({
  align,
  rect,
  side,
}: {
  align: NonNullable<DropdownPanelProps["align"]>;
  rect: DOMRect;
  side: NonNullable<DropdownPanelProps["side"]>;
}): CSSProperties {
  if (side === "left") {
    return {
      left: rect.left - 8,
      top: rect.top + rect.height / 2,
      transform: "translate(-100%, -50%)",
    };
  }

  return {
    left: align === "right" ? rect.right : rect.left,
    top: rect.bottom + 8,
    transform: align === "right" ? "translateX(-100%)" : undefined,
  };
}
