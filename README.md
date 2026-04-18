# Concourse Content Engine

A working prototype of a content engine for [Concourse AI](https://www.concourse.co). It pulls weekly signals (trending topics, industry news, enterprise fintech news, competitor content), ranks them with a recommender that thinks like a content marketer, and generates Sanity-ready blog posts with Claude — engineered for dual SEO + AEO ranking.

Built as a take-home prototype in response to the brief: *"Build a working prototype of a content engine that Concourse could use to drive inbound leads through content marketing."*

## What it does

- **Dashboard** (`/`) — shows **Top 3 posts to publish today** with urgency dots (red = timely, yellow = evergreen), plus the full weekly signal board across 4 categories.
- **Generate** (`/generate`) — subject + format picker, generates a full draft with Claude Opus 4.7, then drops you into an editor with body markdown, live preview, FAQ editor, and a **Sanity Portable Text** JSON output ready to copy-paste into Sanity Studio.
- **History** (`/history`) — every piece published, filterable by format, with placeholder performance metrics. The recommendation engine reads from here so it never serves you two case studies in a row.

## How it thinks

The recommender ranks each signal on:
- **Importance** (editorial) and **freshness** (time since the triggering event)
- **Topic whitespace** — has Concourse already covered it this week? If yes, it's excluded
- **Audience fit** — category weighting (competitor moves and breaking industry news get a bump)
- **Format diversity** — excludes the format used in the most recent publication; swaps to an alternate format if needed

Each recommendation ships with a **rationale string** ("Top signal in competitor content this week · Listicle fits because scannable roundup · Competitor moved — response opportunity") so reviewers can see the reasoning, not just the answer.

## Content quality rules baked in

Every generated piece follows Concourse's voice and dual SEO+AEO rules. The rules live in two files you can tune without touching any component:

- [`lib/concourse-context.ts`](lib/concourse-context.ts) — brand voice, ICP personas, real customer metrics (pulled from concourse.co/customers), competitor set, writing rules, and forbidden phrases. This is the single highest-leverage asset in the repo.
- [`lib/seo-aeo-rules.ts`](lib/seo-aeo-rules.ts) — AEO-first structure (TL;DR opener, question H2s, FAQ block, short quotable sentences, named-entity anchoring), classic SEO hygiene (meta title/description lengths, primary + 2-3 secondary keywords, slug rules), and format-specific guidance.

The generator uses Claude's [tool use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use) to produce schema-conformant output. Every post comes back with: title, slug, meta title, meta description, excerpt, TL;DR (the AEO anchor), primary keyword, 2-3 secondary keywords, Portable Text body, FAQ (4-6 items), internal link suggestions, and a call to action.

## Running locally

Requires Node 18+ (Node 24 tested). After cloning:

```bash
npm install
cp .env.local.example .env.local
# add your ANTHROPIC_API_KEY to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Dashboard loads the week's signals and the top 3 recs immediately.

## Deploying to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com/new), import the repo.
3. Add `ANTHROPIC_API_KEY` to the project's environment variables (Production + Preview).
4. Deploy. Vercel autodetects Next.js — no config needed.

The generate endpoint is set to `maxDuration = 300` for Vercel Pro; if you're on the Hobby tier, Claude Opus 4.7 generations may time out on longer pieces. Downgrade the model to `claude-sonnet-4-6` in [`lib/claude.ts`](lib/claude.ts) if needed.

## Architecture decisions & tradeoffs

Quick notes on why the prototype looks the way it does, for anyone reviewing:

**Signals are seeded JSON, not live APIs.** [`data/signals.json`](data/signals.json) contains a curated week of realistic fintech/AI-agent signals. Why: live news APIs fail mid-demo, return paywalled/irrelevant content, and block reviewers from seeing the rec engine's actual behavior. Swapping in a live source is a one-function change at [`lib/signals.ts`](lib/signals.ts) — replace `getWeeklySignals()` with a fetch from Vercel KV hydrated by a daily cron job. For production, I'd pull from NewsAPI (fintech keywords), an RSS aggregator across the 9 competitor blogs, Hacker News, and Google Trends.

**Sanity integration is client-side copy-paste, not an API connection.** The output on the Sanity tab is a Portable Text document in the exact shape a Sanity `post` schema expects (body is Portable Text blocks; slug is a Sanity slug object; SEO fields nested under `seo`). Hit Copy, paste into Sanity Studio, publish. Skipping the live API meant no credentials, no custom schema matching, and no OAuth — and the copy-paste flow is realistic for content teams reviewing a draft before shipping.

**Published history lives in `localStorage`, not a database.** For a single-user prototype this is the honest move — zero env vars for the reviewer, state survives page refreshes, seeded with 6 realistic back-catalog items so the History view isn't empty on first open. Multi-device would move this to Vercel KV with a single helper swap.

**Weekly capture, daily re-ranking.** Content marketers plan on a weekly cadence, not daily. The signal pool is weekly; the rec engine re-scores freshness every dashboard load so the red/yellow urgency overlay stays accurate. You capture weekly, but act daily.

**Opus 4.7 for generation, Sonnet 4.6 reserved for ranking.** The quality of the draft is the whole product, so the generator uses Opus. The rec engine is rules-based (deterministic, explainable) with a slot for Sonnet-written rationales if we want to upgrade later.

**No auth, no real analytics, no content calendar.** All out of scope per the brief. Performance metrics are placeholders labeled as mock — honest beats fake.

## Project structure

```
app/
  api/
    signals/route.ts       # GET weekly signals
    recommend/route.ts     # POST top-3 recs (takes publications to enforce diversity)
    generate/route.ts      # POST generation via Claude tool use
  page.tsx                 # Dashboard
  generate/                # Generate + editor
  history/page.tsx         # History
lib/
  concourse-context.ts     # brand voice, ICP, customer proof, writing rules
  seo-aeo-rules.ts         # dual SEO + AEO rules
  formats.ts               # 8 content formats + subject → format mapping
  signals.ts               # signal source (swap here to go live)
  recommend.ts             # scoring, diversity, urgency, rationale
  back-catalog.ts          # seeded publish history
  store.ts                 # Zustand + localStorage
  portable-text.ts         # markdown ↔ Portable Text conversion
  claude.ts                # Anthropic client + model constants
  utils.ts                 # slugify, shortId, formatters
components/
  nav.tsx, rec-card.tsx, signal-board.tsx, format-picker.tsx,
  format-badge.tsx, urgency-dot.tsx, copy-button.tsx,
  portable-text-preview.tsx
data/
  signals.json             # seeded week of signals
  back-catalog.json        # seeded publish history
types/index.ts             # shared types
```

## What I'd do next

- **Live signal ingestion**: Vercel Cron job at `/api/ingest-signals` pulling from NewsAPI, competitor RSS, HN, Google Trends into Vercel KV with a 7-day TTL.
- **Real analytics**: GA4 server-side integration to replace `mockMetrics` on the History page.
- **Actual Sanity write**: `@sanity/client` with write token — one-click publish, not copy-paste.
- **Multi-draft queue**: a sidebar of in-progress drafts so you can generate 3 pieces in parallel and review them when ready.
- **Competitor content scraper**: the one signal category where seeded data is weakest. A lightweight scraper over the 9 competitor blogs, diffed against the previous day, feeding directly into the rec engine.
- **Streaming generation**: swap the tool-use endpoint for a streaming one that renders the body as it's written. Nicer demo UX; harder to keep the structured schema.
- **Human-in-the-loop editor**: inline Claude-assisted rewrites on any paragraph ("make this shorter," "add a Concourse customer example here"). High-leverage for content teams.
