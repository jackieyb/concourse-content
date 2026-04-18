"use client";

import type { FormatKey } from "@/types";
import { FORMAT_LIST } from "@/lib/formats";
import { UrgencyDot } from "@/components/urgency-dot";
import { cn } from "@/lib/utils";

export function FormatPicker({
  value,
  onChange,
}: {
  value: FormatKey;
  onChange: (f: FormatKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {FORMAT_LIST.map((f) => {
        const selected = f.key === value;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            className={cn(
              "flex flex-col items-start rounded-lg border p-3 text-left text-sm transition-colors",
              selected
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white hover:border-neutral-400",
            )}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className="font-medium">{f.label}</span>
              <UrgencyDot
                urgency={f.typicalUrgency}
                size="sm"
                title={
                  f.typicalUrgency === "red"
                    ? "Typically timely — publish within 48-72h of a news peg"
                    : "Typically evergreen — durable organic value"
                }
              />
            </span>
            <span
              className={cn(
                "mt-1 text-xs",
                selected ? "text-neutral-200" : "text-neutral-500",
              )}
            >
              {f.description}
            </span>
            <span
              className={cn(
                "mt-1 font-mono text-[10px]",
                selected ? "text-neutral-300" : "text-neutral-400",
              )}
            >
              {f.wordCountTarget[0]}–{f.wordCountTarget[1]} words
            </span>
          </button>
        );
      })}
    </div>
  );
}
