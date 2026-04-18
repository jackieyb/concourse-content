import type { Signal, SignalCategory } from "@/types";

const EXA_ENDPOINT = "https://api.exa.ai/search";

type ExaResult = {
  id: string;
  url: string;
  title?: string | null;
  publishedDate?: string | null;
  author?: string | null;
  text?: string | null;
  summary?: string | null;
  score?: number;
};

type ExaResponse = {
  results: ExaResult[];
};

export type ExaQuery = {
  query: string;
  category: SignalCategory;
  numResults?: number;
  includeDomains?: string[];
  daysBack?: number;
};

const FINANCE_AI_QUERIES: ExaQuery[] = [
  {
    query:
      "Finance team AI agents, CFO automation, AI for month-end close and FP&A — news and launches",
    category: "industry-news",
    numResults: 6,
    daysBack: 10,
  },
  {
    query:
      "AI in accounting and financial reporting regulation, SEC FASB AICPA AI disclosure guidance",
    category: "industry-news",
    numResults: 4,
    daysBack: 14,
  },
  {
    query:
      "Buyer-intent discussion about evaluating AI finance tools, agentic FP&A, AI variance analysis",
    category: "trending-topic",
    numResults: 4,
    daysBack: 10,
  },
  {
    query:
      "AI finance product launches from spend management, ERP, and accounting platforms",
    category: "enterprise-fintech",
    numResults: 4,
    daysBack: 10,
    includeDomains: [
      "ramp.com",
      "brex.com",
      "mercury.com",
      "stripe.com",
      "netsuite.com",
    ],
  },
  {
    query:
      "AI finance agent and analyst copilot launches and posts from competitor startups",
    category: "competitor-content",
    numResults: 5,
    daysBack: 10,
    includeDomains: [
      "rogo.ai",
      "nominal.com",
      "aleph.co",
      "datarails.com",
      "pigment.com",
      "numeric.io",
      "runway.com",
    ],
  },
];

export function hasExaKey(): boolean {
  return Boolean(process.env.EXA_API_KEY);
}

async function callExa(q: ExaQuery): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];

  const startPublishedDate = q.daysBack
    ? new Date(Date.now() - q.daysBack * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  const body: Record<string, unknown> = {
    query: q.query,
    type: "auto",
    numResults: q.numResults ?? 5,
    contents: {
      text: { maxCharacters: 1200 },
      summary: { query: "why this matters for a finance leader" },
    },
  };
  if (startPublishedDate) body.startPublishedDate = startPublishedDate;
  if (q.includeDomains?.length) body.includeDomains = q.includeDomains;

  const res = await fetch(EXA_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Exa ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as ExaResponse;
  return data.results ?? [];
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function deriveKeywords(result: ExaResult, seedQuery: string): string[] {
  const title = (result.title ?? "").toLowerCase();
  const text = (result.summary ?? result.text ?? "").toLowerCase();
  const combined = `${title} ${text}`;
  const seeds = [
    "ai for finance",
    "ai close cycle",
    "ai fp&a",
    "ai variance analysis",
    "ai cash forecasting",
    "ai for accounting",
    "ai reconciliation",
    "ai audit trail",
    "ai journal entries",
    "ai flux analysis",
    "finance ai compliance",
    "ai agents for finance",
    "month-end close automation",
    "ai revenue recognition",
    "ai disclosure",
  ];
  const matched = seeds.filter((s) => combined.includes(s.split(" ")[1] ?? s));
  const unique = Array.from(new Set(matched)).slice(0, 3);
  if (unique.length >= 3) return unique;
  const queryWords = seedQuery
    .toLowerCase()
    .match(/[a-z][a-z& ]{3,}/g)
    ?.slice(0, 5) ?? [];
  for (const w of queryWords) {
    if (unique.length >= 4) break;
    const trimmed = w.trim();
    if (trimmed && !unique.includes(trimmed)) unique.push(trimmed);
  }
  return unique.length ? unique : ["ai for finance"];
}

function importanceFor(
  result: ExaResult,
  category: SignalCategory,
  rank: number,
): number {
  const base =
    category === "industry-news"
      ? 88
      : category === "competitor-content"
        ? 82
        : category === "trending-topic"
          ? 80
          : 76;
  const rankPenalty = Math.min(12, rank * 2);
  const scoreBoost = typeof result.score === "number" ? Math.round(result.score * 6) : 0;
  return Math.max(60, Math.min(97, base - rankPenalty + scoreBoost));
}

function toSignal(
  result: ExaResult,
  q: ExaQuery,
  rank: number,
): Signal | null {
  if (!result.url || !result.title) return null;
  const summary =
    result.summary?.trim() ||
    (result.text ? `${result.text.trim().slice(0, 260)}…` : "");
  if (!summary) return null;

  return {
    id: `exa-${result.id.slice(0, 12)}`,
    stream: "external",
    category: q.category,
    headline: result.title.trim(),
    summary,
    source: domainFromUrl(result.url),
    url: result.url,
    publishedAt: result.publishedDate ?? new Date().toISOString(),
    importance: importanceFor(result, q.category, rank),
    keywords: deriveKeywords(result, q.query),
  };
}

export async function fetchExternalSignals(): Promise<{
  signals: Signal[];
  source: "exa" | "none";
  error?: string;
}> {
  if (!hasExaKey()) return { signals: [], source: "none" };

  try {
    const batches = await Promise.all(
      FINANCE_AI_QUERIES.map(async (q) => {
        const rows = await callExa(q);
        return rows
          .map((r, i) => toSignal(r, q, i))
          .filter((s): s is Signal => s !== null);
      }),
    );

    const all = batches.flat();
    const seen = new Set<string>();
    const deduped: Signal[] = [];
    for (const s of all) {
      const key = s.url ?? s.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(s);
    }
    deduped.sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    return { signals: deduped.slice(0, 20), source: "exa" };
  } catch (err) {
    return {
      signals: [],
      source: "none",
      error: err instanceof Error ? err.message : "Exa fetch failed",
    };
  }
}
