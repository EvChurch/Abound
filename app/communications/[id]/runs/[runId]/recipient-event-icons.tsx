import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock3,
  Eye,
  MailCheck,
  MailX,
  MousePointerClick,
  Send,
  ShieldAlert,
} from "lucide-react";

export function RecipientEventIcon({
  className = "size-4",
  eventType,
}: {
  className?: string;
  eventType: string;
}) {
  switch (eventType) {
    case "BOUNCED":
      return <MailX aria-hidden="true" className={className} />;
    case "CLICKED":
      return <MousePointerClick aria-hidden="true" className={className} />;
    case "COMPLAINED":
      return <ShieldAlert aria-hidden="true" className={className} />;
    case "DELAYED":
    case "SCHEDULED":
      return <Clock3 aria-hidden="true" className={className} />;
    case "DELIVERED":
      return <CheckCircle2 aria-hidden="true" className={className} />;
    case "FAILED":
      return <AlertTriangle aria-hidden="true" className={className} />;
    case "OPENED":
      return <Eye aria-hidden="true" className={className} />;
    case "PROVIDER_ACCEPTED":
      return <Send aria-hidden="true" className={className} />;
    case "SUPPRESSED":
      return <Ban aria-hidden="true" className={className} />;
    default:
      return <MailCheck aria-hidden="true" className={className} />;
  }
}

export function recipientEventToneClass(eventType: string) {
  if (["BOUNCED", "COMPLAINED", "FAILED", "SUPPRESSED"].includes(eventType)) {
    return "bg-red-50 text-red-700";
  }

  if (eventType === "DELAYED") {
    return "bg-amber-50 text-amber-700";
  }

  if (["OPENED", "CLICKED"].includes(eventType)) {
    return "bg-blue-50 text-blue-700";
  }

  return "bg-emerald-50 text-emerald-700";
}
