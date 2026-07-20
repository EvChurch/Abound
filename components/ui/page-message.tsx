import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

type PageMessageTone = "error" | "info" | "success" | "warning";

type PageMessageProps = {
  children: React.ReactNode;
  className?: string;
  maxWidthClassName?: string;
  tone?: PageMessageTone;
};

export function PageMessage({
  children,
  className = "",
  maxWidthClassName = "max-w-[1280px]",
  tone = "info",
}: PageMessageProps) {
  const styles = toneStyles[tone];
  const Icon = styles.icon;
  const role = tone === "error" || tone === "warning" ? "alert" : "status";

  return (
    <div className={`border-b ${styles.band} ${className}`} role={role}>
      <div
        className={`mx-auto flex w-full items-start gap-2.5 px-4 py-3 text-[13px] font-medium leading-5 sm:px-7 ${maxWidthClassName}`}
      >
        <Icon
          aria-hidden="true"
          className={`mt-0.5 size-4 shrink-0 ${styles.iconClassName}`}
        />
        <div className={styles.textClassName}>{children}</div>
      </div>
    </div>
  );
}

const toneStyles: Record<
  PageMessageTone,
  {
    band: string;
    icon: LucideIcon;
    iconClassName: string;
    textClassName: string;
  }
> = {
  error: {
    band: "border-[oklch(0.86_0.05_25)] bg-[oklch(0.965_0.035_25)]",
    icon: AlertCircle,
    iconClassName: "text-[oklch(0.46_0.14_25)]",
    textClassName: "text-[oklch(0.35_0.08_25)]",
  },
  info: {
    band: "border-[oklch(0.88_0.035_255)] bg-[oklch(0.965_0.02_255)]",
    icon: Info,
    iconClassName: "text-app-accent-strong",
    textClassName: "text-app-foreground",
  },
  success: {
    band: "border-[oklch(0.86_0.045_150)] bg-[oklch(0.965_0.035_150)]",
    icon: CheckCircle2,
    iconClassName: "text-[oklch(0.42_0.12_150)]",
    textClassName: "text-[oklch(0.32_0.07_150)]",
  },
  warning: {
    band: "border-[oklch(0.86_0.065_75)] bg-[oklch(0.965_0.045_80)]",
    icon: TriangleAlert,
    iconClassName: "text-[oklch(0.48_0.12_65)]",
    textClassName: "text-[oklch(0.34_0.06_60)]",
  },
};
