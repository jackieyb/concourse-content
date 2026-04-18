import type { Format, FormatKey } from "@/types";

export const FORMATS: Record<FormatKey, Format> = {
  "how-to": {
    key: "how-to",
    label: "How-To Guide",
    description: "Step-by-step instructions for accomplishing a specific finance workflow with AI agents.",
    bestFor: "Practical workflows, product walkthroughs, repeatable processes (e.g. 'How to automate flux analysis with AI').",
    typicalUrgency: "yellow",
    wordCountTarget: [1400, 2000],
  },
  listicle: {
    key: "listicle",
    label: "Listicle",
    description: "Numbered or bulleted roundup of tools, prompts, frameworks, or examples.",
    bestFor: "Highly shareable, scannable content ('30 AI prompts finance teams use', 'Top AI tools for FP&A').",
    typicalUrgency: "yellow",
    wordCountTarget: [1200, 1800],
  },
  "case-study": {
    key: "case-study",
    label: "Case Study",
    description: "Deep customer story with pain point, solution, and quantified outcomes.",
    bestFor: "Proof points with specific metrics, industry-specific validation, late-funnel trust.",
    typicalUrgency: "yellow",
    wordCountTarget: [900, 1400],
  },
  "pillar-post": {
    key: "pillar-post",
    label: "Pillar Post",
    description: "Long, authoritative guide covering a foundational topic end-to-end.",
    bestFor: "SEO foundations on evergreen topics ('The complete guide to AI for AP automation'). Earns backlinks and organic traffic.",
    typicalUrgency: "yellow",
    wordCountTarget: [2500, 4000],
  },
  "trend-piece": {
    key: "trend-piece",
    label: "Trend Piece",
    description: "Timely take on a breaking story or emerging shift, published while the topic is hot.",
    bestFor: "News-jack moments — funding rounds, product launches, regulatory changes, market shifts.",
    typicalUrgency: "red",
    wordCountTarget: [800, 1200],
  },
  comparison: {
    key: "comparison",
    label: "Comparison / Vs. Post",
    description: "Head-to-head comparison of approaches, tools, or categories.",
    bestFor: "High-intent search ('AI agents vs RPA', 'Concourse vs Datarails'). Captures bottom-funnel traffic.",
    typicalUrgency: "yellow",
    wordCountTarget: [1400, 2200],
  },
  "thought-leadership": {
    key: "thought-leadership",
    label: "Thought Leadership",
    description: "Opinionated POV piece with an original framework or contrarian take.",
    bestFor: "Brand-building, LinkedIn-worthy ideas, citation-worthy original frameworks.",
    typicalUrgency: "yellow",
    wordCountTarget: [1200, 1800],
  },
  faq: {
    key: "faq",
    label: "FAQ Explainer",
    description: "Q&A-structured piece directly answering the questions people type into search engines and LLMs.",
    bestFor: "AEO optimization — ChatGPT, Perplexity, and Google's AI Overviews love this structure.",
    typicalUrgency: "yellow",
    wordCountTarget: [1000, 1600],
  },
};

export const FORMAT_LIST = Object.values(FORMATS);

export function pickFormatForSubject(
  category: string,
  keywords: string[],
): FormatKey {
  const kw = keywords.map((k) => k.toLowerCase()).join(" ");

  if (category === "industry-news" || category === "trending-topic") {
    if (/funding|launch|announce|release|acquisition|regulation/.test(kw)) {
      return "trend-piece";
    }
  }

  if (category === "competitor-content") {
    if (/vs|compare|alternative/.test(kw)) return "comparison";
    return "thought-leadership";
  }

  if (category === "customer-pain") {
    if (/vs|compare|alternative|objection/.test(kw)) return "comparison";
    return "how-to";
  }
  if (category === "customer-win") return "case-study";
  if (category === "sales-objection") {
    if (/vs|compare|alternative/.test(kw)) return "comparison";
    return "faq";
  }
  if (category === "product-launch") return "trend-piece";
  if (category === "product-integration") return "how-to";
  if (category === "product-milestone") return "thought-leadership";

  if (/how to|guide|workflow|process|automate/.test(kw)) return "how-to";
  if (/tools|prompts|examples|ways|tips/.test(kw)) return "listicle";
  if (/customer|saved|roi|outcome/.test(kw)) return "case-study";
  if (/guide|complete|ultimate|everything/.test(kw)) return "pillar-post";

  return "how-to";
}
