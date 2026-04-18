"use client";

import { ArrowRight } from "lucide-react";
import type { Recommendation, FormatKey } from "@/types";
import { FORMATS } from "@/lib/formats";
import { FormatIcon } from "@/components/format-icon";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function RecCard({
  rec,
  rank,
}: {
  rec: Recommendation;
  rank: number;
}) {
  const router = useRouter();

  const startDraft = () => {
    router.push(
      `/generate?seed=1&signalId=${rec.signalId}&format=${rec.format}&autogen=1`,
    );
  };

  return (
    <div
      className={cn(
        "group relative flex h-full flex-col rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md",
        "border-indigo-300 ring-2 ring-indigo-200",
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-center">
        <PickPill rank={rank} />
      </div>

      {/* Title */}
      <h3 className="text-[17px] font-semibold leading-snug text-neutral-900">
        {rec.subject}
      </h3>

      {/* Format chip + keyword */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <FormatChip format={rec.format} />
        <ArrowRight className="h-3 w-3 text-neutral-400" />
        <span className="font-medium text-indigo-700">
          {rec.primaryKeyword}
        </span>
      </div>

      {/* Why now */}
      <p className="mt-4 text-[13px] leading-relaxed text-neutral-600">
        <span className="font-semibold text-neutral-900">Why now:</span>{" "}
        {rec.rationale}
      </p>

      <div className="flex-1" />

      {/* CTA */}
      <button
        onClick={startDraft}
        className={cn(
          "mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
          "bg-indigo-600 text-white hover:bg-indigo-700",
        )}
      >
        Generate this post <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function PickPill({ rank }: { rank: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
      #{rank} Pick
    </span>
  );
}

function FormatChip({ format }: { format: FormatKey }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-xs text-neutral-700">
      <FormatIcon format={format} className="h-3.5 w-3.5" />
      {FORMATS[format].label}
    </span>
  );
}
