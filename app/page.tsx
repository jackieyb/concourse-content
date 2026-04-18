"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Recommendation, Signal } from "@/types";
import { RefreshCw, Zap } from "lucide-react";
import { RecCard } from "@/components/rec-card";
import { SignalBoard } from "@/components/signal-board";
import { useAppStore } from "@/lib/store";
import { formatDayDate, timeOfDayGreeting } from "@/lib/utils";

type RecResponse = { weekOf: string; recommendations: Recommendation[] };
type SignalsResponse = { weekOf: string; capturedAt: string; signals: Signal[] };

export default function DashboardPage() {
  const publications = useAppStore((s) => s.publications);
  const setRecommendations = useAppStore((s) => s.setRecommendations);

  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [signalsData, setSignalsData] = useState<SignalsResponse | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [recError, setRecError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/signals")
      .then((r) => r.json())
      .then(setSignalsData)
      .catch(() => {});
  }, []);

  const loadRecs = useCallback(() => {
    setLoadingRecs(true);
    setRecError(null);
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publications }),
    })
      .then((r) => r.json())
      .then((data: RecResponse) => {
        setRecs(data.recommendations);
        setRecommendations(data.recommendations);
      })
      .catch((err) => setRecError(err.message ?? "Failed to load recommendations"))
      .finally(() => setLoadingRecs(false));
  }, [publications, setRecommendations]);

  useEffect(() => {
    loadRecs();
  }, [loadRecs]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              {formatDayDate()}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">
              {timeOfDayGreeting()}, here&rsquo;s what&rsquo;s happening in finance AI
            </h1>
            <p className="mt-1.5 text-sm text-neutral-500">
              Signals refreshed from industry sources
              <span className="mx-1.5 text-neutral-300">·</span>
              Recommendations tailored to your content history
            </p>
          </div>
          <Link
            href="/generate"
            className="shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            Start from scratch →
          </Link>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-500" fill="currentColor" />
            <h2 className="text-base font-semibold text-neutral-900">
              Recommended to publish today
            </h2>
          </div>
          <button
            onClick={loadRecs}
            disabled={loadingRecs}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw
              className={
                "h-3.5 w-3.5 " + (loadingRecs ? "animate-spin" : "")
              }
            />
            Refresh picks
          </button>
        </div>

        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {loadingRecs && (
            <>
              <RecSkeleton />
              <RecSkeleton />
              <RecSkeleton />
            </>
          )}
          {recError && (
            <div className="col-span-full rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {recError}
            </div>
          )}
          {!loadingRecs &&
            recs?.map((rec, i) => <RecCard key={rec.id} rec={rec} rank={i + 1} />)}
          {!loadingRecs && recs?.length === 0 && (
            <div className="col-span-full rounded-md border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              No recommendations — every signal is already covered this week. Nice work.
            </div>
          )}
        </div>
      </section>

      <div className="mt-12">
        {signalsData ? (
          <SignalBoard signals={signalsData.signals} weekOf={signalsData.weekOf} />
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-sm text-neutral-500">
            Loading signals…
          </div>
        )}
      </div>
    </div>
  );
}

function RecSkeleton() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="h-3 w-24 rounded bg-neutral-100" />
      <div className="mt-4 h-5 w-3/4 rounded bg-neutral-100" />
      <div className="mt-2 h-4 w-full rounded bg-neutral-100" />
      <div className="mt-4 h-20 rounded bg-neutral-50" />
      <div className="mt-4 h-9 rounded bg-neutral-100" />
    </div>
  );
}
