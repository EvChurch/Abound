"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type SelectOption = {
  label: string;
  value: string;
};

type CustomSelectProps = {
  ariaLabel?: string;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  menuClassName?: string;
  name?: string;
  onValueChange?: (value: string, form: HTMLFormElement | null) => void;
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
  rootClassName?: string;
  value?: string;
};

export function CustomSelect({
  ariaLabel,
  className,
  defaultValue,
  disabled = false,
  menuClassName,
  name,
  onValueChange,
  options,
  placeholder = "Select",
  rootClassName,
  value,
}: CustomSelectProps) {
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const selectedValue = value ?? internalValue;

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === selectedValue) ?? null;
  }, [options, selectedValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updateMenuPosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      setMenuPosition({
        left: rect.left,
        top: rect.bottom + 6,
        width: rect.width,
      });
    };

    updateMenuPosition();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
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
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  const buttonClassName =
    className ??
    "inline-flex h-9 min-w-[160px] items-center justify-between gap-2 rounded-[5px] border border-app-border bg-app-surface px-3 text-[13px] text-app-foreground outline-none transition hover:border-app-border-strong focus-visible:ring-2 focus-visible:ring-app-accent/25";
  const popoverClassName =
    menuClassName ??
    "fixed z-30 rounded-[8px] border border-app-border bg-app-background p-1 shadow-[0_12px_32px_rgba(35,32,28,0.14)]";

  return (
    <div className={rootClassName ?? "relative inline-block"} ref={rootRef}>
      {name ? (
        <input name={name} ref={inputRef} type="hidden" value={selectedValue} />
      ) : null}
      <button
        aria-controls={generatedId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        ref={buttonRef}
        className={buttonClassName}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate text-left">
          {selectedOption?.label ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-app-muted transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
          fill="none"
          viewBox="0 0 20 20"
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
          />
        </svg>
      </button>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open && menuPosition ? (
                <motion.div
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className={popoverClassName}
                  exit={{ opacity: 0, scale: 0.98, y: -4 }}
                  id={generatedId}
                  initial={{ opacity: 0, scale: 0.98, y: -6 }}
                  ref={menuRef}
                  style={{
                    left: `${menuPosition.left}px`,
                    minWidth: `${menuPosition.width}px`,
                    top: `${menuPosition.top}px`,
                  }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <ul role="listbox">
                    {options.map((option) => {
                      const active = option.value === selectedValue;

                      return (
                        <li key={option.value}>
                          <button
                            aria-selected={active}
                            className={
                              active
                                ? "flex w-full items-center justify-between rounded-[6px] bg-app-chip px-2.5 py-1.5 text-left text-[12.5px] font-semibold text-app-foreground"
                                : "flex w-full items-center justify-between rounded-[6px] px-2.5 py-1.5 text-left text-[12.5px] text-app-muted transition hover:bg-app-soft hover:text-app-foreground"
                            }
                            onClick={() => {
                              if (value === undefined) {
                                setInternalValue(option.value);
                              }
                              onValueChange?.(
                                option.value,
                                inputRef.current?.form ?? null,
                              );
                              setOpen(false);
                            }}
                            role="option"
                            type="button"
                          >
                            <span className="truncate">{option.label}</span>
                            {active ? (
                              <svg
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-app-accent-strong"
                                fill="none"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  d="m4.5 10 3.5 3.5 7.5-7.5"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.8"
                                />
                              </svg>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}
