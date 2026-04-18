import type { Signal } from "@/types";
import signalsData from "@/data/signals.json";

export function getWeeklySignals(): {
  weekOf: string;
  capturedAt: string;
  signals: Signal[];
} {
  return {
    weekOf: signalsData.weekOf,
    capturedAt: signalsData.capturedAt,
    signals: signalsData.signals as Signal[],
  };
}

export function getSignalById(id: string): Signal | undefined {
  return (signalsData.signals as Signal[]).find((s) => s.id === id);
}
