import type { FormatKey, GeneratedContent, Publication } from "@/types";
import seed from "@/data/back-catalog.json";
import { markdownToPortableText } from "@/lib/portable-text";
import { SEED_CONTENT_DRAFTS } from "@/lib/seed-content";

const rawPublications = seed.publications as Publication[];

export const SEED_PUBLICATIONS: Publication[] = rawPublications.map((pub) => {
  const draft = SEED_CONTENT_DRAFTS[pub.id];
  if (!draft) return pub;
  const content: GeneratedContent = {
    title: pub.title,
    slug: pub.slug,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    excerpt: pub.excerpt,
    tldr: draft.tldr,
    primaryKeyword: pub.primaryKeyword,
    secondaryKeywords: draft.secondaryKeywords,
    body: markdownToPortableText(draft.bodyMd),
    faq: draft.faq,
    internalLinkSuggestions: draft.internalLinkSuggestions,
    callToAction: draft.callToAction,
  };
  return { ...pub, content };
});

export function getRecentFormats(pubs: Publication[], limit = 3): FormatKey[] {
  return [...pubs]
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, limit)
    .map((p) => p.format);
}

export function hasCoveredTopic(pubs: Publication[], keywords: string[]): boolean {
  const haystack = pubs
    .map((p) => `${p.title} ${p.primaryKeyword} ${p.excerpt}`.toLowerCase())
    .join(" | ");
  return keywords.some((k) => haystack.includes(k.toLowerCase()));
}
