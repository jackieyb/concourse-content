import type { FormatKey } from "@/types";
import {
  Wrench,
  List,
  ClipboardCheck,
  BookOpen,
  Newspaper,
  GitCompare,
  Target,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<FormatKey, LucideIcon> = {
  "how-to": Wrench,
  listicle: List,
  "case-study": ClipboardCheck,
  "pillar-post": BookOpen,
  "trend-piece": Newspaper,
  comparison: GitCompare,
  "thought-leadership": Target,
  faq: HelpCircle,
};

export function FormatIcon({
  format,
  className,
}: {
  format: FormatKey;
  className?: string;
}) {
  const Icon = ICONS[format];
  return <Icon className={className} aria-hidden />;
}
