import type { FormatKey } from "@/types";
import { FORMATS } from "@/lib/formats";
import { cn } from "@/lib/utils";

const COLORS: Record<FormatKey, string> = {
  "how-to": "bg-blue-50 text-blue-700 ring-blue-200",
  listicle: "bg-violet-50 text-violet-700 ring-violet-200",
  "case-study": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "pillar-post": "bg-neutral-900 text-white ring-neutral-900",
  "trend-piece": "bg-red-50 text-red-700 ring-red-200",
  comparison: "bg-sky-50 text-sky-700 ring-sky-200",
  "thought-leadership": "bg-amber-50 text-amber-800 ring-amber-200",
  faq: "bg-teal-50 text-teal-700 ring-teal-200",
};

export function FormatBadge({ format, className }: { format: FormatKey; className?: string }) {
  const f = FORMATS[format];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        COLORS[format],
        className,
      )}
    >
      {f.label}
    </span>
  );
}
