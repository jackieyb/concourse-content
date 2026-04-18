import type { Signal, SignalStream } from "@/types";
import externalSeed from "@/data/signals.json";
import customerSeed from "@/data/signals-customer.json";
import productSeed from "@/data/signals-product.json";
import { fetchExternalSignals, hasExaKey } from "@/lib/exa";

type SeedFile = {
  weekOf: string;
  capturedAt: string;
  signals: Signal[];
};

const EXTERNAL_SEED = externalSeed as SeedFile;
const CUSTOMER_SEED = customerSeed as SeedFile;
const PRODUCT_SEED = productSeed as SeedFile;

export type SignalsBundle = {
  weekOf: string;
  capturedAt: string;
  signals: Signal[];
  source: {
    external: "exa" | "seed";
    customer: "seed";
    product: "seed";
  };
  exaError?: string;
};

let cached: { at: number; bundle: SignalsBundle } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function loadWeeklySignals(): Promise<SignalsBundle> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.bundle;

  let external: Signal[] = EXTERNAL_SEED.signals;
  let externalSource: "exa" | "seed" = "seed";
  let exaError: string | undefined;

  if (hasExaKey()) {
    const { signals: live, source, error } = await fetchExternalSignals();
    if (source === "exa" && live.length > 0) {
      external = live;
      externalSource = "exa";
    } else if (error) {
      exaError = error;
    }
  }

  const bundle: SignalsBundle = {
    weekOf: EXTERNAL_SEED.weekOf,
    capturedAt: new Date().toISOString(),
    signals: [...external, ...CUSTOMER_SEED.signals, ...PRODUCT_SEED.signals],
    source: {
      external: externalSource,
      customer: "seed",
      product: "seed",
    },
    exaError,
  };

  cached = { at: Date.now(), bundle };
  return bundle;
}

export function getWeeklySignalsSync(): SignalsBundle {
  return {
    weekOf: EXTERNAL_SEED.weekOf,
    capturedAt: EXTERNAL_SEED.capturedAt,
    signals: [
      ...EXTERNAL_SEED.signals,
      ...CUSTOMER_SEED.signals,
      ...PRODUCT_SEED.signals,
    ],
    source: { external: "seed", customer: "seed", product: "seed" },
  };
}

export function getSignalsByStream(
  bundle: SignalsBundle,
  stream: SignalStream,
): Signal[] {
  return bundle.signals.filter((s) => s.stream === stream);
}

export async function getSignalById(id: string): Promise<Signal | undefined> {
  const bundle = await loadWeeklySignals();
  return bundle.signals.find((s) => s.id === id);
}
