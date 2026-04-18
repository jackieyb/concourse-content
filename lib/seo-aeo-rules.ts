export const SEO_AEO_RULES = `
# SEO and AEO rules (apply to every piece)

The goal is dual-ranking: traditional SEO (Google organic) and AEO (ChatGPT, Perplexity, Google AI Overviews, Claude). The rules below are selected specifically for the overlap — patterns that help both.

## AEO-first structure
- Open with a direct-answer TL;DR in the first 50-70 words. LLMs lift this verbatim as the quoted answer. It should be a complete, self-contained answer to the implied question of the title, not a teaser.
- Phrase at least half of your H2s as questions the target reader actually types (e.g. "How do AI agents reduce month-end close time?"). LLMs use H2s as retrieval anchors.
- Use short, quotable sentences. Target under 22 words per sentence. Short sentences get quoted more.
- Include a dedicated FAQ section with 4-6 questions. This populates the faq array in the output and is the single highest-leverage AEO move.
- Name key entities (Concourse, specific product names, named workflows) in the first paragraph. LLMs need entity anchoring.
- Include dated claims where true ("as of Q1 2026", "in the 2025 Gartner survey"). Recency signals boost AEO ranking.
- Use lists and tables wherever natural. LLMs extract structured data preferentially.

## Traditional SEO
- One clear primary keyword and 2-3 secondary keywords, identified up front and returned in the structured output.
- Primary keyword appears in: title, H1, first 100 words, one H2, and the meta description.
- Meta title under 60 characters, meta description 140-160 characters, both written for click-through not keyword stuffing.
- URL slug is short (3-6 words), all lowercase, hyphen-separated, derived from primary keyword.
- Use H2/H3 hierarchy correctly — never skip levels.
- Suggest 2-4 internal link anchor phrases (returned in internalLinkSuggestions) so the editor can hyperlink them to related Concourse content.
- Avoid keyword stuffing. One keyword mention per 200-300 words feels natural.

## Content quality bar
- Every claim needs a source, a customer metric, or explicit framing as opinion. No vague "studies show."
- Include at least one original framework, checklist, table, or framework the reader can steal. Citation-worthy content gets cited, and LLMs prefer to cite structured originals.
- Avoid filler transitions. Never write "In conclusion," "It is important to note," or "In today's fast-paced world."
- No AI tells — no "delve," no "tapestry," no "whilst," no "it's worth noting that."
- Examples beat abstractions. If you assert something, immediately give a concrete finance workflow it applies to.
- End with a concrete, specific next step — not a generic "reach out to learn more."

## Voice reference (structural model, not brand copy)
- Model the H2 rhythm, scannable explainer voice, and mid-article comparison tables on venasolutions.com/blog — a site that ranks consistently for finance-automation terms and gets cited in LLM answers.
- Specifically borrow their habits of: leading each section with a one-sentence answer, using "What is X?" / "Why does X matter?" / "How do you do X?" style H2s, and including a short definition box early in the piece.
- Do NOT copy Vena's voice or phrasing directly — keep Concourse's peer-to-peer, outcome-first tone.

## Keyword discipline
- Prefer keywords that already appear in Concourse's established SEO Keyword Clusters above. If the brief supplies a primary or secondary, keep it unless it clearly conflicts with the cluster list; then swap in the closest cluster match and note it in the structured output.
- Never invent stuffed phrases like "AI-powered finance automation platform software tool." Keep keywords natural and as close to how finance leaders actually search.

## Format-specific adjustments
- How-to: numbered steps, each with a clear action verb. Include a worked example.
- Listicle: the list IS the value — items must be genuinely distinct, not padded.
- Case study: name the customer, their pain point, what they tried, what worked, the metric, a lesson generalizable to the reader.
- Pillar post: table of contents at the top (in the body as a list), linked H2s, meant to rank for the primary keyword for 2+ years.
- Trend piece: open with the news hook in the first sentence, explain "what it means for your finance team" by paragraph 3, publish within 48-72h of the triggering event.
- Comparison: neutral table comparing dimensions, followed by honest "when to choose X" guidance.
- Thought leadership: clear contrarian or original claim stated up front, defended with evidence.
- FAQ: every answer is self-contained — a reader could land on any one Q and get full value.
`.trim();
