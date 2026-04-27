"use client";

import { useEffect } from "react";
import { toast } from "sonner";

type QueryResultToastProps = {
  clearHref: string;
  messages: string[];
  tone?: "error" | "success";
};

export function QueryResultToast({
  clearHref,
  messages,
  tone = "success",
}: QueryResultToastProps) {
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    for (const message of messages) {
      if (tone === "error") {
        toast.error(message);
        continue;
      }

      toast.success(message);
    }

    window.history.replaceState({}, "", clearHref);
  }, [clearHref, messages, tone]);

  return null;
}
