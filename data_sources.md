# BRAHMO Legal AI — Data Sources

This document describes every external and curated data source used by the platform.

## 1. Indian Kanoon (case law)

| Aspect | Detail |
|--------|--------|
| **Usage** | Level 3 precedent retrieval only |
| **Method** | Live HTML search scrape (cheerio) — primary |
| **Optional** | REST API via `INDIAN_KANOON_API_KEY` |
| **Cache** | Supabase `ik_case_cache` (72h TTL, keyed by normalized query hash) |
| **Output** | Title, court, snippet, URL per authority |
| **UI** | “Authorities retrieved” list is sourced **only** from `ikResearch.results` |

Limitations: scrape depends on Indian Kanoon HTML structure; titles like “Full Document” are filtered and recovered from snippets when possible.

## 2. Google Gemini

| Aspect | Detail |
|--------|--------|
| **Model** | Gemini 2.5 Flash (configurable in `src/lib/gemini.ts`) |
| **Usage** | All three drafting levels |
| **Input** | Level-specific prompts from `src/lib/prompt-builder.ts` |
| **Output** | Draft text + token counts |

Gemini does **not** produce intelligence scores shown in the UI. Scores are computed server-side after generation.

## 3. Supabase

| Table | Purpose |
|-------|---------|
| `legal_templates` | Document skeletons by practice area / document type |
| `knowledge_nodes` | Firm knowledge graph (constraints, decisions, client facts) |
| `ik_case_cache` | Indian Kanoon search cache |
| `section_mappings` | IPC/BNS and related statutory normalization |
| `court_formats` | Court-specific formatting metadata |
| `matters` | Matter tracking (optional client linkage) |

## 4. Legal principles (prompt guidance)

Level 3 prompts include **domain guidance** for common Indian litigation themes (e.g. anticipatory bail, economic offences, custodial interrogation). Landmark principles may be named in instructions (Sushila Aggarwal, Arnesh Kumar, Siddharth v. State) as drafting guidance — but **UI authority lists** only show cases actually retrieved from Indian Kanoon.

## 5. Template sources

Templates are stored in Supabase `legal_templates` and matched via:

- `src/lib/template-selector.ts` — keyword registry (practice area, document type, court)
- Seed data in `supabase/seed.sql` (when applied)

Supported document types include criminal (bail, quashing, appeals) and corporate (NDA, board resolutions, compliance, arbitration, shareholder disputes).

## 6. Manually curated knowledge nodes

Knowledge nodes are authored records in `knowledge_nodes` with:

- `practice_area`, `category`, `title`, `content`
- `relevance_tags`, `priority`, optional `client_id` / `matter_id`

Injected by `src/lib/knowledge-injector.ts` with token budget and relevance ranking.

## 7. Statutory references

`section_mappings` enables IPC → BNS (and related) normalization in generated text via `src/lib/section-normalizer.ts`. References appear in API metadata under `knowledge.sectionNormalization`.

## Data lineage summary

```
User query
  → Classification (local keyword registry)
  → Template (Supabase)
  → Knowledge nodes (Supabase)
  → Indian Kanoon (web scrape → cache)
  → Prompt assembly
  → Gemini
  → Post-processing (sections, intelligence metrics)
```
