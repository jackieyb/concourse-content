// Concourse brand brief — injected into every generation prompt.
// Built from crawling concourse.co, /insights, and /customers.

export const BRAND_BRIEF = `
## About Concourse
Concourse builds AI agents specifically for finance teams. Finance teams using Concourse cut manual work by over 75% and increase output by 6x. Concourse raised a $12M Series A led by Standard Capital, with a16z, CRV, and YC participating and is now generally available.

## Product Summary
Enterprise AI agents that connect to financial systems (ERPs, data warehouses, billing, CRMs) and automate analysis, reporting, and complex workflows through natural language. Key capabilities: Chat with data (natural language queries), Native Reporting (automated report workflows), Seamless Exports (PDF, Excel, PowerPoint), and Auditability (trace every result to source data).

## Integrations
QuickBooks, NetSuite, Ramp, Snowflake, Salesforce, HubSpot, Rippling, Gusto, Brex, Stripe, Maxio, Databricks, BigQuery, Sage

## Ideal Customer Profile (ICP)
- **Roles:** CFO, VP Finance, Controller, FP&A Director/Manager, Finance Manager, AR Manager, AP Manager, Strategic Finance Lead
- **Company sizes:** Startups (2-person finance teams) through Fortune 500 (200+ person departments)
- **Industries:** SaaS, technology, enterprise software, fintech, services, manufacturing, DTC retail
- **Pain points:**
  - Drowning in manual spreadsheet work instead of doing strategic analysis
  - Month-end close takes too long
  - Can't get real-time answers from financial data without engineering help
  - Reports take hours/days to build
  - No time for forecasting or scenario modeling
  - Hiring more analysts doesn't scale fast enough

## Customers & Proof Points
- **CurbWaste:** Cut month-end close review time by 2 days, reduced manual work 75%
- **Maximus:** Saved $70K, reduced manual finance work 85%
- **Lightmatter:** Saved 12+ hours monthly on complex financial management
- **Pave:** Cut vendor analysis time 90%, freed 5+ hours/month
- **Instabase:** Scaled financial operations, accelerated insights
- **Unify:** Accelerated financial insights by 10x
- Also trusted by: Tecovas, Front, Palo Alto Networks, Carrot Fertility, Descript, Envoy, Persona, Metronome, Coalesce, Deck, Tempo

## Key Metrics
- 6x more analysis created
- 75% reduction in manual work
- 12+ hours saved per user per month
- 3x more insights surfaced
- Positive ROI in less than 1 month
- Setup in under 10 minutes, no engineering required

## Differentiators
1. Built specifically for finance teams — not a generic AI tool like ChatGPT
2. No-code, natural language interface — no SQL or technical skills needed
3. Connects to existing stack in minutes via native connectors
4. SOC 2 Type II certified — enterprise-grade security
5. Read-only connections — never trains on customer data
6. Full audit trail — every result traceable to source data
7. Backed by a16z, CRV, YC — credibility signal for enterprise buyers

## Voice & Tone
- **Direct and confident:** State outcomes clearly. "Finance teams cut manual work by 75%" not "may help reduce some manual tasks"
- **Data-driven:** Lead with numbers and proof points whenever possible
- **Practical, not hype-y:** Focus on what the product actually does for real finance teams
- **Peer-to-peer:** Write as if a savvy finance professional is talking to another — not a marketer talking down to them
- **Outcome-first:** Lead with the business result, then explain how
- Avoid: jargon overload, buzzword soup ("revolutionize", "game-changer"), passive voice, vague claims

## Key Terminology
AI agents, finance automation, financial workflows, natural language, ERP, FP&A, month-end close, flux analysis, variance analysis, AR (accounts receivable), AP (accounts payable), forecasting, reconciliation, zero-day close, strategic finance, financial analysis, data warehouse, audit trail, native connectors, real-time insights

## Content Themes (established)
- AI agents for specific finance functions (FP&A, AR, AP, Tax, Audit, Treasury, Accounting, Procurement)
- How CFOs use AI to streamline workflows
- Finance automation strategy and implementation
- AI tools comparisons and buyer guides
- Month-end close optimization
- Flux and variance analysis automation
- Best AI tools for finance teams (SEO comparison content)

## SEO Keyword Clusters
Primary: "AI agents for finance", "AI agents for FP&A", "finance automation", "AI for CFOs"
Secondary: "AI accounting software", "financial analysis AI", "month-end close automation", "AI for finance teams", "AI forecasting tool", "variance analysis automation", "AI for controllers", "FP&A automation"
Long-tail: "how to use AI agents for flux analysis", "best AI tools for FP&A teams", "AI agents for accounts receivable", "AI for month-end close"

## Competitors
Nominal, Rogo, Aleph, Chatfin, Runway, Abacum, Datarails, Pigment, Numeric
(Note: Concourse differentiates by being workflow-level AI agents vs. point solutions or dashboards)

## Internal link opportunities
- /customers (case studies)
- /insights (blog)
- Specific integration pages (NetSuite, Snowflake, etc.)
- Use case pages (Flux Analysis, Month-End Close, AR Aging, Revenue Forecasting)
`

export const COMPETITORS = [
  'Nominal',
  'Rogo',
  'Aleph',
  'Chatfin',
  'Runway',
  'Abacum',
  'Datarails',
  'Pigment',
  'Numeric',
]

export const SIGNAL_SOURCES = [
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'trending' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', type: 'industry' },
  { name: 'Google News – AI Finance', url: 'https://news.google.com/rss/search?q=AI+agents+finance+CFO&hl=en-US&gl=US&ceid=US:en', type: 'trending' },
  { name: 'Google News – Fintech Enterprise', url: 'https://news.google.com/rss/search?q=enterprise+fintech+AI+2025&hl=en-US&gl=US&ceid=US:en', type: 'fintech' },
  { name: 'Google News – FP&A', url: 'https://news.google.com/rss/search?q=FP%26A+AI+automation+finance+teams&hl=en-US&gl=US&ceid=US:en', type: 'industry' },
  { name: 'Google News – Competitors', url: 'https://news.google.com/rss/search?q=Datarails+OR+Pigment+OR+Abacum+OR+Runway+finance+AI&hl=en-US&gl=US&ceid=US:en', type: 'competitor' },
]
