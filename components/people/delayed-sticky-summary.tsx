"use client";

import { useEffect, useState } from "react";

type DelayedStickySummaryProps = {
  children: React.ReactNode;
  observeId: string;
  topOffset?: number;
};

export function DelayedStickySummary({
  children,
  observeId,
  topOffset = 43,
}: DelayedStickySummaryProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observedElement = document.getElementById(observeId);

    if (!observedElement) {
      return;
    }
    const target = observedElement;

    function updateVisibility() {
      setVisible(target.getBoundingClientRect().bottom <= topOffset);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, [observeId, topOffset]);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 top-12 z-20 border-b border-app-border bg-[oklch(0.99_0.003_75_/_0.94)] backdrop-blur-md transition-transform duration-150 [backdrop-filter:saturate(1.35)_blur(8px)] ${
        visible ? "translate-y-0" : "pointer-events-none -translate-y-full"
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-7">{children}</div>
    </div>
  );
}
