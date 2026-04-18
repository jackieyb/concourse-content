"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Signal, SignalCategory, SignalStream } from "@/types";
import { formatRelative } from "@/lib/utils";
import { FORMATS } from "@/lib/formats";
import { FormatIcon } from "@/components/format-icon";
import { suggestFromSignal } from "@/lib/recommend";
import { ArrowRight, ExternalLink, Globe, MessagesSquare, Package } from "lucide-react";

const STREAM_META: Record<
  SignalStream,
  {
    label: string;
    hint: string;
    icon: typeof Globe;
    activeClass: string;
    inactiveClass: string;
  }
> = {
  external: {
    label: "Market",
    hint: "What the industry is publishing",
    icon: Globe,
    activeClass: "border-indigo-600 bg-indigo-600 text-white",
    inactiveClass: "border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900",
  },
  customer: {
    label: "Customer",
    hint: "What sales and CS are hearing",
    icon: MessagesSquare,
    activeClass: "border-emerald-600 bg-emerald-600 text-white",
    inactiveClass: "border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900",
  },
  product: {
    label: "Product",
    hint: "What Concourse is shipping",
    icon: Package,
    activeClass: "border-violet-600 bg-violet-600 text-white",
    inactiveClass: "border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900",
  },
};

const STREAM_ORDER: SignalStream[] = ["external", "customer", "product"];

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
  "customer-pain": {
    label: "Customer pain",
    pill: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
  },
  "customer-win": {
    label: "Customer win",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  "sales-objection": {
    label: "Sales objection",
    pill: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
  "product-launch": {
    label: "Launch",
    pill: "border-violet-200 bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
  },
  "product-integration": {
    label: "Integration",
    pill: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    dot: "bg-fuchsia-500",
  },
  "product-milestone": {
    label: "Milestone",
    pill: "border-indigo-200 bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
  },
};

export type SignalsSource = {
  external: "exa" | "seed";
  customer: "seed";
  product: "seed";
};

export function SignalBoard({
  signals,
  weekOf,
  source,
}: {
  signals: Signal[];
  weekOf: string;
  source?: SignalsSource;
}) {
  const [activeStream, setActiveStream] = useState<SignalStream>("external");

  const byStream = useMemo(() => {
    const m: Record<SignalStream, Signal[]> = {
      external: [],
      customer: [],
      product: [],
    };
    for (const s of signals) {
      if (m[s.stream]) m[s.stream].push(s);
    }
    for (const k of Object.keys(m) as SignalStream[]) {
      m[k].sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime(),
      );
    }
    return m;
  }, [signals]);

  const visible = byStream[activeStream];
  const meta = STREAM_META[activeStream];

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            This week&rsquo;s signals
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Week of{" "}
            {new Date(weekOf).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            Three streams feeding the recommendation engine
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {STREAM_ORDER.map((key) => {
          const s = STREAM_META[key];
          const active = key === activeStream;
          const count = byStream[key].length;
          const Icon = s.icon;
          const sourceLabel = source?.[key];
          return (
            <button
              key={key}
              onClick={() => setActiveStream(key)}
              className={
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors " +
                (active ? s.activeClass : s.inactiveClass)
              }
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="flex flex-col">
                  <span className="font-semibold">{s.label}</span>
                  <span
                    className={
                      "text-[11px] " +
                      (active ? "text-white/80" : "text-neutral-500")
                    }
                  >
                    {s.hint}
                    {key === "external" && sourceLabel ? (
                      <>
                        {" · "}
                        <span className="font-medium">
                          {sourceLabel === "exa" ? "live via Exa" : "seeded"}
                        </span>
                      </>
                    ) : null}
                  </span>
                </span>
              </span>
              <span
                className={
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold " +
                  (active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600")
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 text-xs text-neutral-500">
        <span className="font-medium text-neutral-700">{meta.label}:</span>{" "}
        {meta.hint.toLowerCase()}.
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
          No {meta.label.toLowerCase()} signals this week.
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

      <p className="mt-2 line-clamp-3 text-[13px] text-neutral-600">
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
