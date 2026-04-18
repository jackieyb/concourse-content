"use client";

import { useMemo, useState } from "react";
import type { FormatKey, Publication } from "@/types";
import { FORMATS } from "@/lib/formats";
import { FormatBadge } from "@/components/format-badge";
import { UrgencyLabel } from "@/components/urgency-dot";
import { useAppStore } from "@/lib/store";
import { formatDate, cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type SortKey = "publishedAt" | "views" | "avgTime";
type SortDir = "asc" | "desc";

export default function HistoryPage() {
  const publications = useAppStore((s) => s.publications);
  const [filter, setFilter] = useState<FormatKey | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("publishedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    const rows = publications.filter((p) => filter === "all" || p.format === filter);
    const factor = sortDir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      if (sortKey === "publishedAt") {
        return (
          factor *
          (new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
        );
      }
      if (sortKey === "views") {
        return factor * ((a.mockMetrics?.views ?? 0) - (b.mockMetrics?.views ?? 0));
      }
      return factor * (timeToSeconds(a.mockMetrics?.avgTimeOnPage) - timeToSeconds(b.mockMetrics?.avgTimeOnPage));
    });
  }, [publications, filter, sortKey, sortDir]);

  const stats = useMemo(() => computeStats(publications), [publications]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "publishedAt" ? "desc" : "desc");
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
          Tracks format mix, topic cadence, and performance. The recommendation engine reads from here so it doesn&rsquo;t serve you back-to-back posts of the same format.
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Total published" value={String(publications.length)} />
        <StatCard label="Last 7 days" value={String(stats.last7Days)} />
        <StatCard
          label="Top format"
          value={stats.topFormat ? FORMATS[stats.topFormat].label : "—"}
          hint={`${stats.topFormatCount} posts`}
        />
        <StatCard
          label="Avg. time-on-page"
          value={stats.avgTimeOnPage}
          hint="Mock metric — plug in GA4 next"
        />
      </div>

      {/* Filter */}
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

      {/* Table */}
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
                label="Views"
                align="right"
                active={sortKey === "views"}
                dir={sortDir}
                onClick={() => toggleSort("views")}
              />
              <SortableHeader
                label="Avg time"
                align="right"
                active={sortKey === "avgTime"}
                dir={sortDir}
                onClick={() => toggleSort("avgTime")}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.map((p) => (
              <tr key={p.id} className="group hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900">{p.title}</div>
                  <div className="mt-0.5 line-clamp-1 text-xs text-neutral-500">
                    {p.excerpt}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <FormatBadge format={p.format} />
                </td>
                <td className="px-4 py-3 align-top">
                  <UrgencyLabel urgency={p.urgency} />
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs">
                    {p.primaryKeyword}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-xs text-neutral-600">
                  {formatDate(p.publishedAt)}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-xs">
                  {(p.mockMetrics?.views ?? 0).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right align-top font-mono text-xs">
                  {p.mockMetrics?.avgTimeOnPage ?? "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-500">
                  No published content matches that filter yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-neutral-400">
        Views and average time-on-page are placeholders for a real analytics integration. New posts land with zeros so the data is honest; the seeded back-catalog has representative numbers so the view isn&rsquo;t empty on first visit.
      </p>
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

function computeStats(pubs: Publication[]) {
  const now = Date.now();
  const last7Days = pubs.filter(
    (p) => now - new Date(p.publishedAt).getTime() < 7 * 24 * 3600 * 1000,
  ).length;

  const counts: Partial<Record<FormatKey, number>> = {};
  for (const p of pubs) counts[p.format] = (counts[p.format] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const topFormat = (sorted[0]?.[0] as FormatKey | undefined) ?? null;
  const topFormatCount = sorted[0]?.[1] ?? 0;

  const times = pubs
    .map((p) => p.mockMetrics?.avgTimeOnPage)
    .filter((t): t is string => Boolean(t) && t !== "—");
  const avgTimeOnPage =
    times.length === 0
      ? "—"
      : formatAverageTime(times);

  return { last7Days, topFormat, topFormatCount, avgTimeOnPage };
}

function timeToSeconds(t?: string): number {
  if (!t || t === "—") return 0;
  const [m, s] = t.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
}

function formatAverageTime(times: string[]): string {
  const secs = times.map(timeToSeconds);
  const avg = secs.reduce((a, b) => a + b, 0) / secs.length;
  const m = Math.floor(avg / 60);
  const s = Math.round(avg % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
