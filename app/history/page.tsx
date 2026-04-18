"use client";

import { useMemo, useState } from "react";
import type { FormatKey, Publication } from "@/types";
import { FORMATS } from "@/lib/formats";
import { FormatBadge } from "@/components/format-badge";
import { UrgencyLabel } from "@/components/urgency-dot";
import { useAppStore } from "@/lib/store";
import { formatDate, cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown, Info } from "lucide-react";
import { scorePublication, scoreBand } from "@/lib/seo-aeo-score";

type SortKey = "publishedAt" | "seo" | "aeo";
type SortDir = "asc" | "desc";

type Row = {
  pub: Publication;
  score: ReturnType<typeof scorePublication>;
};

export default function HistoryPage() {
  const publications = useAppStore((s) => s.publications);
  const [filter, setFilter] = useState<FormatKey | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("publishedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const scored: Row[] = useMemo(
    () =>
      publications.map((pub) => ({
        pub,
        score: scorePublication(pub),
      })),
    [publications],
  );

  const filtered = useMemo(() => {
    const rows = scored.filter(
      (r) => filter === "all" || r.pub.format === filter,
    );
    const factor = sortDir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      if (sortKey === "publishedAt") {
        return (
          factor *
          (new Date(a.pub.publishedAt).getTime() -
            new Date(b.pub.publishedAt).getTime())
        );
      }
      if (sortKey === "seo") return factor * (a.score.seo - b.score.seo);
      return factor * (a.score.aeo - b.score.aeo);
    });
  }, [scored, filter, sortKey, sortDir]);

  const stats = useMemo(() => {
    const last7Days = scored.filter(
      (r) =>
        Date.now() - new Date(r.pub.publishedAt).getTime() <
        7 * 24 * 3600 * 1000,
    ).length;
    const seoAvg = scored.length
      ? Math.round(scored.reduce((a, r) => a + r.score.seo, 0) / scored.length)
      : 0;
    const aeoAvg = scored.length
      ? Math.round(scored.reduce((a, r) => a + r.score.aeo, 0) / scored.length)
      : 0;
    return { last7Days, seoAvg, aeoAvg };
  }, [scored]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Published content
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          Every piece the team has shipped
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Each piece is graded on predicted SEO and AEO readiness — derived from
          title, meta, keyword placement, TL;DR structure, FAQ schema, and
          sentence style. Scores are heuristic, not real SERP rank.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Total published" value={String(publications.length)} />
        <StatCard label="Last 7 days" value={String(stats.last7Days)} />
        <StatCard
          label="Avg SEO score"
          value={`${stats.seoAvg}`}
          hint="out of 100"
        />
        <StatCard
          label="Avg AEO score"
          value={`${stats.aeoAvg}`}
          hint="LLM citability"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <span className="text-xs text-neutral-500">Filter format:</span>
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            filter === "all"
              ? "bg-neutral-900 text-white"
              : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100",
          )}
        >
          All
        </button>
        {Object.values(FORMATS).map((f) => {
          const count = publications.filter((p) => p.format === f.key).length;
          if (count === 0) return null;
          const selected = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selected
                  ? "bg-neutral-900 text-white"
                  : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-100",
              )}
            >
              {f.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Format</th>
              <th className="px-4 py-3">Urgency</th>
              <th className="px-4 py-3">Keyword</th>
              <SortableHeader
                label="Published"
                active={sortKey === "publishedAt"}
                dir={sortDir}
                onClick={() => toggleSort("publishedAt")}
              />
              <SortableHeader
                label="SEO"
                align="right"
                active={sortKey === "seo"}
                dir={sortDir}
                onClick={() => toggleSort("seo")}
              />
              <SortableHeader
                label="AEO"
                align="right"
                active={sortKey === "aeo"}
                dir={sortDir}
                onClick={() => toggleSort("aeo")}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((row) => (
              <PubRow
                key={row.pub.id}
                row={row}
                expanded={expandedId === row.pub.id}
                onToggle={() =>
                  setExpandedId((v) => (v === row.pub.id ? null : row.pub.id))
                }
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-neutral-500"
                >
                  No published content matches that filter yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        Click any row to see the SEO/AEO scoring breakdown. Scores are predicted
        from structural quality — real SERP rank would require Search Console /
        SerpAPI.
      </p>
    </div>
  );
}

function PubRow({
  row,
  expanded,
  onToggle,
}: {
  row: Row;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { pub, score } = row;
  const seoBand = scoreBand(score.seo);
  const aeoBand = scoreBand(score.aeo);

  return (
    <>
      <tr
        onClick={onToggle}
        className="group cursor-pointer transition-colors hover:bg-neutral-50"
      >
        <td className="px-4 py-3">
          <div className="font-medium text-neutral-900">{pub.title}</div>
          <div className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
            {pub.excerpt}
          </div>
          {score.partial && (
            <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-neutral-400">
              <Info className="h-3 w-3" />
              partial score — seeded post without full body
            </div>
          )}
        </td>
        <td className="px-4 py-3 align-top">
          <FormatBadge format={pub.format} />
        </td>
        <td className="px-4 py-3 align-top">
          <UrgencyLabel urgency={pub.urgency} />
        </td>
        <td className="px-4 py-3 align-top">
          <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs">
            {pub.primaryKeyword}
          </span>
        </td>
        <td className="px-4 py-3 align-top text-xs text-neutral-600">
          {formatDate(pub.publishedAt)}
        </td>
        <td className="px-4 py-3 text-right align-top">
          <ScorePill value={score.seo} band={seoBand} />
        </td>
        <td className="px-4 py-3 text-right align-top">
          <ScorePill value={score.aeo} band={aeoBand} />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-neutral-50/80">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-6 md:grid-cols-2">
              <ScoreBreakdown title="SEO checks" checks={score.seoChecks} />
              <ScoreBreakdown title="AEO checks" checks={score.aeoChecks} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ScorePill({
  value,
  band,
}: {
  value: number;
  band: { label: string; cls: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-xs font-semibold",
        band.cls,
      )}
    >
      {value}
      <span className="text-[10px] font-normal uppercase tracking-wide opacity-70">
        {band.label}
      </span>
    </span>
  );
}

function ScoreBreakdown({
  title,
  checks,
}: {
  title: string;
  checks: ReturnType<typeof scorePublication>["seoChecks"];
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h4>
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {checks.map((c) => (
          <li
            key={c.label}
            className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-1.5 w-1.5 rounded-full",
                  c.passed
                    ? "bg-emerald-500"
                    : c.points > 0
                      ? "bg-amber-400"
                      : "bg-rose-400",
                )}
              />
              <span className="font-medium text-neutral-800">{c.label}</span>
            </span>
            <span className="flex items-center gap-2 text-neutral-500">
              <span className="text-[11px]">{c.value}</span>
              <span className="font-mono text-[11px] tabular-nums text-neutral-400">
                {c.points}/{c.max}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SortableHeader({
  label,
  align = "left",
  active,
  dir,
  onClick,
}: {
  label: string;
  align?: "left" | "right";
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th
      className={cn(
        "px-4 py-3",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 text-xs uppercase tracking-wide transition-colors",
          active ? "text-indigo-700" : "text-neutral-500 hover:text-neutral-900",
          align === "right" && "flex-row-reverse",
        )}
      >
        <span>{label}</span>
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="text-[10px] text-neutral-400">{hint}</div>}
    </div>
  );
}
