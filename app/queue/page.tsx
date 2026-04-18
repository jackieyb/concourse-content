"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Draft } from "@/types";
import { FORMATS } from "@/lib/formats";
import { FormatIcon } from "@/components/format-icon";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  Calendar,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
} from "lucide-react";

type Bucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "this-week"
  | "next-week"
  | "later"
  | "unscheduled";

const BUCKET_ORDER: Bucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "this-week",
  "next-week",
  "later",
  "unscheduled",
];

const BUCKET_META: Record<
  Bucket,
  { label: string; hint: string; accent: string; icon: typeof Calendar }
> = {
  overdue: {
    label: "Overdue",
    hint: "Scheduled in the past, not yet published",
    accent: "border-rose-200 bg-rose-50",
    icon: CalendarX2,
  },
  today: {
    label: "Today",
    hint: "Publish today to stay on cadence",
    accent: "border-indigo-200 bg-indigo-50",
    icon: CalendarClock,
  },
  tomorrow: {
    label: "Tomorrow",
    hint: "",
    accent: "border-violet-200 bg-violet-50",
    icon: Calendar,
  },
  "this-week": {
    label: "This week",
    hint: "",
    accent: "border-emerald-200 bg-emerald-50",
    icon: Calendar,
  },
  "next-week": {
    label: "Next week",
    hint: "",
    accent: "border-sky-200 bg-sky-50",
    icon: Calendar,
  },
  later: {
    label: "Later",
    hint: "More than two weeks out",
    accent: "border-neutral-200 bg-neutral-50",
    icon: Calendar,
  },
  unscheduled: {
    label: "Unscheduled",
    hint: "In-progress drafts without a publish date yet",
    accent: "border-amber-200 bg-amber-50",
    icon: Clock,
  },
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketFor(iso: string | undefined): Bucket {
  if (!iso) return "unscheduled";
  const now = new Date();
  const today = startOfDay(now);
  const target = startOfDay(new Date(iso));
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((target.getTime() - today.getTime()) / msPerDay);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "this-week";
  if (days <= 14) return "next-week";
  return "later";
}

function formatLocal(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function toInputValue(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputValue(v: string): string {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 9, 0, 0).toISOString();
}

export default function QueuePage() {
  const drafts = useAppStore((s) => s.drafts);
  const scheduleDraft = useAppStore((s) => s.scheduleDraft);
  const deleteDraft = useAppStore((s) => s.deleteDraft);

  const grouped = useMemo(() => {
    const out: Record<Bucket, Draft[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      "this-week": [],
      "next-week": [],
      later: [],
      unscheduled: [],
    };
    for (const d of Object.values(drafts)) {
      out[bucketFor(d.scheduledFor)].push(d);
    }
    for (const b of BUCKET_ORDER) {
      out[b].sort((a, b) => {
        if (a.scheduledFor && b.scheduledFor) {
          return (
            new Date(a.scheduledFor).getTime() -
            new Date(b.scheduledFor).getTime()
          );
        }
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    }
    return out;
  }, [drafts]);

  const totalDrafts = Object.values(drafts).length;
  const scheduledCount = Object.values(drafts).filter(
    (d) => d.scheduledFor,
  ).length;
  const readyCount = Object.values(drafts).filter(
    (d) => d.status === "ready",
  ).length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Content queue
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          What&rsquo;s scheduled to publish
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          Drop drafts into a date to keep a steady publishing cadence. The
          recommendation engine reads from here so it doesn&rsquo;t queue a
          topic you already have in flight.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Drafts total" value={String(totalDrafts)} />
        <StatCard label="Scheduled" value={String(scheduledCount)} />
        <StatCard label="Ready to publish" value={String(readyCount)} />
      </div>

      {totalDrafts === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {BUCKET_ORDER.filter((b) => grouped[b].length > 0).map((b) => (
            <BucketColumn
              key={b}
              bucket={b}
              drafts={grouped[b]}
              onSchedule={(id, iso) => scheduleDraft(id, iso)}
              onDelete={deleteDraft}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center">
      <Calendar className="mx-auto h-6 w-6 text-neutral-400" />
      <h2 className="mt-3 text-base font-semibold text-neutral-900">
        The queue is empty
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Drafts start here when you generate from a recommendation or from
        scratch. Schedule them out to keep publishing steady.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Go to today&rsquo;s recommendations
      </Link>
    </div>
  );
}

function BucketColumn({
  bucket,
  drafts,
  onSchedule,
  onDelete,
}: {
  bucket: Bucket;
  drafts: Draft[];
  onSchedule: (id: string, iso: string | null) => void;
  onDelete: (id: string) => void;
}) {
  const meta = BUCKET_META[bucket];
  const Icon = meta.icon;
  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4",
        meta.accent,
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-neutral-700" />
          <h2 className="text-sm font-semibold text-neutral-900">
            {meta.label}
          </h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
            {drafts.length}
          </span>
        </div>
        {meta.hint && (
          <span className="text-[11px] text-neutral-500">{meta.hint}</span>
        )}
      </header>
      <div className="flex flex-col gap-2">
        {drafts.map((d) => (
          <QueueCard
            key={d.id}
            draft={d}
            onSchedule={(iso) => onSchedule(d.id, iso)}
            onDelete={() => onDelete(d.id)}
          />
        ))}
      </div>
    </section>
  );
}

function QueueCard({
  draft,
  onSchedule,
  onDelete,
}: {
  draft: Draft;
  onSchedule: (iso: string | null) => void;
  onDelete: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const fmt = FORMATS[draft.format];
  const isReady = draft.status === "ready";

  return (
    <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-600">
          <FormatIcon format={draft.format} className="h-3.5 w-3.5" />
          <span className="font-medium">{fmt.label}</span>
        </div>
        <StatusPill status={draft.status} />
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-neutral-900">
        {draft.subject || "Untitled draft"}
      </h3>
      {draft.angle && (
        <p className="mt-1 line-clamp-2 text-[11px] text-neutral-500">
          {draft.angle}
        </p>
      )}
      {draft.scheduledFor && (
        <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-neutral-600">
          <CalendarClock className="h-3 w-3" />
          {formatLocal(draft.scheduledFor)}
        </div>
      )}
      {pickerOpen && (
        <div className="mt-2 flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2">
          <input
            type="date"
            className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
            defaultValue={toInputValue(draft.scheduledFor)}
            onChange={(e) => {
              if (e.target.value) onSchedule(fromInputValue(e.target.value));
            }}
          />
          {draft.scheduledFor && (
            <button
              type="button"
              onClick={() => {
                onSchedule(null);
                setPickerOpen(false);
              }}
              className="rounded-md bg-white px-2 py-1 text-[11px] text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50"
            >
              Unschedule
            </button>
          )}
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            className="rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-medium text-white"
          >
            Done
          </button>
        </div>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <CalendarClock className="h-3 w-3" />
            {draft.scheduledFor ? "Reschedule" : "Schedule"}
          </button>
          <Link
            href={`/generate?draft=${draft.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Pencil className="h-3 w-3" />
            {isReady ? "Review" : "Edit"}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this draft?")) onDelete();
          }}
          className="rounded-md p-1 text-neutral-400 hover:bg-white hover:text-rose-600"
          aria-label="Delete draft"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Draft["status"] }) {
  if (status === "ready") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    );
  }
  if (status === "generating") {
    return (
      <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-indigo-200">
        Generating
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 ring-1 ring-rose-200">
        Error
      </span>
    );
  }
  return (
    <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
      Idle
    </span>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
