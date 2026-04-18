import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, MODELS } from "@/lib/claude";
import { CONCOURSE_CONTEXT } from "@/lib/concourse-context";
import { BRAND_BRIEF } from "@/lib/brand-brief";
import { SEO_AEO_RULES } from "@/lib/seo-aeo-rules";
import { FORMATS } from "@/lib/formats";
import { markdownToPortableText, stripLeadingTldr } from "@/lib/portable-text";
import { slugify } from "@/lib/utils";
import type { FAQItem, FormatKey, GeneratedContent } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type GenerateRequest = {
  subject: string;
  format: FormatKey;
  angle?: string;
  urgency?: "red" | "yellow";
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  signalContext?: string;
};

const CONTENT_TOOL: Anthropic.Tool = {
  name: "submit_content_draft",
  description:
    "Submit the fully-formed content draft. This is the final deliverable — every field must be filled with publish-ready content.",
  input_schema: {
    type: "object",
    required: [
      "title",
      "slug",
      "metaTitle",
      "metaDescription",
      "excerpt",
      "tldr",
      "primaryKeyword",
      "secondaryKeywords",
      "body",
      "faq",
      "internalLinkSuggestions",
      "callToAction",
    ],
    properties: {
      title: {
        type: "string",
        description:
          "The full article H1 / title. Benefit-driven, under 70 characters, includes the primary keyword.",
      },
      slug: {
        type: "string",
        description:
          "URL slug: lowercase, hyphen-separated, 3-6 words, derived from the primary keyword.",
      },
      metaTitle: {
        type: "string",
        description:
          "SEO meta title for the <title> tag. 50-60 characters. Written for click-through, not stuffing.",
      },
      metaDescription: {
        type: "string",
        description:
          "SEO meta description. 140-160 characters. Includes the primary keyword naturally and ends with an implicit reason to click.",
      },
      excerpt: {
        type: "string",
        description:
          "One-sentence excerpt for listing pages and social previews. About 25 words.",
      },
      tldr: {
        type: "string",
        description:
          "The AEO-critical direct-answer opener. 50-70 words. Self-contained — a reader should get the complete answer here. This is what LLMs lift as their quoted answer. No 'In this post we will' — give the answer.",
      },
      primaryKeyword: {
        type: "string",
        description: "The one keyword this piece is optimized to rank for.",
      },
      secondaryKeywords: {
        type: "array",
        items: { type: "string" },
        description:
          "2-3 secondary keywords to weave in naturally across H2s and body.",
        minItems: 2,
        maxItems: 3,
      },
      body: {
        type: "string",
        description:
          "The article body as markdown. Must include: H2s (several phrased as questions), short paragraphs (2-4 sentences each), at least one list or table, concrete finance-workflow examples, at least one real Concourse customer reference or metric where natural, and a closing next-step. No filler transitions. Do NOT include a TL;DR block — the tldr field is rendered separately. Do not include the H1 title here — that's the title field. Do not include the FAQ here — that's the faq field. Target the word count for the chosen format.",
      },
      faq: {
        type: "array",
        description:
          "4-6 self-contained FAQ items engineered for AEO. Each question is phrased the way a finance leader would type it into ChatGPT or Google. Each answer is 40-80 words and stands alone.",
        items: {
          type: "object",
          required: ["question", "answer"],
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
          },
        },
        minItems: 4,
        maxItems: 6,
      },
      internalLinkSuggestions: {
        type: "array",
        items: { type: "string" },
        description:
          "2-4 short anchor-text phrases that should be hyperlinked to related Concourse content in the editor.",
        minItems: 2,
        maxItems: 4,
      },
      callToAction: {
        type: "string",
        description:
          "The concrete closing next step. Specific, not generic. E.g. 'See how Concourse runs flux analysis on your chart of accounts — book a 20-minute demo.'",
      },
    },
  },
};

function buildPrompt(req: GenerateRequest) {
  const fmt = FORMATS[req.format];
  const [minWords, maxWords] = fmt.wordCountTarget;

  const parts = [
    `## Assignment`,
    `Subject: ${req.subject}`,
    req.angle ? `Angle: ${req.angle}` : null,
    `Format: ${fmt.label} — ${fmt.description}`,
    `Format best for: ${fmt.bestFor}`,
    `Target length: ${minWords}-${maxWords} words in the body field.`,
    req.urgency === "red"
      ? `Urgency: TIMELY. Reader will land on this while the triggering event is still news. Open with the news hook. Get to 'what this means for your finance team' within 3 paragraphs.`
      : `Urgency: EVERGREEN. Optimize for durable organic traffic and LLM citation. This piece should be useful in 12 months.`,
    req.primaryKeyword
      ? `Primary keyword (required): "${req.primaryKeyword}"`
      : null,
    req.secondaryKeywords?.length
      ? `Secondary keywords: ${req.secondaryKeywords.map((k) => `"${k}"`).join(", ")}`
      : null,
    req.signalContext
      ? `\n## Signal context (the real-world development prompting this piece)\n${req.signalContext}`
      : null,
    `\n## Your task\nCall the submit_content_draft tool exactly once with the complete, publish-ready draft. Do not output any text outside the tool call. Every field must be filled thoughtfully. This is going to be published to Concourse's blog verbatim if it's good.`,
  ].filter(Boolean);

  return parts.join("\n");
}

export async function POST(req: Request) {
  let body: GenerateRequest;
  try {
    body = (await req.json()) as GenerateRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body?.subject || !body?.format || !FORMATS[body.format]) {
    return NextResponse.json(
      { error: "Missing subject or valid format" },
      { status: 400 },
    );
  }

  let client;
  try {
    client = getAnthropic();
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }

  const system = [
    CONCOURSE_CONTEXT,
    "",
    "---",
    "",
    BRAND_BRIEF,
    "",
    "---",
    "",
    SEO_AEO_RULES,
  ].join("\n");

  const userPrompt = buildPrompt(body);

  try {
    const response = await client.messages.create({
      model: MODELS.generation,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: userPrompt }],
      tools: [CONTENT_TOOL],
      tool_choice: { type: "tool", name: CONTENT_TOOL.name },
    });

    const toolUse = response.content.find(
      (c): c is Extract<typeof c, { type: "tool_use" }> => c.type === "tool_use",
    );
    if (!toolUse) {
      return NextResponse.json(
        { error: "Model did not return a tool call." },
        { status: 502 },
      );
    }

    const input = toolUse.input as Omit<GeneratedContent, "body"> & {
      body: string;
      faq: FAQItem[];
    };

    const strippedBody = stripLeadingTldr(input.body);
    const portableBody = markdownToPortableText(strippedBody);

    const content: GeneratedContent = {
      title: input.title,
      slug: input.slug || slugify(input.title),
      metaTitle: input.metaTitle,
      metaDescription: input.metaDescription,
      excerpt: input.excerpt,
      tldr: input.tldr,
      primaryKeyword: input.primaryKeyword,
      secondaryKeywords: input.secondaryKeywords,
      body: portableBody,
      faq: input.faq,
      internalLinkSuggestions: input.internalLinkSuggestions,
      callToAction: input.callToAction,
    };

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
