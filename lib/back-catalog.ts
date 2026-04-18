import type { FormatKey, Publication } from "@/types";
import seed from "@/data/back-catalog.json";

export const SEED_PUBLICATIONS = seed.publications as Publication[];

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
