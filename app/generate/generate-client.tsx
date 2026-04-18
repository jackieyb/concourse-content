"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Sparkles, FileJson, Eye, Pencil, Send, Trash2, X } from "lucide-react";
import type {
  Draft,
  FormatKey,
  GeneratedContent,
  PortableContent,
  Recommendation,
  Signal,
  Urgency,
} from "@/types";
import { FORMATS } from "@/lib/formats";
import { useAppStore } from "@/lib/store";
import { cn, shortId, slugify } from "@/lib/utils";
import {
  markdownToPortableText,
  renderPortableTextToMarkdown,
} from "@/lib/portable-text";
import { FormatPicker } from "@/components/format-picker";
import { FormatBadge } from "@/components/format-badge";
import { CopyButton } from "@/components/copy-button";
import { PortableTextPreview } from "@/components/portable-text-preview";

type Tab = "edit" | "preview" | "sanity";

export default function GenerateClient() {
  const router = useRouter();
  const params = useSearchParams();
  const drafts = useAppStore((s) => s.drafts);
  const activeDraftId = useAppStore((s) => s.activeDraftId);
  const upsertDraft = useAppStore((s) => s.upsertDraft);
  const deleteDraft = useAppStore((s) => s.deleteDraft);
  const setActiveDraft = useAppStore((s) => s.setActiveDraft);
  const publishDraft = useAppStore((s) => s.publishDraft);
  const lastRecommendations = useAppStore((s) => s.lastRecommendations);

  const [subject, setSubject] = useState("");
  const [angle, setAngle] = useState("");
  const [format, setFormat] = useState<FormatKey>("how-to");
  const [urgency, setUrgency] = useState<Urgency>("yellow");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [signalContext, setSignalContext] = useState("");

  const [draftId, setDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("edit");

  const [bodyMd, setBodyMd] = useState("");
  const [title, setTitle] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tldr, setTldr] = useState("");
  const [callToAction, setCallToAction] = useState("");
  const [faq, setFaq] = useState<GeneratedContent["faq"]>([]);
  const [internalLinks, setInternalLinks] = useState<string[]>([]);
  const [publishedNote, setPublishedNote] = useState<string | null>(null);

  const initRan = useRef(false);

  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    const urlDraftId = params.get("draft");
    const signalId = params.get("signalId");
    const formatParam = params.get("format") as FormatKey | null;
    const seed = params.get("seed");

    if (urlDraftId && drafts[urlDraftId]) {
      loadDraft(drafts[urlDraftId]);
      setActiveDraft(urlDraftId);
      if (seed === "1" && !drafts[urlDraftId].content) {
        setTimeout(() => runGenerate(drafts[urlDraftId]), 60);
      }
      return;
    }

    if (seed === "1" && signalId) {
      fetch("/api/signals")
        .then((r) => r.json())
        .then((data: { signals: Signal[] }) => {
          const sig = data.signals.find((s) => s.id === signalId);
          const rec = lastRecommendations?.find(
            (r: Recommendation) => r.signalId === signalId,
          );
          if (!sig) return;
          const chosenFormat =
            rec?.format ?? formatParam ?? "how-to";
          const chosenUrgency =
            rec?.urgency ?? (sig.category === "industry-news" ? "red" : "yellow");
          setSubject(rec?.subject ?? sig.headline);
          setAngle(rec?.angle ?? "");
          setFormat(chosenFormat);
          setUrgency(chosenUrgency);
          setPrimaryKeyword(
            rec?.primaryKeyword ?? sig.keywords[0] ?? "",
          );
          setSecondaryKeywords(
            (rec?.secondaryKeywords ?? sig.keywords.slice(1, 4)).join(", "),
          );
          setSignalContext(
            `Source: ${sig.source} (${sig.headline})\n\n${sig.summary}`,
          );
        })
        .catch(() => {});
      return;
    }

    if (activeDraftId && drafts[activeDraftId]) {
      loadDraft(drafts[activeDraftId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDraft = (d: Draft) => {
    setDraftId(d.id);
    setSubject(d.subject);
    setAngle(d.angle);
    setFormat(d.format);
    setUrgency(d.urgency);
    if (d.content) {
      setTitle(d.content.title);
      setMetaTitle(d.content.metaTitle);
      setMetaDescription(d.content.metaDescription);
      setExcerpt(d.content.excerpt);
      setTldr(d.content.tldr);
      setPrimaryKeyword(d.content.primaryKeyword);
      setSecondaryKeywords(d.content.secondaryKeywords.join(", "));
      setBodyMd(renderPortableTextToMarkdown(d.content.body));
      setFaq(d.content.faq);
      setInternalLinks(d.content.internalLinkSuggestions);
      setCallToAction(d.content.callToAction);
    }
  };

  const runGenerate = async (preset?: Draft) => {
    setError(null);
    setPublishedNote(null);
    setLoading(true);

    const id = preset?.id ?? draftId ?? shortId();
    const nowIso = new Date().toISOString();
    const newDraft: Draft = {
      id,
      subject: preset?.subject ?? subject,
      angle: preset?.angle ?? angle,
      format: preset?.format ?? format,
      urgency: preset?.urgency ?? urgency,
      content: null,
      status: "generating",
      createdAt: preset?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };
    setDraftId(id);
    upsertDraft(newDraft);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newDraft.subject,
          format: newDraft.format,
          urgency: newDraft.urgency,
          angle: newDraft.angle,
          primaryKeyword: primaryKeyword || undefined,
          secondaryKeywords: secondaryKeywords
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          signalContext: signalContext || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Generation failed (${res.status})`);
      }
      const data = (await res.json()) as { content: GeneratedContent };
      const c = data.content;

      setTitle(c.title);
      setMetaTitle(c.metaTitle);
      setMetaDescription(c.metaDescription);
      setExcerpt(c.excerpt);
      setTldr(c.tldr);
      setPrimaryKeyword(c.primaryKeyword);
      setSecondaryKeywords(c.secondaryKeywords.join(", "));
      setBodyMd(renderPortableTextToMarkdown(c.body));
      setFaq(c.faq);
      setInternalLinks(c.internalLinkSuggestions);
      setCallToAction(c.callToAction);

      upsertDraft({
        ...newDraft,
        content: c,
        status: "ready",
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setError(msg);
      upsertDraft({
        ...newDraft,
        status: "error",
        error: msg,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const currentContent: GeneratedContent | null = useMemo(() => {
    if (!title || !bodyMd) return null;
    const body: PortableContent[] = markdownToPortableText(bodyMd);
    return {
      title,
      slug: slugify(title),
      metaTitle,
      metaDescription,
      excerpt,
      tldr,
      primaryKeyword,
      secondaryKeywords: secondaryKeywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      body,
      faq,
      internalLinkSuggestions: internalLinks,
      callToAction,
    };
  }, [
    title,
    metaTitle,
    metaDescription,
    excerpt,
    tldr,
    primaryKeyword,
    secondaryKeywords,
    bodyMd,
    faq,
    internalLinks,
    callToAction,
  ]);

  const saveEdits = () => {
    if (!draftId || !currentContent) return;
    const d = drafts[draftId];
    if (!d) return;
    upsertDraft({
      ...d,
      content: currentContent,
      status: "ready",
      updatedAt: new Date().toISOString(),
    });
  };

  const onPublish = () => {
    if (!draftId || !currentContent) return;
    saveEdits();
    const pub = publishDraft(draftId);
    if (pub) {
      setPublishedNote(
        `Published "${pub.title}" — saved to history with a Sanity-ready Portable Text document.`,
      );
    }
  };

  const sanityDoc = useMemo(() => {
    if (!currentContent) return null;
    return {
      _type: "post",
      _id: draftId ?? shortId(),
      title: currentContent.title,
      slug: { _type: "slug", current: currentContent.slug },
      excerpt: currentContent.excerpt,
      tldr: currentContent.tldr,
      body: currentContent.body,
      faq: currentContent.faq,
      seo: {
        metaTitle: currentContent.metaTitle,
        metaDescription: currentContent.metaDescription,
        primaryKeyword: currentContent.primaryKeyword,
        secondaryKeywords: currentContent.secondaryKeywords,
      },
      format: format,
      urgency: urgency,
      internalLinkSuggestions: currentContent.internalLinkSuggestions,
      callToAction: currentContent.callToAction,
      publishedAt: new Date().toISOString(),
    };
  }, [currentContent, draftId, format, urgency]);

  const hasContent = Boolean(currentContent);

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[380px_1fr]">
      {/* LEFT: prompt panel */}
      <aside className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">1. Assignment</h2>
          <p className="mt-1 text-xs text-neutral-500">
            What are we writing and why?
          </p>

          <label className="mt-4 block text-xs font-medium text-neutral-700">
            Subject
          </label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="e.g. How to automate flux analysis with an AI agent"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label className="mt-3 block text-xs font-medium text-neutral-700">
            Angle <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="What's the specific take or hook?"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
          />

          <label className="mt-3 block text-xs font-medium text-neutral-700">
            Signal context <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="Paste the news item or signal this piece responds to."
            value={signalContext}
            onChange={(e) => setSignalContext(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">2. Format</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Pick the format that best fits the subject.
              </p>
            </div>
            <div
              aria-label="Urgency legend"
              className="flex shrink-0 items-center gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] text-neutral-600"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                Timely
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Evergreen
              </span>
            </div>
          </div>
          <div className="mt-4">
            <FormatPicker value={format} onChange={setFormat} />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-neutral-900">3. Keywords</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Primary drives the H1 + meta; secondaries weave through H2s and body.
          </p>
          <label className="mt-3 block text-xs font-medium text-neutral-700">
            Primary keyword
          </label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="ai agents for fp&a"
            value={primaryKeyword}
            onChange={(e) => setPrimaryKeyword(e.target.value)}
          />
          <label className="mt-3 block text-xs font-medium text-neutral-700">
            Secondary keywords <span className="font-normal text-neutral-400">(comma-separated, 2-3)</span>
          </label>
          <input
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="variance commentary, forecasting, finance automation"
            value={secondaryKeywords}
            onChange={(e) => setSecondaryKeywords(e.target.value)}
          />
        </div>

        <button
          onClick={() => runGenerate()}
          disabled={!subject || loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:bg-neutral-300"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {hasContent ? "Regenerate" : "Generate draft"}
            </>
          )}
        </button>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {draftId && (
          <button
            onClick={() => {
              deleteDraft(draftId);
              router.push("/generate");
              setDraftId(null);
              setTitle("");
              setBodyMd("");
              setFaq([]);
              setPublishedNote(null);
            }}
            className="w-full text-xs text-neutral-500 hover:text-red-600"
          >
            Discard draft
          </button>
        )}
      </aside>

      {/* RIGHT: editor + preview */}
      <section className="min-w-0">
        {!hasContent && !loading && (
          <EmptyEditor />
        )}
        {loading && <GeneratingState format={format} />}

        {hasContent && (
          <div className="space-y-6">
            {publishedNote && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {publishedNote}{" "}
                <Link href="/history" className="underline">
                  View history →
                </Link>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FormatBadge format={format} />
                <span className="text-xs text-neutral-400">
                  slug: /{slugify(title)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onPublish}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Send className="h-3.5 w-3.5" /> Publish to Sanity
                </button>
              </div>
            </div>

            {/* Title + meta */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <label className="text-xs font-medium text-neutral-500">Title (H1)</label>
              <input
                className="mt-1 w-full rounded-md border border-transparent px-2 py-1 text-2xl font-semibold leading-snug outline-none focus:border-neutral-300 focus:bg-neutral-50"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-neutral-500">Meta title</label>
                  <input
                    className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-neutral-400">
                    {metaTitle.length}/60 chars
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Meta description</label>
                  <input
                    className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                  />
                  <p className="mt-1 text-[10px] text-neutral-400">
                    {metaDescription.length}/160 chars
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-neutral-500">Excerpt</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                />
              </div>

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                    AEO TL;DR
                  </label>
                  <span className="text-[10px] text-amber-700">
                    Engineered to be lifted by ChatGPT / Perplexity / Google AI
                  </span>
                </div>
                <textarea
                  rows={3}
                  className="mt-2 w-full rounded-md border border-amber-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-amber-500"
                  value={tldr}
                  onChange={(e) => setTldr(e.target.value)}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-neutral-200">
              {(
                [
                  { key: "edit", label: "Edit body", icon: Pencil },
                  { key: "preview", label: "Preview", icon: Eye },
                  { key: "sanity", label: "Sanity Portable Text", icon: FileJson },
                ] as const
              ).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-t-md px-3 py-2 text-sm font-medium transition-colors",
                    tab === key
                      ? "border-b-2 border-neutral-900 text-neutral-900"
                      : "text-neutral-500 hover:text-neutral-900",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>

            {tab === "edit" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-neutral-500">Body (markdown)</label>
                  <textarea
                    className="mt-1 h-[520px] w-full rounded-md border border-neutral-300 bg-white p-3 font-mono text-xs leading-relaxed outline-none focus:border-neutral-900"
                    value={bodyMd}
                    onChange={(e) => setBodyMd(e.target.value)}
                    onBlur={saveEdits}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500">Live preview</label>
                  <div className="mt-1 h-[520px] overflow-y-auto rounded-md border border-neutral-200 bg-white p-5">
                    {currentContent && (
                      <PortableTextPreview blocks={currentContent.body} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "preview" && currentContent && (
              <article className="rounded-xl border border-neutral-200 bg-white p-8">
                <div className="mb-6 flex items-center gap-2">
                  <FormatBadge format={format} />
                </div>
                <h1 className="text-4xl font-semibold leading-tight text-neutral-900">
                  {currentContent.title}
                </h1>
                <p className="mt-4 text-lg text-neutral-600">{currentContent.excerpt}</p>
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
                    TL;DR
                  </div>
                  <p className="text-sm text-amber-900">{currentContent.tldr}</p>
                </div>
                <div className="mt-8">
                  <PortableTextPreview blocks={currentContent.body} />
                </div>

                {currentContent.faq.length > 0 && (
                  <section className="mt-10 border-t border-neutral-200 pt-8">
                    <h2 className="text-2xl font-semibold">
                      Frequently asked questions
                    </h2>
                    <div className="mt-4 divide-y divide-neutral-200">
                      {currentContent.faq.map((item, i) => (
                        <div key={i} className="py-4">
                          <h3 className="font-semibold text-neutral-900">
                            {item.question}
                          </h3>
                          <p className="mt-2 text-neutral-700">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <div className="mt-10 rounded-lg bg-neutral-900 p-6 text-white">
                  <p className="text-sm font-medium">{currentContent.callToAction}</p>
                </div>
              </article>
            )}

            {tab === "sanity" && sanityDoc && (
              <div className="space-y-4">
                <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                  <div className="font-semibold">Ready for Sanity Studio</div>
                  <p className="mt-1 text-xs">
                    This JSON matches a minimal <code>post</code> schema with Portable Text body, SEO fields, FAQ, and the urgency/format metadata. Copy it, paste into your Sanity document, and publish.
                  </p>
                </div>
                <div className="relative rounded-md border border-neutral-200 bg-neutral-950 p-4">
                  <div className="absolute right-3 top-3">
                    <CopyButton
                      text={JSON.stringify(sanityDoc, null, 2)}
                      label="Copy JSON"
                    />
                  </div>
                  <pre className="max-h-[600px] overflow-auto text-xs leading-relaxed text-green-300">
{JSON.stringify(sanityDoc, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* FAQ editor */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">FAQ</h3>
                  <p className="text-xs text-neutral-500">
                    The single highest-leverage AEO move. Ships as schema.org FAQPage.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400">{faq.length} items</span>
                  {faq.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Remove the entire FAQ section from this draft?",
                          )
                        )
                          return;
                        setFaq([]);
                        if (draftId) {
                          const d = drafts[draftId];
                          if (d?.content) {
                            upsertDraft({
                              ...d,
                              content: { ...d.content, faq: [] },
                              status: "ready",
                              updatedAt: new Date().toISOString(),
                            });
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>
              </div>
              {faq.length === 0 ? (
                <p className="mt-4 rounded-md border border-dashed border-neutral-200 bg-neutral-50 p-4 text-center text-xs text-neutral-500">
                  No FAQ items. Regenerate the draft to restore them.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {faq.map((item, i) => (
                    <div
                      key={i}
                      className="group relative rounded-md border border-neutral-200 p-3 pr-10"
                    >
                      <button
                        type="button"
                        aria-label={`Delete FAQ item ${i + 1}`}
                        onClick={() => {
                          const next = faq.filter((_, idx) => idx !== i);
                          setFaq(next);
                          if (draftId) {
                            const d = drafts[draftId];
                            if (d?.content) {
                              upsertDraft({
                                ...d,
                                content: { ...d.content, faq: next },
                                status: "ready",
                                updatedAt: new Date().toISOString(),
                              });
                            }
                          }
                        }}
                        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      <input
                        className="w-full rounded-sm border border-transparent bg-neutral-50 px-2 py-1 text-sm font-semibold outline-none focus:border-neutral-300 focus:bg-white"
                        value={item.question}
                        onChange={(e) => {
                          const next = [...faq];
                          next[i] = { ...item, question: e.target.value };
                          setFaq(next);
                        }}
                        onBlur={saveEdits}
                      />
                      <textarea
                        rows={3}
                        className="mt-2 w-full rounded-sm border border-neutral-200 px-2 py-1 text-sm outline-none focus:border-neutral-900"
                        value={item.answer}
                        onChange={(e) => {
                          const next = [...faq];
                          next[i] = { ...item, answer: e.target.value };
                          setFaq(next);
                        }}
                        onBlur={saveEdits}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Internal links + CTA */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-sm font-semibold">Internal link suggestions</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  Anchor phrases to hyperlink to related Concourse posts.
                </p>
                <ul className="mt-3 space-y-2 text-sm text-neutral-700">
                  {internalLinks.map((l, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-neutral-400">→</span> {l}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <h3 className="text-sm font-semibold">Call to action</h3>
                <textarea
                  rows={3}
                  className="mt-3 w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm outline-none focus:border-neutral-900"
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  onBlur={saveEdits}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyEditor() {
  return (
    <div className="flex h-[500px] flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white text-center">
      <Sparkles className="h-8 w-8 text-neutral-400" />
      <h3 className="mt-4 text-lg font-semibold">Ready when you are</h3>
      <p className="mt-1 max-w-sm text-sm text-neutral-500">
        Fill in the assignment on the left, pick a format, and hit &ldquo;Generate draft.&rdquo;
      </p>
      <Link
        href="/"
        className="mt-6 text-sm text-neutral-600 hover:text-neutral-900 underline"
      >
        ← Start from a top-3 recommendation instead
      </Link>
    </div>
  );
}

function GeneratingState({ format }: { format: FormatKey }) {
  const f = FORMATS[format];
  return (
    <div className="flex h-[500px] flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white text-center">
      <div className="rounded-full border border-neutral-200 bg-neutral-50 p-4">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-700" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">
        Writing your {f.label.toLowerCase()}…
      </h3>
      <p className="mt-1 max-w-md text-sm text-neutral-500">
        Drafting a {f.wordCountTarget[0]}–{f.wordCountTarget[1]} word piece
        with TL;DR, FAQ, meta, and Portable Text body. Typically 30–60 seconds.
      </p>
      <div className="mt-6 flex flex-wrap gap-2 text-xs text-neutral-500">
        <span className="rounded-full bg-neutral-100 px-3 py-1">Concourse voice loaded</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1">SEO rules enforced</span>
        <span className="rounded-full bg-neutral-100 px-3 py-1">AEO structure baked in</span>
      </div>
    </div>
  );
}
