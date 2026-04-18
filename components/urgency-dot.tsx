import type { Urgency } from "@/types";
import { cn } from "@/lib/utils";

export function UrgencyDot({
  urgency,
  size = "md",
  title,
}: {
  urgency: Urgency;
  size?: "sm" | "md";
  title?: string;
}) {
  const color =
    urgency === "red" ? "bg-red-500 shadow-red-500/50" : "bg-amber-400 shadow-amber-400/50";
  const dim = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  return (
    <span
      className={cn("relative inline-flex", dim)}
      title={title ?? (urgency === "red" ? "Timely — publish within 48-72h" : "Evergreen — durable traffic play")}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full opacity-60 pulse-dot",
          color,
        )}
      />
      <span className={cn("relative rounded-full", dim, color)} />
    </span>
  );
}

export function UrgencyLabel({ urgency }: { urgency: Urgency }) {
  return urgency === "red" ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
      <UrgencyDot urgency="red" size="sm" /> Timely
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
      <UrgencyDot urgency="yellow" size="sm" /> Evergreen
    </span>
  );
}
