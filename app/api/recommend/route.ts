import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODELS } from "@/lib/claude";
import { BRAND_BRIEF } from "@/lib/brand-brief";
import { loadWeeklySignals } from "@/lib/signals";
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
                "2-3 sentences explaining why THIS topic is worth pulling resources for THIS week. Before writing, pick ONE of these four framing approaches and commit to it for this rec (use a DIFFERENT framing for each of the 3 recs):\n  (a) TENSION FRAMING — name the contradiction or conflict the event creates. Example: 'The SEC just demanded more disclosure granularity in the same quarter finance teams are being asked to close faster. Those two pressures don't reconcile without automation.'\n  (b) TIMING WINDOW — make the case for why THIS week specifically, grounded in something concrete (earnings cycle, regulatory deadline, conference, release date). Example: 'Q2 close starts in 11 days. Any team still building forecast templates by hand is already behind — a walkthrough published now catches them mid-planning.'\n  (c) COMPETITIVE VACUUM — name who should be covering this and isn't. Example: 'Rogo and Nominal have both gone quiet on the NetSuite integration story for two weeks. There is an open lane to own the search result before they respond.'\n  (d) SEARCH BEHAVIOR SHIFT — name the new query this event is creating. Example: 'Within 48 hours of the Anthropic announcement, finance leaders will start searching \"claude for financial analysis\" — a term that had near-zero volume last month.'\nCRITICAL RULES:\n  - NEVER use the phrase 'CFOs are searching for a clear read.' It is banned.\n  - NEVER end two rationales in this batch with the same construction (e.g. don't close two with 'before peers publish' or 'while the wave is cresting').\n  - Each rationale should feel like a different content strategist wrote it.\n  - Be specific. Name actual companies, real integrations (NetSuite, Snowflake, Ramp), concrete numbers, specific dates. Vague strategic language is the failure mode.\n  - Goal: convince a skeptical editor to pull resources for THIS piece, THIS week.",
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
        `- id=${s.id} stream=${s.stream} [${s.category}] (${s.source}, ${s.publishedAt}, importance ${s.importance}) — ${s.headline} :: ${s.summary} :: keywords: ${s.keywords.join(", ")}`,
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

  const { signals, weekOf } = await loadWeeklySignals();

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
    "## Three signal streams",
    "- stream=external → what the market is publishing (news, competitors, fintech launches). Fed live from Exa.",
    "- stream=customer → what sales and CS are hearing from prospects and accounts (pains, wins, objections).",
    "- stream=product → what Concourse is shipping (launches, integrations, milestones).",
    "",
    "## Ranking criteria (apply in order)",
    "1. Stream diversity (HARD RULE): the 3 picks MUST cover all three streams — exactly one from external, one from customer, one from product — whenever each stream has at least one signal with importance ≥ 3. If one stream genuinely has no viable signal this week, state that explicitly in the rationale of the double-stream pick, then fall back to 2 from one stream + 1 from another. Two externals by default is a failure mode — customer wins and product launches convert better for pipeline.",
    "2. Strategic value within each stream: inside each stream, pick the single highest-ROI signal. Customer-win > customer-pain > sales-objection. Product-launch > product-integration > product-milestone. External: prefer enterprise-fintech or industry-news over generic trending-topic.",
    "3. Content gap: deprioritize any signal whose topic or primary keyword overlaps with a post shipped in the last 14 days (see history below).",
    "4. Format fit per pick: how-to for implementation, trend-piece for external news-jack, thought-leadership for product-launch POV, comparison for buyer-intent keywords, case-study for customer-win, faq for sales-objection.",
    "5. Format variety across the 3 picks: no two picks should share the same format.",
    "",
    "## Rationale variety (read the tool schema for full detail)",
    "Before writing each rationale, mentally pick ONE of these four framing approaches and use a DIFFERENT one for each of the 3 recs:",
    "  (1) tension framing — the conflict/contradiction the event creates",
    "  (2) timing window — why THIS week specifically, grounded in a concrete date/cycle",
    "  (3) competitive vacuum — who should be covering this and isn't",
    "  (4) search behavior shift — the new query this event is creating",
    "Banned phrase: 'CFOs are searching for a clear read.' Never end two rationales the same way. Name specific companies, integrations, dates, numbers — vague strategic language is the failure mode.",
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
