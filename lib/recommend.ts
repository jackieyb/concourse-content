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
    signal.category === "competitor-content" ||
    signal.category === "product-launch";

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
  const usedStreams = new Set<Signal["stream"]>();

  const framingOrder: Framing[] = shuffleFramings(
    scored[0]?.signal.id ?? "seed",
  );

  const streamsAvailable = new Set(scored.map((r) => r.signal.stream));
  const coverAllStreams = streamsAvailable.size >= Math.min(3, limit);

  const orderedPool = [...scored];
  const remaining = () => orderedPool;
  const pickNext = (): (typeof scored)[number] | undefined => {
    if (coverAllStreams && usedStreams.size < Math.min(3, limit)) {
      const slotsLeft = limit - picked.length;
      const streamsLeft = Math.min(3, limit) - usedStreams.size;
      if (slotsLeft <= streamsLeft) {
        const preferred = remaining().find(
          (r) => !usedStreams.has(r.signal.stream),
        );
        if (preferred) {
          orderedPool.splice(orderedPool.indexOf(preferred), 1);
          return preferred;
        }
      }
    }
    return orderedPool.shift();
  };

  let next = pickNext();
  while (next && picked.length < limit) {
    const format = resolveFormat(
      next.format,
      next.signal.category,
      usedFormats,
      recentFormats,
    );
    const { subject, angle } = buildSubject(next.signal, format);
    const urgency = urgencyFor(next.signal, format);
    const framing = framingOrder[picked.length % framingOrder.length];

    picked.push({
      id: `rec-${next.signal.id}`,
      signalId: next.signal.id,
      subject,
      angle,
      format,
      urgency,
      rationale: buildRationale(next.signal, format, framing),
      primaryKeyword: next.signal.keywords[0] ?? "ai for finance",
      secondaryKeywords: next.signal.keywords.slice(1, 4),
    });
    usedFormats.add(format);
    usedStreams.add(next.signal.stream);

    next = pickNext();
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

type Framing = "tension" | "timing" | "vacuum" | "search";

const ALL_FRAMINGS: Framing[] = ["tension", "timing", "vacuum", "search"];

function shuffleFramings(seed: string): Framing[] {
  const code = seed.charCodeAt(0) + seed.charCodeAt(seed.length - 1);
  const start = code % ALL_FRAMINGS.length;
  return [
    ALL_FRAMINGS[start],
    ALL_FRAMINGS[(start + 1) % ALL_FRAMINGS.length],
    ALL_FRAMINGS[(start + 2) % ALL_FRAMINGS.length],
    ALL_FRAMINGS[(start + 3) % ALL_FRAMINGS.length],
  ];
}

function buildRationale(
  signal: Signal,
  format: FormatKey,
  framing: Framing,
): string {
  switch (framing) {
    case "tension":
      return tensionRationale(signal, format);
    case "timing":
      return timingRationale(signal, format);
    case "vacuum":
      return vacuumRationale(signal, format);
    case "search":
      return searchRationale(signal, format);
  }
}

function firstSentence(s: string): string {
  const trimmed = s.trim();
  const match = trimmed.match(/^[^.!?]*[.!?]/);
  return (match ? match[0] : trimmed).trim();
}

function tensionRationale(signal: Signal, format: FormatKey): string {
  const gist = firstSentence(signal.summary);
  const kw = signal.keywords[0] ?? "this shift";
  const close: Record<FormatKey, string> = {
    "trend-piece": `A ${FORMATS[format].label.toLowerCase()} names the contradiction before peers smooth it over.`,
    "thought-leadership": `Concourse is positioned to name that contradiction — point solutions can't, because owning the whole workflow is the only answer.`,
    "how-to": `Teams resolving that contradiction need a concrete playbook this week, not a hot take.`,
    comparison: `A head-to-head reframes ${kw} as a buying decision, not a trend to watch.`,
    "case-study": `A named customer story collapses that contradiction into an outcome a buyer can cite internally.`,
    listicle: `A scannable list surfaces the ${kw} tradeoffs finance teams are already arguing about in Slack.`,
    "pillar-post": `An authoritative guide resolves the contradiction for the readers who land here for the next 12 months.`,
    faq: `AEO-structured answers catch buyers typing the exact tension into ChatGPT.`,
  };
  return `${gist} That creates a contradiction finance teams can't ignore — the operating pressure isn't slowing down while the compliance bar keeps rising. ${close[format]}`;
}

function timingRationale(signal: Signal, format: FormatKey): string {
  const hours = hoursSince(signal.publishedAt);
  const days = Math.max(1, Math.round(hours / 24));
  const window =
    hours < 36
      ? "48-hour news-jack window"
      : hours < 96
        ? "4-day follow-through window"
        : "late-but-open slot before secondary coverage lands";
  const gist = firstSentence(signal.summary);
  const close: Record<FormatKey, string> = {
    "trend-piece": `${FORMATS[format].label} format fits the window — short, pegged, publish today.`,
    "thought-leadership": `The same ${days}-day window is when a defensible POV out-ranks reactive coverage.`,
    "how-to": `Teams planning around this will search for implementation detail within the week.`,
    comparison: `Buyers who see this news will open three tabs comparing vendors by Thursday.`,
    "case-study": `A customer-backed piece lands harder when the event is still on the front page.`,
    listicle: `A roundup hits LinkedIn feeds while the story is still trending.`,
    "pillar-post": `Publishing the anchor piece into a live event captures the backlink surge.`,
    faq: `Questions spike in the first ${days} days — AEO structure is what gets cited.`,
  };
  return `${gist} That opens a ${window}. ${close[format]}`;
}

function vacuumRationale(signal: Signal, format: FormatKey): string {
  const gist = firstSentence(signal.summary);
  const competitor =
    signal.category === "competitor-content"
      ? signal.source
      : pickSilentCompetitor(signal);
  const close: Record<FormatKey, string> = {
    "trend-piece": `A fast ${FORMATS[format].label.toLowerCase()} this week owns the search result before anyone responds.`,
    "thought-leadership": `The lane is open to stake a finance-native POV that ${competitor} can't credibly make.`,
    "how-to": `Concourse's workflow-level integrations with NetSuite, Snowflake, and Ramp make this a demonstration ${competitor} can't match.`,
    comparison: `A head-to-head with ${competitor} is a keyword they won't publish under themselves.`,
    "case-study": `Real customer numbers beat ${competitor}'s hypothetical framing in every bottom-funnel search.`,
    listicle: `A finance-workflow listicle beats ${competitor}'s dashboard-first framing for operator buyers.`,
    "pillar-post": `Publishing the definitive guide now makes ${competitor}'s later attempts look derivative.`,
    faq: `AEO-structured Q&A under this topic is untouched — first mover gets cited for months.`,
  };
  return `${gist} No one in the vendor set has shipped a credible take yet — ${competitor} has been quiet on this exact angle. ${close[format]}`;
}

function searchRationale(signal: Signal, format: FormatKey): string {
  const gist = firstSentence(signal.summary);
  const kw = signal.keywords[0] ?? "ai for finance";
  const secondary = signal.keywords[1] ?? "finance workflow";
  const close: Record<FormatKey, string> = {
    "trend-piece": `Publishing into a rising query before the SERP crystallizes is how you rank without backlinks.`,
    "thought-leadership": `Ranking for an emerging query with a POV piece compounds — it becomes the citation everyone else links to.`,
    "how-to": `A practical walkthrough is what finance teams actually click on when they type "${kw}" into Google this week.`,
    comparison: `"${kw} vs" queries are about to spike — a comparison page is a direct conversion path.`,
    "case-study": `A customer proof page under "${kw}" converts high-intent traffic other formats can't capture.`,
    listicle: `"${secondary}" roundups are what gets screenshotted into Slack threads searching "${kw}."`,
    "pillar-post": `A pillar anchor on "${kw}" owns the topic cluster as satellite queries branch off it.`,
    faq: `LLMs quote FAQ structure verbatim — capturing the answer now owns the AI-Overview surface.`,
  };
  return `${gist} That's about to reshape how finance leaders search — expect a surge on "${kw}" and "${secondary}" over the next two weeks. ${close[format]}`;
}

function pickSilentCompetitor(signal: Signal): string {
  const roster = ["Rogo", "Nominal", "Datarails", "Pigment", "Aleph"];
  const idx = (signal.id.charCodeAt(0) + signal.id.length) % roster.length;
  return roster[idx];
}

export function buildWhyItMatters(signal: Signal): string {
  const kw = signal.keywords[0] ?? "AI for finance";
  switch (signal.category) {
    case "industry-news":
      return `Buyer intent on ${kw} is spiking this week. A Concourse take published now earns trust before the news cycle cools and before competitors rank.`;
    case "trending-topic":
      return `Search demand on ${kw} is live. Publishing into this window captures active traffic while the wave is cresting.`;
    case "enterprise-fintech":
      return `Adjacent fintech ships in this space send our audience to re-evaluate. A clean breakdown positions Concourse as the workflow-level answer to point tools.`;
    case "competitor-content":
      return `A competitor just staked a claim on ${kw}. Concourse's POV defends search rank and reminds buyers why workflow-level agents beat dashboards.`;
    case "customer-pain":
      return `Prospects are asking about this in discovery right now. A public answer shortens sales cycles and ranks on the same queries buyers type after calls.`;
    case "customer-win":
      return `Real customer proof with specific numbers is the highest-converting late-funnel asset we can publish. Turn the win into a named case study.`;
    case "sales-objection":
      return `Sales is losing deals until there's a public, linkable answer to this objection. One durable piece of content unblocks every future pipeline call.`;
    case "product-launch":
      return `Our launch is the news peg. A trend-piece + how-to pairing doubles the organic surface area and gives sales a usable link within 48 hours.`;
    case "product-integration":
      return `New integrations are search magnets — "${kw}" pulls high-intent traffic from teams already using those tools and looking to connect them.`;
    case "product-milestone":
      return `Milestone numbers are citation bait. A POV piece anchored on the metric earns inbound links from analysts, press, and partner blogs.`;
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
