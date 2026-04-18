export type Urgency = "red" | "yellow";

export type SignalCategory =
  | "trending-topic"
  | "industry-news"
  | "enterprise-fintech"
  | "competitor-content";

export type Signal = {
  id: string;
  category: SignalCategory;
  headline: string;
  summary: string;
  source: string;
  url?: string;
  publishedAt: string;
  importance: number;
  keywords: string[];
};

export type FormatKey =
  | "how-to"
  | "listicle"
  | "case-study"
  | "pillar-post"
  | "trend-piece"
  | "comparison"
  | "thought-leadership"
  | "faq";

export type Format = {
  key: FormatKey;
  label: string;
  description: string;
  bestFor: string;
  typicalUrgency: Urgency;
  wordCountTarget: [number, number];
};

export type Recommendation = {
  id: string;
  signalId: string;
  subject: string;
  angle: string;
  format: FormatKey;
  urgency: Urgency;
  rationale: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
};

export type PortableTextBlock = {
  _type: "block";
  _key: string;
  style: "normal" | "h1" | "h2" | "h3" | "h4" | "blockquote";
  listItem?: "bullet" | "number";
  level?: number;
  children: Array<{
    _type: "span";
    _key: string;
    text: string;
    marks: string[];
  }>;
  markDefs: Array<{
    _type: string;
    _key: string;
    href?: string;
  }>;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type GeneratedContent = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  tldr: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  body: PortableTextBlock[];
  faq: FAQItem[];
  internalLinkSuggestions: string[];
  callToAction: string;
};

export type Draft = {
  id: string;
  format: FormatKey;
  subject: string;
  angle: string;
  urgency: Urgency;
  content: GeneratedContent | null;
  status: "idle" | "generating" | "ready" | "error";
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type Publication = {
  id: string;
  draftId: string;
  title: string;
  slug: string;
  format: FormatKey;
  urgency: Urgency;
  primaryKeyword: string;
  excerpt: string;
  content: GeneratedContent;
  publishedAt: string;
  mockMetrics?: {
    views: number;
    avgTimeOnPage: string;
    source: "mock";
  };
};
