# Tasks — Product Portfolio

Backlog and follow-ups for [trevillyan.dev](https://www.trevillyan.dev). Add items as they come up; keep done items briefly for context or delete them.

## Deferred (not urgent)

- [ ] **GEO/LLM citation test** _(added 2026-06-22)_ — ~1–2 weeks after the AI-discoverability deploy, ask ChatGPT, Claude, and Perplexity questions like "Who is William Trevillyan?" and "What products has Bill Trevillyan built?" Confirm trevillyan.dev is surfaced/cited and the facts are accurate. Perplexity usually reflects fresh crawls fastest. Validates that the JSON-LD + `llms.txt` + Markdown mirrors are paying off in real answer engines.
- [ ] **Verify PostHog AI-referral events** _(added 2026-06-22)_ — visit `https://www.trevillyan.dev/?utm_source=chatgpt` (or arrive via a real AI-engine referrer) and confirm in PostHog's live events that an `ai_referral` event fires with the `ai_source` super-property set. The token is wired in Vercel (Production + Development) and `posthog.init` is confirmed on the live site; this test confirms events actually reach the PostHog project. Optional: add `NEXT_PUBLIC_POSTHOG_TOKEN` to **all** preview branches via the Vercel dashboard (the CLI's all-branches path is buggy).
