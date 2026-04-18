import type {
  FormatKey,
  Publication,
  Recommendation,
  Signal,
  Urgency,
} from "@/types";
import { FORMATS, pickFormatForSubject } from "@/lib/formats";
import { getRecentFormats, hasCoveredTopic } from "@/lib/back-catalog";

const FRESH_WINDOW_HOURS = 72;

function hoursSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
}

function urgencyFor(signal: Signal, format: FormatKey): Urgency {
  const fresh = hoursSince(signal.publishedAt) < FRESH_WINDOW_HOURS;
  const timelyCategory =
    signal.category === "industry-news" ||
    signal.category === "competitor-content";

  if (fresh && (timelyCategory || format === "trend-piece")) return "red";
  if (format === "trend-piece") return "red";
  return FORMATS[format].typicalUrgency;
}

function scoreSignal(
  signal: Signal,
  pubs: Publication[],
  recentFormats: FormatKey[],
): {
  score: number;
  format: FormatKey;
  excluded: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const covered = hasCoveredTopic(pubs, signal.keywords);
  if (covered) {
    return {
      score: 0,
      format: pickFormatForSubject(signal.category, signal.keywords),
      excluded: true,
      reasons: ["Already covered this week"],
    };
  }

  let score = signal.importance;
  reasons.push(`Importance ${signal.importance}`);

  const hours = hoursSince(signal.publishedAt);
  const freshnessBonus = Math.max(0, 30 - hours) * 0.5;
  score += freshnessBonus;
  if (freshnessBonus > 5) reasons.push(`Fresh (${Math.round(hours)}h old)`);

  if (signal.category === "competitor-content") {
    score += 8;
    reasons.push("Competitor moved — response opportunity");
  }
  if (signal.category === "industry-news") {
    score += 6;
    reasons.push("Industry news — news-jack window");
  }

  const preferredFormat = pickFormatForSubject(signal.category, signal.keywords);
  const formatRecentIndex = recentFormats.indexOf(preferredFormat);
  let format = preferredFormat;

  if (formatRecentIndex === 0) {
    const alt = alternateFormat(preferredFormat, signal.category);
    format = alt;
    score -= 10;
    reasons.push(`Swapped to ${FORMATS[alt].label} — ${FORMATS[preferredFormat].label} was last published`);
  } else if (formatRecentIndex > 0 && formatRecentIndex < 3) {
    score -= 3;
    reasons.push(`${FORMATS[preferredFormat].label} used recently (still OK)`);
  } else {
    reasons.push(`${FORMATS[preferredFormat].label} not used in last 3 posts`);
  }

  return { score, format, excluded: false, reasons };
}

function alternateFormat(primary: FormatKey, category: string): FormatKey {
  const map: Record<FormatKey, FormatKey> = {
    "case-study": "how-to",
    "how-to": "listicle",
    listicle: "how-to",
    "pillar-post": "faq",
    "trend-piece": "thought-leadership",
    comparison: "faq",
    "thought-leadership": "listicle",
    faq: "how-to",
  };
  if (category === "industry-news" && primary !== "trend-piece") return "trend-piece";
  return map[primary];
}

export function buildSubject(signal: Signal, format: FormatKey): { subject: string; angle: string } {
  const kw = signal.keywords[0] ?? "ai in finance";
  const headlineLead = signal.headline.replace(/:.*$/, "").trim();

  switch (format) {
    case "trend-piece":
      return {
        subject: `What ${headlineLead} means for finance teams`,
        angle: `Fast read on what changes for CFOs and controllers — summarize the news in one paragraph, spell out the workflow implication, cite the source, publish within 48 hours.`,
      };
    case "how-to":
      return {
        subject: toHowToTitle(kw),
        angle: `Hands-on walkthrough with Concourse as the tool — numbered steps, a worked example using a real finance workflow (flux, close, AR aging), and a "common mistakes" section. Close with a CTA to try it.`,
      };
    case "listicle":
      return {
        subject: `${pickListCount(signal)} ways finance teams are using ${sentenceCase(kw)}`,
        angle: `7–10 items, each with a bold subhead and a concrete Concourse example or metric (hours saved, % manual work cut). Built to be shared in finance Slack channels.`,
      };
    case "case-study":
      return {
        subject: `Case study: how a finance team put ${sentenceCase(kw)} into production`,
        angle: `Outcome-first — lead with the result (e.g. "CurbWaste cut close review by 2 days"), then challenge → Concourse workflow → quantified metrics. Only cite real customers; never fabricate quotes.`,
      };
    case "pillar-post":
      return {
        subject: `The complete guide to ${sentenceCase(kw)}`,
        angle: `Authoritative long-form for ${kw} — link internally to integration pages (NetSuite, Snowflake) and use-case pages (flux analysis, month-end close). Anchors the topic for sustained organic traffic.`,
      };
    case "comparison":
      return {
        subject: `${titleCasePhrase(kw)} vs the alternatives: an honest comparison`,
        angle: `Honest table — name the alternatives (Datarails, Pigment, Rogo), lay out criteria, call out real trade-offs. End with "who should use what," favoring workflow-level agents for teams ready to automate, not dashboard.`,
      };
    case "thought-leadership":
      return {
        subject: `Our POV: ${headlineLead}`,
        angle: `Directional claim with a defensible framework. Cite Concourse proof points (6x analysis, 75% manual reduction) and name where point solutions fall short. Written for CFOs and VPs who read fast and value density.`,
      };
    case "faq":
      return {
        subject: `${titleCasePhrase(kw)}: the questions finance leaders are asking`,
        angle: `AEO-engineered Q&A — the questions finance leaders type into ChatGPT and Perplexity about ${kw}. Each answer self-contained, schema-friendly, direct in the first two sentences.`,
      };
    default:
      return { subject: signal.headline, angle: "" };
  }
}

function toHowToTitle(kw: string): string {
  const normalized = kw.toLowerCase().trim();
  if (/^how to /.test(normalized)) return sentenceCase(kw);
  if (/^(with|using|for) /.test(normalized)) {
    return `How to work ${normalized}`;
  }
  if (/\b(automation|automate|forecasting|reconciliation|commentary|reporting|agent|agents|benchmark|disclosure|estimate|estimates|guidance)\b/.test(normalized)) {
    return `How to implement ${normalized} on your finance team`;
  }
  return `How to get started with ${normalized}`;
}

function pickListCount(signal: Signal): string {
  const seed = signal.id.charCodeAt(signal.id.length - 1);
  const options = ["7", "9", "11", "15"];
  return options[seed % options.length];
}

const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "the", "to", "vs", "with",
]);

function titleCasePhrase(s: string): string {
  const words = s.split(/\s+/);
  return words
    .map((w, i) => {
      const lower = w.toLowerCase();
      if (i !== 0 && i !== words.length - 1 && SMALL_WORDS.has(lower)) return lower;
      if (/^[a-z]$/.test(w[0])) return w[0].toUpperCase() + w.slice(1);
      return w;
    })
    .join(" ");
}

function sentenceCase(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

export type RecOptions = {
  signals: Signal[];
  publications: Publication[];
  limit?: number;
};

export function recommend({
  signals,
  publications,
  limit = 3,
}: RecOptions): Recommendation[] {
  const recentFormats = getRecentFormats(publications, 3);

  const scored = signals
    .map((s) => ({ signal: s, ...scoreSignal(s, publications, recentFormats) }))
    .filter((r) => !r.excluded)
    .sort((a, b) => b.score - a.score);

  const picked: Recommendation[] = [];
  const usedFormats = new Set<FormatKey>();

  for (const r of scored) {
    const format = resolveFormat(r.format, r.signal.category, usedFormats, recentFormats);
    const { subject, angle } = buildSubject(r.signal, format);
    const urgency = urgencyFor(r.signal, format);

    picked.push({
      id: `rec-${r.signal.id}`,
      signalId: r.signal.id,
      subject,
      angle,
      format,
      urgency,
      rationale: buildRationale(r.signal, format, r.reasons),
      primaryKeyword: r.signal.keywords[0] ?? "ai for finance",
      secondaryKeywords: r.signal.keywords.slice(1, 4),
    });
    usedFormats.add(format);

    if (picked.length >= limit) break;
  }

  return picked;
}

function resolveFormat(
  preferred: FormatKey,
  category: string,
  used: Set<FormatKey>,
  recent: FormatKey[],
): FormatKey {
  const chain: FormatKey[] = [preferred, alternateFormat(preferred, category)];
  const fallback: FormatKey[] =
    category === "industry-news"
      ? ["trend-piece", "thought-leadership", "faq", "how-to", "listicle", "pillar-post", "comparison", "case-study"]
      : category === "competitor-content"
        ? ["thought-leadership", "comparison", "listicle", "faq", "how-to", "pillar-post", "trend-piece", "case-study"]
        : ["how-to", "listicle", "faq", "thought-leadership", "pillar-post", "comparison", "case-study", "trend-piece"];

  for (const f of chain) {
    if (!used.has(f) && recent[0] !== f) return f;
  }
  for (const f of fallback) {
    if (!used.has(f)) return f;
  }
  return preferred;
}

function buildRationale(
  signal: Signal,
  format: FormatKey,
  _reasons: string[],
): string {
  const gist = firstSentence(signal.summary);
  const strategic = strategicLine(signal, format);
  return `${gist} ${strategic}`;
}

function firstSentence(s: string): string {
  const trimmed = s.trim();
  const match = trimmed.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : trimmed).trim();
}

function strategicLine(signal: Signal, format: FormatKey): string {
  const hours = hoursSince(signal.publishedAt);
  const days = Math.round(hours / 24);
  const timeWord =
    hours < 24
      ? `Only ${Math.max(1, Math.round(hours))} hours in`
      : hours < 72
        ? `${days} ${days === 1 ? "day" : "days"} in`
        : `Late in the cycle but still uncontested`;

  const audience: Record<Signal["category"], string> = {
    "industry-news": "CFOs are searching for a clear read",
    "trending-topic": "search demand is spiking",
    "competitor-content": "a competitor is already staking a claim",
    "enterprise-fintech": "buyers are re-evaluating their stack",
  };

  const strategy: Record<FormatKey, string> = {
    "trend-piece":
      "a fast take puts Concourse at the top of the result before peers publish",
    "thought-leadership":
      "staking a defensible POV now separates Concourse from point solutions and defends rank",
    "how-to":
      "a practical walkthrough earns trust with teams implementing this and converts high-intent traffic",
    comparison:
      "a clear head-to-head converts bottom-funnel buyers comparing options",
    "case-study":
      "a named customer story with real numbers closes late-funnel deals",
    listicle:
      "a scannable roundup gets shared in finance Slack and on LinkedIn",
    "pillar-post":
      "an authoritative guide anchors the topic for sustained organic traffic",
    faq: "FAQ structure wins ChatGPT, Perplexity, and Google AI Overviews",
  };

  return `${timeWord} from ${signal.source} — ${audience[signal.category]}, and ${strategy[format]}.`;
}

export function buildWhyItMatters(signal: Signal): string {
  const kw = signal.keywords[0] ?? "AI for finance";
  switch (signal.category) {
    case "industry-news":
      return `CFOs are searching for guidance on ${kw} right now. A clear Concourse take published this week earns trust with buyers before the news cycle cools.`;
    case "trending-topic":
      return `Buyer search intent on ${kw} is live. Publishing into this window captures active demand while the wave is cresting — and before competitors rank.`;
    case "enterprise-fintech":
      return `When adjacent fintech ships in this space, our audience re-evaluates their stack. A clean breakdown positions Concourse as the finance-native, workflow-level answer to point tools.`;
    case "competitor-content":
      return `A competitor just staked a claim on ${kw}. Concourse's POV defends search rank and reminds buyers why workflow-level agents beat dashboards.`;
    default:
      return "";
  }
}

export type SignalSuggestion = {
  format: FormatKey;
  subject: string;
  angle: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  whyItMatters: string;
  impactLabel: { text: string; tone: "high" | "solid" | "neutral" };
};

export function suggestFromSignal(signal: Signal): SignalSuggestion {
  const format = pickFormatForSubject(signal.category, signal.keywords);
  const { subject, angle } = buildSubject(signal, format);
  const impactLabel =
    signal.importance >= 85
      ? { text: "High impact", tone: "high" as const }
      : signal.importance >= 70
        ? { text: "Worth covering", tone: "solid" as const }
        : { text: "Watch list", tone: "neutral" as const };
  return {
    format,
    subject,
    angle,
    primaryKeyword: signal.keywords[0] ?? "ai for finance",
    secondaryKeywords: signal.keywords.slice(1, 4),
    whyItMatters: buildWhyItMatters(signal),
    impactLabel,
  };
}
