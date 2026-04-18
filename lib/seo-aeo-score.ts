import type {
  FAQItem,
  PortableContent,
  PortableTextBlock,
  Publication,
  ScoreCheck,
  SeoAeoScore,
} from "@/types";

function portableToPlain(blocks: PortableContent[]): string {
  return blocks
    .map((b) => {
      if (b._type === "block") {
        return b.children.map((c) => c.text).join(" ");
      }
      if (b._type === "table") {
        return b.rows.map((r) => r.cells.join(" ")).join(" ");
      }
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHeadings(blocks: PortableContent[], level: "h2" | "h3"): string[] {
  return blocks
    .filter(
      (b): b is PortableTextBlock => b._type === "block" && b.style === level,
    )
    .map((b) => b.children.map((c) => c.text).join(" "));
}

function paragraphs(blocks: PortableContent[]): string[] {
  return blocks
    .filter(
      (b): b is PortableTextBlock =>
        b._type === "block" && b.style === "normal",
    )
    .map((b) => b.children.map((c) => c.text).join(" "));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const lc = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let count = 0;
  let i = 0;
  while ((i = lc.indexOf(n, i)) !== -1) {
    count += 1;
    i += n.length;
  }
  return count;
}

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

function avgSentenceLength(text: string): number {
  const sentences = text
    .split(/[.!?]+\s/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return 0;
  const total = sentences.reduce((acc, s) => acc + wordCount(s), 0);
  return total / sentences.length;
}

function check(
  label: string,
  passed: boolean,
  value: string,
  max: number,
  partialPoints?: number,
): ScoreCheck {
  return {
    label,
    passed,
    value,
    points: passed ? max : (partialPoints ?? 0),
    max,
  };
}

function scoreSeo(pub: Publication): ScoreCheck[] {
  const c = pub.content;
  const title = c?.title ?? pub.title ?? "";
  const metaTitle = c?.metaTitle ?? "";
  const metaDescription = c?.metaDescription ?? "";
  const slug = c?.slug ?? pub.slug ?? "";
  const primary = (c?.primaryKeyword ?? pub.primaryKeyword ?? "").toLowerCase();
  const secondary = c?.secondaryKeywords ?? [];
  const internalLinks = c?.internalLinkSuggestions ?? [];
  const body = c?.body ? portableToPlain(c.body) : "";
  const h2s = c?.body ? getHeadings(c.body, "h2") : [];

  const titleLen = title.length;
  const titleInRange = titleLen >= 40 && titleLen <= 70;
  const titlePartial = titleLen >= 30 && titleLen <= 80 ? 5 : 0;

  const metaTitleLen = metaTitle.length;
  const metaTitleInRange = metaTitleLen >= 50 && metaTitleLen <= 60;
  const metaTitlePartial =
    metaTitleLen >= 40 && metaTitleLen <= 65 ? 4 : 0;

  const metaDescLen = metaDescription.length;
  const metaDescInRange = metaDescLen >= 140 && metaDescLen <= 160;
  const metaDescPartial = metaDescLen >= 120 && metaDescLen <= 175 ? 4 : 0;

  const slugLen = slug.split("-").filter(Boolean).length;
  const slugOk = slugLen >= 3 && slugLen <= 6 && /^[a-z0-9-]+$/.test(slug);

  const primaryInTitle = primary && title.toLowerCase().includes(primary);
  const primaryInMetaDesc =
    primary && metaDescription.toLowerCase().includes(primary);
  const primaryInSlug = primary && slug.includes(primary.replace(/\s+/g, "-"));
  const primaryInAnyH2 =
    primary && h2s.some((h) => h.toLowerCase().includes(primary));

  const bodyWords = wordCount(body);
  const primaryDensity =
    bodyWords > 0 && primary
      ? (countOccurrences(body, primary) * primary.split(/\s+/).length) /
        bodyWords
      : 0;
  const densityHealthy = primaryDensity >= 0.003 && primaryDensity <= 0.012;
  const densityPartial =
    primaryDensity > 0 && primaryDensity <= 0.02 ? 3 : 0;

  const internalLinksOk = internalLinks.length >= 2 && internalLinks.length <= 4;
  const secondaryOk = secondary.length >= 2 && secondary.length <= 3;

  const h2Count = h2s.length;
  const h2Ok = h2Count >= 4;

  const checks: ScoreCheck[] = [
    check(
      "Title length 40–70 chars",
      Boolean(titleInRange),
      `${titleLen} chars`,
      8,
      titlePartial,
    ),
    check(
      "Meta title 50–60 chars",
      Boolean(metaTitleInRange),
      metaTitle ? `${metaTitleLen} chars` : "missing",
      6,
      metaTitlePartial,
    ),
    check(
      "Meta description 140–160 chars",
      Boolean(metaDescInRange),
      metaDescription ? `${metaDescLen} chars` : "missing",
      6,
      metaDescPartial,
    ),
    check(
      "Slug 3–6 hyphenated words",
      Boolean(slugOk),
      slug ? `${slugLen} words` : "missing",
      4,
    ),
    check(
      "Primary keyword in title",
      Boolean(primaryInTitle),
      primary ? (primaryInTitle ? "yes" : "no") : "no keyword",
      10,
    ),
    check(
      "Primary keyword in meta description",
      Boolean(primaryInMetaDesc),
      primary ? (primaryInMetaDesc ? "yes" : "no") : "—",
      6,
    ),
    check(
      "Primary keyword in slug",
      Boolean(primaryInSlug),
      primary ? (primaryInSlug ? "yes" : "no") : "—",
      4,
    ),
    check(
      "Primary keyword in H2",
      Boolean(primaryInAnyH2),
      primary ? (primaryInAnyH2 ? "yes" : "no") : "—",
      6,
    ),
    check(
      "Keyword density 0.3–1.2%",
      Boolean(densityHealthy),
      bodyWords
        ? `${(primaryDensity * 100).toFixed(2)}%`
        : "no body",
      6,
      densityPartial,
    ),
    check(
      "2–3 secondary keywords",
      Boolean(secondaryOk),
      `${secondary.length}`,
      4,
    ),
    check(
      "2–4 internal links",
      Boolean(internalLinksOk),
      `${internalLinks.length}`,
      4,
    ),
    check(
      "≥ 4 H2 sections",
      Boolean(h2Ok),
      `${h2Count}`,
      6,
    ),
  ];

  return checks;
}

function scoreAeo(pub: Publication, format: string): ScoreCheck[] {
  const c = pub.content;
  const tldr = c?.tldr ?? "";
  const faq: FAQItem[] = c?.faq ?? [];
  const body = c?.body ?? [];
  const h2s = getHeadings(body, "h2");
  const paras = paragraphs(body);
  const plainBody = portableToPlain(body);
  const firstPara = paras[0] ?? "";

  const tldrWords = wordCount(tldr);
  const tldrInRange = tldrWords >= 45 && tldrWords <= 80;
  const tldrPartial = tldrWords >= 30 && tldrWords <= 100 ? 4 : 0;

  const questionH2s = h2s.filter((h) => /\?\s*$/.test(h.trim())).length;
  const halfQuestionH2 = h2s.length > 0 && questionH2s / h2s.length >= 0.4;
  const questionPartial = questionH2s >= 1 ? 3 : 0;

  const faqCount = faq.length;
  const faqCountOk = faqCount >= 4 && faqCount <= 6;

  const faqAnswerWords = faq.map((f) => wordCount(f.answer));
  const faqAnswerLenOk =
    faqAnswerWords.length > 0 &&
    faqAnswerWords.every((w) => w >= 30 && w <= 100);
  const faqAnswerPartial =
    faqAnswerWords.length > 0 &&
    faqAnswerWords.filter((w) => w >= 25 && w <= 120).length /
      faqAnswerWords.length >=
      0.6
      ? 4
      : 0;

  const conciseSentences =
    plainBody.length > 0 && avgSentenceLength(plainBody) <= 22;
  const sentencePartial =
    plainBody.length > 0 && avgSentenceLength(plainBody) <= 26 ? 3 : 0;

  const filler =
    /\b(in conclusion|it is important to note|in today's fast-paced|delve|tapestry|whilst)\b/i;
  const fillerFree = plainBody.length > 0 && !filler.test(plainBody);

  const entityEarly =
    firstPara.length > 0 && /\b(concourse|netsuite|ramp|snowflake)\b/i.test(firstPara);

  const openerDirect =
    tldr.length > 0 &&
    !/^(in this post|this article|we will|welcome|today)/i.test(tldr.trim());

  const listsOrTables = body.some(
    (b) =>
      (b._type === "block" && (b as PortableTextBlock).listItem) ||
      b._type === "table",
  );

  const formatBoost =
    format === "faq" && faqCount >= 5
      ? 4
      : format === "pillar-post" && h2s.length >= 6
        ? 3
        : 0;

  const checks: ScoreCheck[] = [
    check(
      "TL;DR 45–80 words (LLM-quotable)",
      Boolean(tldrInRange),
      tldr ? `${tldrWords} words` : "missing",
      12,
      tldrPartial,
    ),
    check(
      "TL;DR opens with direct answer",
      Boolean(openerDirect),
      tldr ? (openerDirect ? "yes" : "starts with filler") : "—",
      6,
    ),
    check(
      "≥ 40% of H2s phrased as questions",
      Boolean(halfQuestionH2),
      h2s.length
        ? `${questionH2s} of ${h2s.length}`
        : "no H2s",
      10,
      questionPartial,
    ),
    check(
      "4–6 FAQ items",
      Boolean(faqCountOk),
      `${faqCount}`,
      12,
    ),
    check(
      "FAQ answers 30–100 words each",
      Boolean(faqAnswerLenOk),
      faq.length
        ? `${Math.min(...faqAnswerWords)}–${Math.max(...faqAnswerWords)} words`
        : "no FAQ",
      8,
      faqAnswerPartial,
    ),
    check(
      "Avg sentence ≤ 22 words",
      Boolean(conciseSentences),
      plainBody
        ? `${avgSentenceLength(plainBody).toFixed(1)} words`
        : "no body",
      6,
      sentencePartial,
    ),
    check(
      "No AI-tell filler phrases",
      Boolean(fillerFree),
      plainBody ? (fillerFree ? "clean" : "has filler") : "—",
      4,
    ),
    check(
      "Entity anchoring in first paragraph",
      Boolean(entityEarly),
      firstPara ? (entityEarly ? "yes" : "no") : "—",
      6,
    ),
    check(
      "Lists or tables present",
      Boolean(listsOrTables),
      body.length ? (listsOrTables ? "yes" : "no") : "—",
      4,
    ),
    check(
      "Format-specific structure bonus",
      formatBoost > 0,
      formatBoost > 0 ? "met" : "—",
      4,
    ),
  ];

  return checks;
}

function normalize(checks: ScoreCheck[]): number {
  const totalMax = checks.reduce((a, c) => a + c.max, 0);
  if (!totalMax) return 0;
  const totalPoints = checks.reduce((a, c) => a + c.points, 0);
  return Math.round((totalPoints / totalMax) * 100);
}

export function scorePublication(pub: Publication): SeoAeoScore {
  const seoChecks = scoreSeo(pub);
  const aeoChecks = scoreAeo(pub, pub.format);
  return {
    seo: normalize(seoChecks),
    aeo: normalize(aeoChecks),
    seoChecks,
    aeoChecks,
    partial: !pub.content,
  };
}

export function scoreBand(score: number): {
  label: "Strong" | "Solid" | "Work to do";
  cls: string;
} {
  if (score >= 80) return { label: "Strong", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (score >= 60) return { label: "Solid", cls: "text-amber-700 bg-amber-50 border-amber-200" };
  return { label: "Work to do", cls: "text-rose-700 bg-rose-50 border-rose-200" };
}
