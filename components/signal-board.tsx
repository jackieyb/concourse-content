"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Signal, SignalCategory } from "@/types";
import { formatRelative } from "@/lib/utils";
import { FORMATS } from "@/lib/formats";
import { FormatIcon } from "@/components/format-icon";
import { suggestFromSignal } from "@/lib/recommend";
import { ArrowRight, ExternalLink, Newspaper } from "lucide-react";

type FilterKey = "all" | SignalCategory;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All signals" },
  { key: "trending-topic", label: "Trending" },
  { key: "industry-news", label: "Industry" },
  { key: "enterprise-fintech", label: "Fintech" },
  { key: "competitor-content", label: "Competitor" },
];

const CATEGORY_META: Record<
  SignalCategory,
  { label: string; pill: string; dot: string }
> = {
  "trending-topic": {
    label: "Trending",
    pill: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  "industry-news": {
    label: "Industry news",
    pill: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  "enterprise-fintech": {
    label: "Fintech",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  "competitor-content": {
    label: "Competitor",
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
};

export function SignalBoard({
  signals,
  weekOf,
}: {
  signals: Signal[];
  weekOf: string;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const sorted = useMemo(
    () =>
      [...signals].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime(),
      ),
    [signals],
  );

  const visible = useMemo(
    () => (filter === "all" ? sorted : sorted.filter((s) => s.category === filter)),
    [sorted, filter],
  );

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: sorted.length,
      "trending-topic": 0,
      "industry-news": 0,
      "enterprise-fintech": 0,
      "competitor-content": 0,
    };
    for (const s of sorted) c[s.category] += 1;
    return c;
  }, [sorted]);

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-neutral-600" />
            <h2 className="text-base font-semibold text-neutral-900">
              This week&rsquo;s signals
            </h2>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Week of{" "}
            {new Date(weekOf).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {signals.length} items captured, sorted most recent first
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter;
          const count = counts[f.key];
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
                (active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900")
              }
            >
              {f.label}
              <span
                className={
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold " +
                  (active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500")
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          No signals in this category this week.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((s) => (
            <li key={s.id}>
              <SignalCard signal={s} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const meta = CATEGORY_META[signal.category];
  const suggestion = suggestFromSignal(signal);
  const formatMeta = FORMATS[suggestion.format];

  return (
    <div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium " +
            meta.pill
          }
        >
          <span className={"h-1.5 w-1.5 rounded-full " + meta.dot} />
          {meta.label}
        </span>
        <span className="text-[11px] text-neutral-400">
          {signal.source} · {formatRelative(signal.publishedAt)}
        </span>
      </div>

      {signal.url ? (
        <a
          href={signal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-start gap-1 text-[15px] font-semibold leading-snug text-neutral-900 hover:text-indigo-700"
        >
          <span>{signal.headline}</span>
          <ExternalLink className="mt-1 h-3 w-3 flex-none text-neutral-300 transition-colors group-hover:text-indigo-600" />
        </a>
      ) : (
        <h3 className="text-[15px] font-semibold leading-snug text-neutral-900">
          {signal.headline}
        </h3>
      )}

      <p className="mt-2 line-clamp-2 text-[13px] text-neutral-600">
        {signal.summary}
      </p>

      <div className="my-3 border-t border-dashed border-neutral-200" />

      <div className="space-y-2 text-[12px] text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-700">
            <FormatIcon format={suggestion.format} className="h-3 w-3" />
            {formatMeta.label}
          </span>
          <ArrowRight className="h-3 w-3 text-neutral-400" />
          <span className="truncate text-[11px] font-medium text-indigo-700">
            {suggestion.primaryKeyword}
          </span>
        </div>
        <p className="leading-relaxed">
          <span className="font-semibold text-neutral-900">Angle:</span>{" "}
          {suggestion.angle}
        </p>
        <p className="leading-relaxed">
          <span className="font-semibold text-neutral-900">Why it matters:</span>{" "}
          {suggestion.whyItMatters}
        </p>
      </div>

      <div className="flex-1" />

      <Link
        href={`/generate?seed=1&signalId=${signal.id}&format=${suggestion.format}`}
        className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
      >
        Write about this <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
