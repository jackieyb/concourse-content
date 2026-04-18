import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODELS } from "@/lib/claude";
import { BRAND_BRIEF } from "@/lib/brand-brief";
import { getWeeklySignals } from "@/lib/signals";
import { recommend as deterministicRecommend } from "@/lib/recommend";
import { SEED_PUBLICATIONS } from "@/lib/back-catalog";
import { FORMATS } from "@/lib/formats";
import type {
  FormatKey,
  Publication,
  Recommendation,
  Signal,
  Urgency,
} from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const FORMAT_KEYS: FormatKey[] = [
  "how-to",
  "listicle",
  "case-study",
  "pillar-post",
  "trend-piece",
  "comparison",
  "thought-leadership",
  "faq",
];

const RECOMMEND_TOOL: Anthropic.Tool = {
  name: "submit_recommendations",
  description:
    "Submit the top 3 content recommendations to publish today, ranked by strategic impact. Rec #1 is the highest-priority pick.",
  input_schema: {
    type: "object",
    required: ["recommendations"],
    properties: {
      recommendations: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          required: [
            "signalId",
            "format",
            "subject",
            "angle",
            "rationale",
            "primaryKeyword",
            "secondaryKeywords",
            "urgency",
          ],
          properties: {
            signalId: {
              type: "string",
              description:
                "The ID of the signal backing this recommendation — must exactly match one of the signal IDs listed in the input.",
            },
            format: {
              type: "string",
              enum: FORMAT_KEYS,
              description: "Which content format best fits the topic + intent.",
            },
            subject: {
              type: "string",
              description:
                "The specific article title — benefit-driven, written for finance buyers, under 80 characters. Not a restatement of the raw signal headline.",
            },
            angle: {
              type: "string",
              description:
                "1-2 sentences describing the specific angle/structure the writer should take. Name Concourse proof points, integrations, or competitors where they naturally fit.",
            },
            rationale: {
              type: "string",
              description:
                "Exactly 2 sentences. Sentence 1 = the news gist rewritten in Concourse voice (concrete, no fluff). Sentence 2 = a tight VP-of-content strategic line that integrates timing, audience, and why this format wins right now. Do NOT reuse the same vocabulary across the two sentences (e.g. don't say 'news-jack window' in both).",
            },
            primaryKeyword: {
              type: "string",
              description:
                "The primary SEO keyword this piece should rank for. Prefer Concourse's established keyword clusters.",
            },
            secondaryKeywords: {
              type: "array",
              items: { type: "string" },
              minItems: 2,
              maxItems: 3,
              description: "2-3 secondary keywords to weave into H2s and body.",
            },
            urgency: {
              type: "string",
              enum: ["red", "yellow"],
              description:
                "red = timely news-jack (publish within 48h of the signal); yellow = evergreen (durable organic value).",
            },
          },
        },
      },
    },
  },
};

function buildSignalsBlock(signals: Signal[]): string {
  return signals
    .map(
      (s) =>
        `- id=${s.id} [${s.category}] (${s.source}, ${s.publishedAt}, importance ${s.importance}) — ${s.headline} :: ${s.summary} :: keywords: ${s.keywords.join(", ")}`,
    )
    .join("\n");
}

function buildHistoryBlock(pubs: Publication[]): string {
  if (!pubs.length) return "No content published yet.";
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recent = pubs
    .filter((p) => new Date(p.publishedAt).getTime() > cutoff)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  if (!recent.length) return "No content published in the last 14 days.";
  const counts: Record<string, number> = {};
  for (const p of recent) counts[p.format] = (counts[p.format] ?? 0) + 1;
  const cadence = Object.entries(counts)
    .map(([f, n]) => `${f}: ${n}×`)
    .join(", ");
  const list = recent
    .slice(0, 10)
    .map(
      (p) =>
        `- ${p.format} · "${p.title}" · ${p.primaryKeyword} · published ${p.publishedAt.slice(0, 10)}`,
    )
    .join("\n");
  return `Cadence (last 14 days): ${cadence}\n\nRecent posts:\n${list}`;
}

export async function POST(req: Request) {
  let publications: Publication[] = SEED_PUBLICATIONS;
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body?.publications) && body.publications.length) {
      publications = body.publications as Publication[];
    }
  } catch {}

  const { signals, weekOf } = getWeeklySignals();

  let client;
  try {
    client = getAnthropic();
  } catch {
    const recs = deterministicRecommend({ signals, publications, limit: 3 });
    return NextResponse.json({
      weekOf,
      recommendations: recs,
      source: "deterministic",
    });
  }

  const system = [
    "You are the content strategist for Concourse, an AI agents platform for finance teams. Your job is to pick the top 3 content pieces to publish today with the highest combined SEO, AEO, and pipeline impact. Think like a VP of Content who understands buyer intent, news-jack windows, and format-to-intent matching.",
    "",
    BRAND_BRIEF,
  ].join("\n");

  const userPrompt = [
    "## This week's signals",
    buildSignalsBlock(signals),
    "",
    "## Recent content history",
    buildHistoryBlock(publications),
    "",
    "## Ranking criteria (apply in order)",
    "1. Topic importance: highest-value topic for CFOs, Controllers, and FP&A leaders. Prefer live news pegs.",
    "2. Content gap: deprioritize topics already covered in the last 14 days.",
    "3. Format fit: match format to intent — how-to for implementation, trend-piece for news-jack, thought-leadership for POV on shifts, comparison for buyer-intent keywords, case-study for proof, etc.",
    "4. Format variety: avoid repeating a format used in the last 7 days unless the topic strongly demands it. Pick the least-recently-used format when forced.",
    "5. Diversity: the 3 picks should cover distinct topics/categories — don't give 3 takes on the same news.",
    "",
    `Valid formats: ${FORMAT_KEYS.join(", ")}.`,
    "",
    "Call submit_recommendations exactly once with 3 recs, ranked by strategic impact. Do not output any text outside the tool call.",
  ].join("\n");

  try {
    const response = await client.messages.create({
      model: MODELS.ranking,
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: userPrompt }],
      tools: [RECOMMEND_TOOL],
      tool_choice: { type: "tool", name: RECOMMEND_TOOL.name },
    });

    const toolUse = response.content.find(
      (c): c is Extract<typeof c, { type: "tool_use" }> => c.type === "tool_use",
    );
    if (!toolUse) {
      const recs = deterministicRecommend({ signals, publications, limit: 3 });
      return NextResponse.json({
        weekOf,
        recommendations: recs,
        source: "deterministic-fallback",
      });
    }

    const input = toolUse.input as {
      recommendations: Array<{
        signalId: string;
        format: FormatKey;
        subject: string;
        angle: string;
        rationale: string;
        primaryKeyword: string;
        secondaryKeywords: string[];
        urgency: Urgency;
      }>;
    };

    const signalIds = new Set(signals.map((s) => s.id));
    const recs: Recommendation[] = (input.recommendations ?? [])
      .filter((r) => signalIds.has(r.signalId) && FORMATS[r.format])
      .slice(0, 3)
      .map((r) => ({
        id: `rec-${r.signalId}`,
        signalId: r.signalId,
        subject: r.subject,
        angle: r.angle,
        format: r.format,
        urgency: r.urgency,
        rationale: r.rationale,
        primaryKeyword: r.primaryKeyword,
        secondaryKeywords: (r.secondaryKeywords ?? []).slice(0, 3),
      }));

    if (recs.length < 3) {
      const fallback = deterministicRecommend({
        signals,
        publications,
        limit: 3,
      });
      for (const f of fallback) {
        if (recs.length >= 3) break;
        if (!recs.some((r) => r.signalId === f.signalId)) recs.push(f);
      }
    }

    return NextResponse.json({
      weekOf,
      recommendations: recs,
      source: "claude",
    });
  } catch (err) {
    const recs = deterministicRecommend({ signals, publications, limit: 3 });
    return NextResponse.json({
      weekOf,
      recommendations: recs,
      source: "deterministic-error",
      error: err instanceof Error ? err.message : "Ranking failed",
    });
  }
}
