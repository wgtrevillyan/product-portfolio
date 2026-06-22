# Engineering Plan — AI-Readable Portfolio (SEO / GEO / AEO)

- **Status:** ✅ Implemented (2026-06-20) — see "Implementation notes" at the end.
- **Author:** Ren
- **Date:** 2026-06-20
- **Repo:** `product-portfolio` (deploys to https://www.trevillyan.dev via Vercel)
- **Precedent:** NewsNook-website [PR #20](https://github.com/) — "AI-readable site, discoverability" (merged 2026-06-20). This plan ports the *AI-discoverability* half of that PR to the portfolio and adapts it to a content-rich, data-driven site.

---

## 1. Goal

Make `trevillyan.dev` **readable and citable by LLMs and answer engines** (ChatGPT, Claude, Perplexity, Google AI Overviews) in addition to classic search crawlers — so that when someone asks an AI "who is Bill Trevillyan / what has he built / does he hold patents," the model can find, parse, and cite this site accurately.

Three optimization surfaces, one effort:
- **SEO** — classic crawler indexing (already partly done: sitemap, OG/Twitter meta on products).
- **GEO** (Generative Engine Optimization) — being surfaced/cited *inside* generative answers.
- **AEO** (Answer Engine Optimization) — structured, extractable facts that answer engines can lift directly.

## 2. Current State (findings)

| Area | Status today |
|---|---|
| `sitemap.xml` | ✅ Exists, generated from data (`generate-sitemap.js`), 26 URLs. Good. |
| `robots.txt` | ❌ Missing entirely — no crawler policy, no sitemap declaration. |
| `llms.txt` / `llms-full.txt` / `.md` mirrors | ❌ None. |
| **JSON-LD structured data** | ❌ **None on any page.** Biggest gap vs. PR #20. |
| OG / Twitter meta | ⚠️ Good on `index` + generated product pages; **company & patent pages share a single template** with placeholder/canonical pointing at `detail_companies`/`detail_patents`. |
| **Server-rendered content** | ⚠️ **Company, patent (and product *list*) detail pages are client-rendered** by `js/cms-data.js` (`fetch` → inject). A non-JS crawler/LLM sees an **empty shell**. Products got per-slug static pages (`generate-product-pages.js`); companies & patents did **not**. |
| Analytics | Mixpanel (token in `index.html`); no AI-referral segmentation. |
| Build pipeline | `npm run build` = `build:data` (YAML→JSON) → inject-header → inject-footer → clean-urls → root-asset-paths → generate-sitemap → generate-product-pages. Clean, scriptable, YAML/JSON is the source of truth. |

**Key structural insight:** unlike NewsNook (where PR #20 could extract Markdown from rendered HTML), this site's per-entity HTML is a client-rendered shell. The clean source of truth is the **structured YAML/JSON** (`data/bio.*`, `data/companies/*`, `data/products/*`, `data/patents.json`, `data/skills.json`). So our AI artifacts and JSON-LD should be generated **from the data files**, not scraped from HTML — which is actually cleaner and more accurate than the NewsNook approach.

## 3. Scope

**In scope**
1. `robots.txt` welcoming AI + search crawlers, declaring sitemap + llms.txt.
2. `llms.txt` + `llms-full.txt` + per-entity Markdown mirrors, generated from data.
3. JSON-LD `@graph` on the homepage (Person / ProfilePage / WebSite) + per-entity JSON-LD (Organization, SoftwareApplication/CreativeWork, patent CreativeWork) on detail pages.
4. **Close the empty-shell gap:** generalize the product-page generator so **companies and patents also get per-slug static HTML** with correct title/meta/canonical **and** inline JSON-LD + rendered summary content (progressive enhancement: static content + existing client JS).
5. Mixpanel `ai_source` super-property + `ai_referral` event for visitors from AI engines.
6. `vercel.json` content-type headers + rewrites for the new artifacts.
7. **Placeholder-data remediation** (WS-8) — scrub fabricated content before amplifying discoverability.
8. Docs/README update.

**Out of scope (this pass)**
- Visual/design changes; copy rewrites beyond the placeholder scrub in WS-8.
- New pages or net-new product/company content.
- Rewriting the site off Webflow/static.
- Removing Mixpanel/LogRocket (PostHog is *added* now; sunset is a later step).

## 4. Design — Workstreams

### WS-1 · `robots.txt` (new, static)
Static file at repo root, declaring `Sitemap: https://www.trevillyan.dev/sitemap.xml` and `# llms.txt` pointer. **Decision (Bill, 2026-06-20): allow answer engines, block AI *training* crawlers.** So:
- **`User-agent: *` → `Allow: /`** — keeps Googlebot/Bingbot indexing normally (Google AI Overviews & Bing Copilot piggyback on these; can't be split out).
- **Allow (answer/search engines, user-triggered fetches):** `OAI-SearchBot`, `ChatGPT-User` (OpenAI search/fetch); `Claude-User`, `Claude-SearchBot` (Anthropic search/fetch); `PerplexityBot`, `Perplexity-User`; `Applebot` (Siri/Spotlight).
- **Disallow (training crawlers):** `GPTBot` (OpenAI training); `Google-Extended` (Gemini training token); `Applebot-Extended` (Apple training token); `ClaudeBot`, `anthropic-ai`, `Claude-Web` (Anthropic training/legacy); `CCBot` (Common Crawl); `Bytespider` (ByteDance); `Meta-ExternalAgent` (Meta). → `Disallow: /` each.
- **Rationale:** be citable in live AI answers without donating the corpus to model training. Listed per-bot so the policy is intentional and easy to flip later.
- **Caveat:** these tokens are honor-system; a blocked training bot that ignores robots.txt isn't stopped by this. Acceptable for a public marketing surface.

### WS-2 · `scripts/generate-llms.js` (new) → `llms.txt`, `llms-full.txt`, `.md` mirrors
Reads the JSON in `data/` (after `build:data`) and emits:
- **`llms.txt`** — curated, token-efficient overview of Bill: who he is (from `bio`), a one-line value prop, key facts (role, 3x founder, patents, ARR/impact highlights), then a `## Companies` / `## Products` / `## Patents` index, each entry linking the canonical URL + its `.md` mirror + the 50-char description.
- **`llms-full.txt`** — the overview with every entity's full Markdown inlined (one-fetch context for agents).
- **Per-entity `.md` mirrors** — `companies/<slug>.md`, `products/<slug>.md`, `patents/<slug>.md`, plus `index.md` (bio/home). Built from the structured fields (Name, descriptions, highlights, dates, tags, skills, website, patent IDs/URLs) → clean Markdown. No HTML scraping.
- Hand-curated intro prose lives in the script (like NewsNook's `OVERVIEW`); entity bodies are generated from data.
- Wire into `npm run build` after `generate-sitemap`.

### WS-3 · JSON-LD structured data (the core GEO/AEO win)
Inject `<script type="application/ld+json">` blocks:

- **Homepage (`index.html`)** — an `@graph`:
  - `Person` — William Trevillyan: `name`, `alternateName` "Bill", `jobTitle`, `description` (bio), `url`, `image` (headshot), `knowsAbout` (top skills), `worksFor` (Clip Automation), `founder` of the companies, and **`sameAs`** = LinkedIn `https://www.linkedin.com/in/williamtrevillyan`, X `https://twitter.com/wgtrevillyan`, GitHub `https://github.com/wgtrevillyan`, the founded-company sites, and the Google Patents inventor page. (Crunchbase to add if Bill has one — open Q.)
  - `ProfilePage` — wrapping the Person (correct type for a portfolio/about page; signals "this page is about a person").
  - `WebSite` — site name + URL + `publisher` → Person.
  - Optionally an `ItemList` of featured products/companies.
- **Per company page** — `Organization` (name, description, url, logo, founder→Person, foundingDate).
- **Per product page** — `SoftwareApplication` (or `CreativeWork` for non-software) — name, description, applicationCategory from tags, author→Person, optional `offers` (e.g. NewsNook $20/mo), `url`.
- **Per patent page** — `CreativeWork` (schema.org has no native `Patent` type) with `name`, `about` (abstract), `inventor`/`author`→Person, `identifier` (Application ID, e.g. `US 11,788,918 B2`), `sameAs` (Google Patents URL), `dateCreated`/patented date.

Generation: extend the page generators (WS-4) to inject per-entity JSON-LD from data; homepage `@graph` injected via a small new step or hand-added to `index.html` source + kept in sync (recommend: a tiny generator step reading `bio.json` + `companies.json` so `sameAs`/founder lists stay accurate).

### WS-4 · Per-slug static pages for companies & patents (close the empty-shell gap)
Today only products get static per-slug HTML. Generalize `generate-product-pages.js` (or add sibling generators) so **companies → `company_pages/<slug>.html`** and **patents → `patent_pages/<slug>.html`** are pre-rendered with:
- Correct `<title>`, description, OG/Twitter, **canonical = the clean URL** (fixes the shared-template canonical bug).
- Inline **JSON-LD** (WS-3).
- A static, crawler-visible **summary block** (name + description + highlights) so non-JS agents get real content; existing `cms-data.js` still hydrates the full interactive view for browsers (progressive enhancement).
- Update `vercel.json` rewrites: `/companies/:slug` and `/patents/:slug` → the generated files (replacing the current single-template rewrites), with trailing-slash redirects, mirroring the product logic already in the generator.

**Decision to confirm with Bill:** how much rendered content to inline. Minimum viable = name + description + highlights (cheap, high AEO value). I recommend this minimum; full visual parity is out of scope.

### WS-5 · Analytics: PostHog transition + AI-referral tracking
**Decision (Bill, 2026-06-20):** stand up **PostHog** as the going-forward analytics, running **in parallel** with the existing **Mixpanel** and **LogRocket** during the transition (both are site-wide today — Mixpanel + LogRocket are injected on every page via the shared header; **LogRocket is slated for retirement**, Mixpanel retires after PostHog is validated).

- **Add PostHog** — init snippet in the shared header (`components/header.html`, injected by `inject-header.js`) so all pages get it, alongside the current Mixpanel/LogRocket loaders. Project key + host configurable (env/template, no secrets committed — follows the secrets rule).
- **AI-referral detection (shared helper)** — detect arrival from an AI engine via `document.referrer` host match (chatgpt.com / chat.openai.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com) **or** `?utm_source` / `?ref` matching. On match, fire to **both** stacks during transition:
  - PostHog: `posthog.register({ ai_source })` (super-property) + `posthog.capture('ai_referral', { ai_source, landing_path })`.
  - Mixpanel (continuity): `mixpanel.register({ ai_source })` + `mixpanel.track('ai_referral', …)`.
  - LogRocket: no change (retiring); optionally `LogRocket.track('ai_referral')` if trivial.
- Write the detection once (small shared JS) so the two stacks stay in sync and removing Mixpanel later is a one-line delete.
- **Caveat (documented):** crawlers don't run JS, so this measures *humans arriving from AI answers*, not crawl/citation hits — watch Vercel access logs for the AI bot user-agents to see crawl activity.
- **Migration note:** PostHog standup, Mixpanel-parity check, and the Mixpanel/LogRocket sunset are tracked in the README analytics section; this PR adds PostHog + dual-fires, it does **not** remove Mixpanel/LogRocket yet.

### WS-6 · `vercel.json`
- Add `headers` for `*.md`, `llms.txt`, `llms-full.txt` → `Content-Type: text/plain; charset=utf-8` (or `text/markdown` for `.md`); ensure `robots.txt` serves correctly.
- Add rewrites for `.md` mirror paths (e.g. `/companies/:slug.md`).
- Company/patent per-slug rewrites updated by WS-4 generator (same pattern as products).

### WS-7 · Docs
- New `README` section: AI discoverability (what the artifacts are, how `npm run build` regenerates them, how to edit the curated overview) + analytics transition (PostHog primary; Mixpanel/LogRocket retiring).
- This plan committed under `docs/engineering-plans/`.

### WS-8 · Placeholder-data remediation (do before discoverability ships)
**Decision (Bill, 2026-06-20): fix placeholders.** Once the site is more citable, fabricated content propagates into AI answers — a credibility and arguably legal risk (fake named testimonials). Edits go in the **YAML** source; `build:data` regenerates the JSON (so `products.json`/`companies.json` mirrors fix themselves — don't hand-edit JSON). Two categories found:

**(a) Fabricated testimonial quotes — REMOVE (recommended) or replace with real ones.** These attribute invented quotes to fake named people/companies. An AI engine quoting "Jane Doe, CEO at ABC Company" as a real endorsement is the worst-case outcome. Found in `Press Release` fields of:
`newsnook` ("Jane Doe, CEO at ABC Company"), `verbaly-web-app` ("Jane Doe, Manager…"), `speech-analysis-api`, `incode-forms` ("Jane Doe, Executive at ABC Hospitals"), `incode-analytics` ("Jane Doe, Head of Growth for ABC Bank"), `incode-concierge` ("…ABC Hotels"), `owner-hub` & `propertycareplus` ("John Doe, President at ABC Property Management"), `appfolio-sync`.
→ **Recommendation:** delete the fake-quote blockquotes (keep the rest of each press release). If Bill has any *real* quotes, swap those in instead.

**(b) Redacted metrics `$XXX` / `$XXXK` — replace with approved phrasing.** Matches the bio's existing language (recent commits moved to "$7-figure ARR" / "Fortune 50 ARR"):
- Clip Automation Highlights "$XXXK in ARR from a Fortune 50 corporation" → **"7-figure ARR from a Fortune 50 corporation"** (proposed — confirm).
- NewsNook (company + product) "Acquired 3 paying customers for $XXX in revenue and a beta waitlist of 70+ C-suite executives" → reword to drop the dollar figure, e.g. **"Acquired the first paying customers and a beta waitlist of 70+ C-suite executives"** (proposed — confirm, or give a real number).

Net: WS-8 is a small, surgical YAML edit + rebuild. The two proposed metric rephrasings and the remove-vs-replace call on quotes are the only judgment items — see Open Questions.

## 5. Build Pipeline (after)

```
build:data → inject-header → inject-footer → clean-urls → root-asset-paths
  → generate-sitemap
  → generate-product-pages   (now also: company + patent pages, + JSON-LD)
  → generate-llms            (NEW: llms.txt, llms-full.txt, *.md mirrors)
  → generate-jsonld (home)   (NEW or folded into above)
```
robots.txt is static (committed, not generated).

## 6. Verification

- `npm run build` succeeds; inspect generated `robots.txt`, `llms.txt`, `llms-full.txt`, a sample of `.md` mirrors.
- Validate every JSON-LD block (Google Rich Results test / `schema.org` validator / `npx structured-data-testing-tool`): Person+ProfilePage on home, Organization on a company, SoftwareApplication on a product, CreativeWork on a patent.
- `curl` (or local static server) each new artifact → 200 + correct content-type.
- View-source a company & patent page → real title, canonical = clean URL, summary text present **without JS**.
- Mixpanel: simulate `?utm_source=chatgpt` → confirm `ai_referral` event + `ai_source` super-property in the local console/Mixpanel debug.
- Sitemap still lists all live URLs; no orphaned/placeholder routes.

## 7. Rollout

Single feature branch → PR to `main` (per Bill's flow for product repos this is PR-based; portfolio's main branch). Vercel preview deploy for final checks (rewrites, headers, JSON-LD over real HTTP) before merge.

## 8. Risks / Notes

- **Placeholder data leaks into AI surfaces** — handled by WS-8 before discoverability ships.
- **Analytics double-counting during transition** — PostHog + Mixpanel both fire; expected and acceptable while validating parity. The shared AI-referral helper keeps them in sync; LogRocket retires first, Mixpanel after parity is confirmed.
- **Canonical/domain:** `index.html` canonical = `https://www.trevillyan.dev` but `<link rel="canonical">` on detail pages references `detail_*`. Standardize on `https://www.trevillyan.dev` everywhere (WS-4 fixes detail pages).
- **JSON-LD must match visible content** (Google penalizes mismatch) — generate from the same data the page renders.
- **Patent schema** — no native type; `CreativeWork` + `identifier` + `sameAs`→Google Patents is the accepted pattern.
- Keep all artifacts generated from data so they never drift from the YAML source of truth.

## 9. Resolved Decisions (Bill, 2026-06-20)

1. ✅ **Placeholder data** — fix before shipping (WS-8).
2. ✅ **`sameAs`** — LinkedIn + X + GitHub + founded-company sites + Google Patents inventor page.
3. ✅ **Crawler policy** — allow answer engines, block AI training crawlers (WS-1).
4. ✅ **Static pages** — minimal inline content (name + description + highlights) is enough.
5. ✅ **Analytics** — add PostHog (going-forward), keep Mixpanel + LogRocket during transition; LogRocket retiring soon (WS-5).

## 10. Remaining Questions — RESOLVED (Bill, 2026-06-20)

1. ✅ **Fake testimonials** — remove the fabricated-quote blockquotes (keep the rest of each press release).
2. ✅ **Metric rephrasings** — use "7-figure ARR from a Fortune 50 corporation" (Clip); drop the dollar figure from the NewsNook line.
3. ✅ **Crunchbase** — add personal profile to `sameAs`: `https://www.crunchbase.com/person/william-trevillyan-0e52`.
4. ✅ **PostHog** — stand up a **new** PostHog project. *Dependency:* the project must be created in the PostHog dashboard (can't be done headlessly without auth) to get the **project API key** + region host (us/eu). I'll wire the key in at build time (it's a public client-side key, but injected via build/env per convention, not hand-committed). I'll flag exactly where the key is needed when I reach WS-5.

## 11. sameAs — final list
`https://www.linkedin.com/in/williamtrevillyan` · `https://twitter.com/wgtrevillyan` · `https://github.com/wgtrevillyan` · `https://www.crunchbase.com/person/william-trevillyan-0e52` · founded-company sites (newsnook.io, trevillyanlabs.io, …) · Google Patents inventor page.

---

### Proposed deliverables checklist
- [ ] `robots.txt` (static) — allow answer engines, block training crawlers
- [ ] `scripts/generate-llms.js` → `llms.txt`, `llms-full.txt`, `*.md` mirrors (from data)
- [ ] Homepage `@graph` JSON-LD (Person / ProfilePage / WebSite) with `sameAs`
- [ ] Per-entity JSON-LD via generators (Organization / SoftwareApplication / CreativeWork)
- [ ] Company + patent per-slug static pages (generalize product generator)
- [ ] PostHog added (shared header) + AI-referral helper dual-firing to PostHog & Mixpanel
- [ ] WS-8 placeholder scrub (YAML + rebuild)
- [ ] `vercel.json` headers + rewrites
- [ ] `npm run build` wiring + README update (incl. analytics transition)

---

## Implementation notes (2026-06-20)

Shipped on branch `claude/frosty-nightingale-04e55d`. New build steps wired into `npm run build`:
`inject-analytics.js` → `generate-{product,company,patent}-pages.js` → `generate-home-jsonld.js` → `generate-llms.js`, with shared helpers in `scripts/lib/seo.js`. New static file: `robots.txt`. New generated artifacts: `llms.txt`, `llms-full.txt`, `index.md`, per-entity `*.md` mirrors, `company_pages/`, `patent_pages/`.

**Deviations from the draft (all for correctness):**
- **`Person.sameAs`** lists Bill's *own* profiles only (LinkedIn, X, GitHub, Crunchbase, Google Patents inventor search) — company sites were dropped because `sameAs` on a Person must point to the same person, not to organizations. Company URLs live on the `Organization` entities instead.
- **No founder/employee claim** in `Organization` JSON-LD — Bill founded some companies but not others, and the data has no role field. Add a per-company role mapping to assert `founder` safely.
- **"John Smith" spokesperson quotes** in `appfolio-sync` and `incode-concierge` press releases were left in place — they weren't part of the Jane/John-Doe-at-ABC decision. Flagged for Bill: remove or replace (open item).
- **PostHog** runs in dual-fire mode with Mixpanel; token via `NEXT_PUBLIC_POSTHOG_TOKEN` (set in Vercel). LogRocket/Mixpanel untouched (retire later).

**Still needs a Vercel preview to verify** (can't be checked by a local static server): per-slug rewrites, `Content-Type` headers for `*.md`/`llms*.txt`/`robots.txt`, and PostHog `ai_source` tagging with the real token.
