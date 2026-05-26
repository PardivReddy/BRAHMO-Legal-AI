# BRAHMO Legal AI

> Enterprise-grade Legal AI Orchestration Platform with Retrieval-Augmented Generation (RAG), Live Indian Kanoon Research, Knowledge Injection, and Multi-Level Legal Intelligence Pipelines.

---

# Overview

BRAHMO Legal AI is an advanced legal drafting and orchestration platform designed to demonstrate how AI systems can progressively improve legal reasoning through:

- template orchestration
- knowledge graph injection
- live legal precedent retrieval
- contextual grounding
- deterministic evaluation
- trust-aware telemetry

The platform compares **three levels of legal intelligence** side-by-side:

| Level | Description |
|---|---|
| **Level 1** | Generic LLM drafting |
| **Level 2** | Template-guided legal drafting |
| **Level 3** | Knowledge + precedent-grounded orchestration |

---

# Key Features

## Multi-Level Legal Intelligence
- 3-level orchestration architecture
- side-by-side intelligence comparison
- deterministic scoring system
- trust-aware telemetry

## Retrieval-Augmented Generation (RAG)
- live Indian Kanoon precedent retrieval
- legal authority extraction
- knowledge graph injection
- contextual grounding

## Legal Workflow Orchestration
- criminal law workflows
- corporate law workflows
- anticipatory bail drafting
- NDA review
- arbitration clause generation
- board resolution drafting

## Knowledge Injection Engine
- constraint injection
- anti-pattern injection
- strategic guidance injection
- decision intelligence retrieval

## Trust & Evaluation Layer
- grounding score
- retrieval score
- reasoning score
- structural score
- deterministic intelligence index

## Premium UI/UX
- monochrome enterprise interface
- smooth transitions and animations
- responsive dashboard layout
- live orchestration telemetry

---

# Architecture

## System Architecture

![BRAHMO Architecture](D:\brahmo-legal-ai\assests)

---

## High-Level Pipeline

```text
User Query
   ↓
Query Classification
   ↓
Template Selection
   ↓
Knowledge Retrieval
   ↓
Relevance Ranking
   ↓
Indian Kanoon Research
   ↓
Prompt Orchestration
   ↓
3-Level Generation
   ↓
Section Normalization
   ↓
Deterministic Evaluation
   ↓
Final Response Rendering
```

---

# Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + React + TypeScript |
| Styling | TailwindCSS + Framer Motion |
| Backend | Next.js API Routes |
| Database | Supabase |
| AI | Google Gemini |
| Retrieval | Indian Kanoon |
| Validation | ESLint + TypeScript |
| Deployment | AWS EC2 (planned) |

---

# Core Components

## Frontend
- Query input dashboard
- 3-level comparison interface
- injected knowledge visualization
- Indian Kanoon research panel
- telemetry & scoring dashboard

## Backend API Layer
- query classification
- template orchestration
- knowledge injection
- precedent retrieval
- output evaluation

## Supabase Storage
- legal templates
- knowledge nodes
- section mappings
- court formats
- IK retrieval cache
- matter storage

---

# Database Schema

## Tables

| Table | Purpose |
|---|---|
| `legal_templates` | Legal drafting templates |
| `knowledge_nodes` | Strategic legal knowledge graph |
| `section_mappings` | IPC → BNS normalization |
| `court_formats` | Court-specific formatting |
| `ik_case_cache` | Indian Kanoon caching |
| `matters` | Client/matter management |

---

# Legal Intelligence Levels

## Level 1 — Generic AI
- raw LLM generation
- no templates
- no knowledge
- no retrieval

## Level 2 — Template Intelligence
- legal template orchestration
- structured drafting
- better formatting
- moderate legal reasoning

## Level 3 — Grounded Legal Intelligence
- live precedent retrieval
- knowledge graph injection
- strategic legal reasoning
- contextual grounding
- trust-aware generation

---

# Indian Kanoon Integration

The system integrates live Indian Kanoon retrieval to:
- search precedents
- extract citations
- retrieve courts
- inject relevant legal principles
- improve grounding quality

Features:
- retrieval caching
- timeout handling
- graceful fallback orchestration
- authority separation
- precedent parsing

---

# Trust & Telemetry

BRAHMO uses deterministic evaluation instead of arbitrary AI scoring.

## Metrics

| Metric | Description |
|---|---|
| Structure | Formatting quality |
| Reasoning | Legal reasoning sophistication |
| Grounding | Retrieval & authority grounding |
| Retrieval | Precedent & knowledge usage |
| Citation | Citation relevance |

---

# Screenshots

## Main Dashboard

(Add screenshot)

---

## Level Comparison

(Add screenshot)

---

## Live Indian Kanoon Retrieval

(Add screenshot)

---

## Intelligence Telemetry

(Add screenshot)

---

# Demo Queries

## Criminal Law

### Anticipatory Bail
```text
Draft anticipatory bail for a director accused in an economic offence where arrest is apprehended but documents are already seized.
```

### White Collar Offence
```text
Draft bail arguments in a money laundering investigation involving alleged shell companies.
```

---

## Corporate Law

### NDA Review
```text
Review and tighten a mutual NDA for a SaaS vendor engagement.
```

### Arbitration Clause
```text
Draft an arbitration clause with seat Mumbai for a shareholders agreement.
```

### Board Resolution
```text
Draft a board resolution approving appointment of an additional director.
```

---

# Local Development Setup

## 1. Clone Repository

```bash
git clone <your-repo-url>
cd brahmo-legal-ai
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create:

```bash
.env.local
```

Using:

```bash
cp .env.example .env.local
```

---

## 4. Add Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Gemini
GEMINI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Indian Kanoon
INDIAN_KANOON_API_KEY=
```

---

# Supabase Setup

## 1. Create Supabase Project

Create a new project at:

https://supabase.com/

---

## 2. Run Schema

Execute:
```sql
schema.sql
```

inside Supabase SQL Editor.

---

## 3. Run Seed

Execute:
```sql
seed.sql
```

inside Supabase SQL Editor.

---

# Run Development Server

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

# Validation

Run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

---

# Deployment (Planned)

Planned production deployment stack:

| Layer | Service |
|---|---|
| Compute | AWS EC2 |
| Reverse Proxy | Nginx |
| Process Manager | PM2 |
| Database | Supabase |
| SSL | Let's Encrypt |

---

# Engineering Highlights

## Retrieval-Augmented Generation
- live legal research
- contextual grounding
- precedent injection

## Knowledge Graph Orchestration
- strategic guidance retrieval
- anti-pattern detection
- constraint injection

## Trust-Aware UX
- provenance separation
- retrieval transparency
- deterministic telemetry

## Production Engineering
- modular architecture
- TypeScript safety
- caching layer
- graceful fallback handling

---

# Final Validation Status

| Validation | Status |
|---|---|
| ESLint | ✅ |
| TypeScript | ✅ |
| Production Build | ✅ |
| Retrieval Pipeline | ✅ |
| Supabase Integration | ✅ |
| Gemini Integration | ✅ |
| Indian Kanoon Integration | ✅ |

---

# Future Improvements

- PDF export
- DOCX generation
- authentication layer
- matter persistence
- advanced legal analytics
- vector embeddings
- semantic retrieval
- multi-jurisdiction support

---

# License

For assessment/demo purposes only.

---

# Author

**Pardiv Reddy**

AI Engineer | Full Stack Developer | Legal AI Systems