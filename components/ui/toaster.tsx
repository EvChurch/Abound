"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      closeButton
      duration={3200}
      position="bottom-right"
      richColors
      toastOptions={{
        classNames: {
          description: "text-[12px]",
          title: "text-[13px] font-semibold",
          toast:
            "border border-app-border bg-app-surface text-app-foreground shadow-[0_12px_32px_rgba(20,24,32,0.16)]",
        },
      }}
    />
  );
}
