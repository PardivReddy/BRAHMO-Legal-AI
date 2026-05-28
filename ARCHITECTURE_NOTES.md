# BRAHMO Legal AI — Architecture Notes

---

# 1. Executive Summary

BRAHMO Legal AI is a legal drafting orchestration platform built to produce grounded, audit-ready legal text for Indian practice areas. It is not a generic chatbot; it is a structured system that combines query classification, legal template orchestration, institutional knowledge injection, and live authority retrieval.

The product solves the core problem of legal AI output quality: generic LLM responses are too unconstrained, too informal, and insufficiently traceable for legal drafting. BRAHMO addresses that by layering:

- L1 generic draft generation for broad legal text baseline,
- L2 template-driven structure for consistent document form,
- L3 precedent-grounded drafting using Indian Kanoon retrieval plus firm intelligence.

This layered design makes the system more reliable, explainable, and defensible than a simple assistant that only uses one LLM prompt.

---

# 2. System Goals & Design Philosophy

- Progressive intelligence architecture: the system intentionally stages output depth so each layer is a measurable improvement over the prior one.
- Orchestration-first design: the system is built around a request pipeline rather than a single monolithic model call.
- Grounded legal generation: live precedent retrieval and internal knowledge nodes are treated as first-class inputs.
- Explainability: outputs are surfaced with trust signals, grounding data, and retrieval context.
- Retrieval transparency: search queries, counts, and cache status are recorded and exposed.
- Provider resilience: the AI stack supports multiple providers, quota checks, and fallback routing.
- Modular scalability: classification, templates, retrieval, and knowledge injection are separate subsystems.
- Observability-driven UX: the UI intentionally shows where intelligence depth and grounding occur.

These principles were chosen to make a production-ready legal AI workflow that is easier to review, harder to misinterpret, and safer for lawyer-facing use.

---

# 3. High-Level System Architecture

## Frontend Layer

The frontend is a Next.js client rendered page (`src/app/page.tsx`) that captures user queries, shows status, and compares L1/L2/L3 outputs. It also surfaces validation panels for live retrieval, knowledge injection, and provider health.

## API Layer

The API layer is a server route at `src/app/api/generate/route.ts` and a status route at `src/app/api/integration-status/route.ts`. The generate route orchestrates the full pipeline and returns a structured response, while integration status validates runtime dependencies.

## AI Orchestration Layer

`src/lib/ai/orchestration/orchestrator.ts` is the core provider router. It abstracts provider selection, circuit state, quota evaluation, fallback decision-making, metrics capture, and request execution.

## Retrieval Layer

Indian Kanoon retrieval is implemented in `src/lib/indiankanoon.ts`. It normalizes queries, fetches case metadata, parses results, and caches them in Supabase for short-term reuse.

## Knowledge Graph Layer

`src/lib/knowledge-injector.ts` retrieves firm-specific knowledge nodes from Supabase. It ranks them against query tags and builds an injection payload for L3 prompts.

## Validation Layer

`src/lib/section-normalizer.ts` normalizes statutory references. Validation is also surfaced in the UI via `GroundingValidationPanel.tsx`, which communicates retrieval, template, and normalization outcomes.

## Telemetry Layer

Telemetry is recorded through `src/lib/ai/utils/metrics.ts`, provider metrics in `src/lib/ai/orchestration/orchestrator.ts`, and environment checks in `src/lib/ai/utils/env.ts`.

## Data Layer

Supabase is the system database. It stores templates, knowledge nodes, section mappings, matter metadata, and an IK cache table.

## Infrastructure Layer

The runtime is a Node-compatible Next.js app that is designed to run behind a reverse proxy. The deployment architecture is expected to use EC2/PM2/Nginx for stable production delivery and process management.

---

# 4. End-to-End Request Lifecycle

## User Query

The user enters a natural language legal request in the UI. This is the canonical input for the pipeline.

## Query Classification

`src/lib/template-selector.ts` scores the query against a keyword registry and classifies it by practice area, document type, and court type. This determines which template and knowledge tags will apply.

## Template Selection

The selected classification is matched against `legal_templates` in Supabase. The chosen template provides document structure and fields for L2/L3.

## Knowledge Retrieval

`src/lib/knowledge-injector.ts` loads active knowledge nodes for the practice area, ranks them by tag match and priority, and enforces a token budget.

## Indian Kanoon Retrieval

`src/lib/indiankanoon.ts` builds a normalized IK search query, calls the API or scraper, parses results, and caches them. This produces precedent candidates for L3 grounding.

## Prompt Construction

Prompt builders in `src/lib/prompt-builder.ts` assemble three different prompts:

- L1 generic prompt,
- L2 template prompt,
- L3 knowledge + precedent prompt.

Each prompt includes tailored instructions and context for the target sophistication level.

## L1/L2/L3 Generation

`src/lib/generation-helpers.ts` dispatches each prompt to the AI orchestration layer. L1, L2, and L3 are generated in parallel where possible, then the output is combined.

## Section Normalization

`src/lib/section-normalizer.ts` scans generated text for IPC/CrPC references and maps them to BNS/BNSS equivalents using Supabase mappings.

## Evaluation

`src/lib/intelligence-score.ts` computes side-by-side intelligence metrics, token usage, and trust signals for each level.

## Grounding Validation

The response payload includes retrieval metadata, selected template, normalization counts, and provider signals. The frontend uses these values to render transparent trust indicators.

## UI Rendering

`src/app/page.tsx` renders the final result with:

- L1/L2/L3 comparison,
- knowledge panel,
- grounding validation panel,
- Indian Kanoon research summary,
- integration status.

This flow improves legal generation quality by making every stage auditable and by isolating riskier model behavior behind progressively stronger contexts.

---

# 5. L1 / L2 / L3 Orchestration Philosophy

## L1 — Generic AI

L1 is a pure model-generated draft built only from the raw query. It is the baseline output and serves two purposes:

- sanity-checking what a generic LLM would propose,
- providing a comparison point for richer orchestration.

L1 has no retrieval and no institutional context, so it is intentionally weak on citation and formatting.

## L2 — Template Intelligence

L2 introduces structured legal templates and document skeletons. It enforces:

- consistent headings,
- court-aware filing structure,
- predictable clause order,
- document-level formatting.

This ensures the draft looks like legal work product and avoids the free-form drift of L1.

## L3 — Grounded Legal Intelligence

L3 combines L2 structure with:

- live Indian Kanoon precedent retrieval,
- injected firm knowledge nodes,
- section normalization,
- explicit trust signals.

It is the most defensible layer because it blends authority awareness with institutional drafting guidance.

### Why this progression?

A staged architecture lets reviewers and users see how much value is added at each step. L1 is cheap and fast; L2 adds structure; L3 adds grounding. This is why L3 is more trustworthy than L1: it is not just more polished, it is explicitly connected to precedent and firm reasoning.

---

# 6. AI Provider Orchestration System

The AI provider orchestration system is implemented in `src/lib/ai/orchestration/orchestrator.ts` and uses provider adapters from `src/lib/ai/providers`.

Key capabilities:

- provider abstraction for Gemini, OpenAI, Groq, Claude, and local fallback,
- provider availability checks,
- quota checks via `quota-manager`,
- circuit breaker handling via `circuit-breaker`,
- provider fallback sequencing in `fallback.ts`,
- runtime request metrics,
- model normalization and routing logic.

The system uses a default fallback order `gemini -> openai -> groq -> claude -> local`. If a provider fails with retryable errors, the orchestrator can continue to the next provider and record fallback activity.

Provider telemetry matters because it makes failures observable and enables reviewers to see if the system is operating in degraded mode or if the output came from a fallback provider.

Multi-provider orchestration improves reliability by reducing dependence on a single API, enabling regional redundancy, and preserving availability when one provider is rate-limited or unavailable.

---

# 7. Retrieval & Grounding Architecture

Indian Kanoon integration is implemented through `src/lib/indiankanoon.ts`. This module:

- normalizes user queries to focus on legal issue terms,
- computes a cache key,
- checks Supabase cache before making a live call,
- performs timed HTTP fetches,
- parses case metadata into structured `IKCaseResult` values.

Grounding is not just retrieval; it is also about how retrieved authorities are consumed. Retrieved cases are passed into the L3 prompt builder, giving the model explicit precedent context.

Retrieval improves legal reasoning by anchoring the draft to concrete authorities rather than abstract patterns. L3 grounding differs from generic prompting because it supplies actual case metadata and search context, not just more instructions.

Authority visibility is surfaced in the UI via `IKResearchPanel.tsx`, which shows whether live retrieval succeeded, whether results came from cache, and the query used to obtain precedents.

---

# 8. Knowledge Graph / Institutional Intelligence

The knowledge graph is represented by the `knowledge_nodes` table in Supabase and consumed by `src/lib/knowledge-injector.ts`.

Knowledge nodes are categorized into:

- constraints,
- anti-patterns,
- decision notes,
- client facts,
- drafting heuristics,
- strategy notes.

The injector ranks nodes by tag intersection, keyword matches, client/matter relevance, and category priority. It then assembles an injection payload constrained by a token budget.

Institutional intelligence differs from raw prompting because it encodes practice-specific rules, firm preferences, and legal drafting discipline as discrete node content rather than ad-hoc LLM instructions.

This kind of knowledge injection improves consistency by making L3 output less dependent on prompt engineering and more dependent on curated legal context.

Orchestration visibility matters because reviewers can see when firm knowledge influenced L3 and can compare that against raw model output.

---

# 9. Grounding Validation System

The grounding validation system is both a runtime architecture concept and a UI feature.

Key pieces:

- `GroundingValidationPanel.tsx` surfaces trust signals,
- `IKResearchPanel.tsx` shows precedent retrieval details,
- `KnowledgePanel.tsx` shows injected knowledge node counts,
- `IntegrationStatusPanel.tsx` validates provider and Supabase readiness.

The intent is to make orchestration transparent, so reviewers can see:

- whether a template was used,
- whether live retrieval occurred,
- which provider generated the final output,
- how many statutory references were normalized.

This improves reviewer trust because it turns opaque LLM output into a traceable pipeline artifact.

---

# 10. Section Normalization System

`src/lib/section-normalizer.ts` converts old statutory references like `Section 438 CrPC` into updated mappings such as `Section X BNSS` or `Section Y BNS` when supported by the database.

This matters in the Indian legal context because the legal code is undergoing modernization and Indian Kanoon retrieval may still surface legacy section codes.

Normalized section references reduce the risk of outdated citations and help keep generated drafts compatible with modern statutory nomenclature.

---

# 11. Frontend & UX Philosophy

The frontend is intentionally built to make reasoning depth visible.

Goals:

- Show L1/L2/L3 side by side so a reviewer can compare progression.
- Display telemetry and provider health in `IntegrationStatusPanel.tsx`.
- Expose grounding metadata so retrieval is not hidden.
- Surface knowledge injection outcomes so institutional intelligence is visible.

This UX communicates three increasing dimensions:

- reasoning depth (generic → structured → grounded),
- grounding quality (raw draft → templated draft → precedent-aware draft),
- institutional intelligence (prompt-only → template orchestration → knowledge injection + retrieval).

That makes the app suitable for demos and interviews because it shows a clear engineering story instead of a single black-box response.

---

# 12. Folder Structure & System Organization

## src/app

Contains the page and API routes. `page.tsx` is the main demo surface. `api/generate/route.ts` handles generation requests.

## src/components

Contains UI building blocks and validation panels. These components expose the orchestration story to the user.

## src/lib

The core business logic lives here. This includes prompt builders, AI orchestration, retrieval, template selection, knowledge injection, section normalization, and utilities.

## src/lib/ai

Contains provider adapters, orchestrator logic, and shared AI utilities. This is the heart of multi-provider reliability.

## src/lib/ai/providers

Provider-specific wrappers live here. They abstract Gemini, OpenAI, Groq, Claude, and local providers.

## src/lib/ai/orchestration

Contains fallback, quota, circuit-breaker, and request routing logic.

## src/types

Contains shared TypeScript interfaces for legal classification, generation payloads, and UI response shapes.

## assets

Contains static assets for branding and frontend presentation.

## public

Serves static files and any client-facing resources.

---

# 13. Key File Walkthrough (5W Style)

## `src/app/page.tsx`

- What: main application shell and demo page.
- Why: capture queries, show integration status, and compare L1/L2/L3.
- When: on every user visit and after generation requests complete.
- Where: frontend layer.
- How: fetches `/api/generate`, renders panels, and manages query state.

## `src/app/api/generate/route.ts`

- What: API entrypoint for legal draft generation.
- Why: orchestrate classification, template selection, knowledge injection, retrieval, and AI calls.
- When: when the user submits a query.
- Where: server-side API layer.
- How: calls helpers, consolidates outputs, normalizes sections, and returns structured JSON.

## `src/lib/ai/orchestration/orchestrator.ts`

- What: provider router and metrics engine.
- Why: abstract provider-specific details and support fallback.
- When: each draft generation request.
- Where: AI orchestration layer.
- How: evaluates availability, checks circuits/quotas, executes provider calls, logs tokens, and handles errors.

## `src/lib/ai/orchestration/fallback.ts`

- What: fallback sequencing rules.
- Why: decide when to continue to an alternate provider.
- When: on provider failures.
- Where: provider resilience layer.
- How: exposes provider order and retry decisions.

## `src/lib/generation-helpers.ts`

- What: L1/L2/L3 generation driver.
- Why: keep prompt-specific generation flows separated.
- When: during API generation.
- Where: end-to-end request pipeline.
- How: builds the right prompt and invokes `generateContent` for each level.

## `src/lib/env.ts`

- What: environment validation utilities.
- Why: verify required runtime configuration.
- When: on integration status and startup checks.
- Where: configuration layer.
- How: checks keys like Gemini and Supabase env vars.

## `src/lib/ai/utils/metrics.ts`

- What: AI telemetry event emitter.
- Why: record provider latency, token use, and fallback activity.
- When: after each provider call.
- Where: telemetry layer.
- How: logs structured JSON events to stdout.

## `src/lib/ai/utils/errors.ts`

- What: provider error classification.
- Why: distinguish retryable vs terminal failures.
- When: during provider error handling.
- Where: reliability layer.
- How: maps provider errors to normalized codes.

## `src/components/GroundingValidationPanel.tsx`

- What: UI surface for grounding trust signals.
- Why: expose orchestration transparency.
- When: after generation results arrive.
- Where: frontend validation layer.
- How: renders counts and flags for template, retrieval, normalization, and provider usage.

## `src/components/KnowledgePanel.tsx`

- What: knowledge injection summary component.
- Why: show which institutional nodes were used.
- When: when L3 is generated.
- Where: frontend layer.
- How: displays node count and any injection warnings.

## `src/components/IKResearchPanel.tsx`

- What: Indian Kanoon retrieval summary.
- Why: show live precedent evidence and cache state.
- When: if any IK research activity occurred.
- Where: frontend retrieval layer.
- How: shows query, result list, and retrieval warnings.

## `src/components/IntegrationStatusPanel.tsx`

- What: runtime dependency status monitor.
- Why: validate providers and Supabase before a demo.
- When: on page load.
- Where: frontend health layer.
- How: queries `/api/integration-status` and displays readiness.

---

# 14. Database & Data Layer

Supabase is the system database. Primary tables include:

- `legal_templates`: stores active document templates and metadata.
- `knowledge_nodes`: stores curated institutional intelligence and reasoning fragments.
- `section_mappings`: stores legacy-to-modern legal section mappings.
- `ik_case_cache`: caches Indian Kanoon results for short-term reuse.
- `matters`: stores matter metadata if matter-aware workflows are used.

Structured storage matters because orchestration needs discrete, queryable signal sources rather than one-off prompt blobs. It makes templates, knowledge, and normalization explicit and versionable.

---

# 15. Infrastructure & Deployment

The runtime is a Node-compatible Next.js application. The design supports a standard deployment stack:

- AWS EC2 for application hosts,
- PM2 for process management and restarts,
- Nginx as reverse proxy and TLS terminator,
- environment variables for provider keys and Supabase configuration,
- production build workflow via Next.js build.

This architecture was chosen because it provides predictable process control, standard observability hooks, and a stable backend for API routes and server-side orchestration.

---

# 16. Scalability Philosophy

The system is modular so new legal domains can be added without rewriting core logic.

- New practice areas are added by extending the keyword registry and template catalog.
- New templates scale through Supabase-managed `legal_templates` records.
- Retrieval scales by adding new query variants and cache capacity, not by changing the pipeline.
- Provider orchestration scales by adding or reordering providers in the orchestrator.
- Knowledge graphs scale by adding more `knowledge_nodes` and improving ranking.

This design supports future additions such as criminal, corporate, family law, and litigation workflows in a contained, data-driven way.

---

# 17. Security & Reliability Considerations

- Provider fallback resilience reduces outage risk.
- Environment isolation is enforced by explicit env checks and separate provider configs.
- API keys are never hard-coded; they are read from runtime environment variables.
- Graceful degradation is built into knowledge injection and Indian Kanoon retrieval: failures are logged but do not block response generation.
- Runtime telemetry and provider metrics make failures discoverable.
- Orchestration stability is preserved by separating classification, retrieval, template selection, and model execution.

---

# 18. Current Limitations

- The knowledge graph is seeded and not yet a fully trained legal ontology.
- Retrieval is based on keyword-normalized Indian Kanoon search rather than embeddings or deep semantic matching.
- There is no dedicated vector database or advanced reranking layer.
- Legal reasoning depth is still prototype-level and depends on L3 prompt quality.
- There is limited judge/personality modeling or courtroom preference adaptation.
- Retrieval ranking is basic and may surface relevant but not optimal authorities.
- The system does not yet have automated legal citation verification.

---

# 19. Future Production Roadmap

Potential upgrades include:

- embedding-based retrieval and semantic search,
- vector database integration for precedent similarity,
- advanced semantic reranking of authorities,
- lawyer feedback loops for matter refinement,
- persistent matter memory and client-specific intelligence,
- judge preference modeling and heuristics,
- stronger evaluation systems for accuracy and formatting,
- formal citation verification and authority validation,
- human-in-the-loop review workflows.

---

# 20. Demo Walkthrough Summary

Recommended demo flow:

1. Start with the query input and explain the problem statement.
2. Show the integration status panel to establish system readiness.
3. Submit a demo query and let the audience watch the L1/L2/L3 comparison appear.
4. Point out the difference between the generic draft, template draft, and grounded draft.
5. Open the grounding panel and Indian Kanoon panel to show retrieval and knowledge signals.
6. Highlight metrics and trust signals rather than just the draft text.
7. Close with the architecture story: layered orchestration, provider resilience, and explicit grounding.

Strongest talking points:

- this is a legal AI orchestration platform, not a single prompt,
- it uses live precedent retrieval and template structure,
- it makes producer decisions visible,
- it is designed for reviewer trust and engineering defensibility.

---

# 21. Final Technical Summary

BRAHMO Legal AI is a system-engineered legal drafting platform built around progressive orchestration: generic baseline generation, template-driven structure, and grounded precedent + knowledge enrichment.

The strongest architecture decisions are:

- separating L1/L2/L3 so quality improvements are visible,
- abstracting AI providers for resilience,
- making retrieval and knowledge injection first-class pipeline inputs,
- using Supabase to store templates, knowledge, and section maps,
- surfacing grounding and provider signals in the UI.

In short, BRAHMO is a legal AI orchestration platform focused on grounded legal intelligence, explainable orchestration, provider resilience, and institutional reasoning — rather than a generic chatbot interface.
