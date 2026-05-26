# BRAHMO Legal AI — Case Sources & Indian Kanoon Integration

> **Version:** 1.0.0
> **Last Updated:** 2026-05-25
> **Status:** Living Document

---

## Table of Contents

1. [Indian Kanoon API Integration](#1-indian-kanoon-api-integration)
2. [Case Citation Formats](#2-case-citation-formats)
3. [Court Hierarchy](#3-court-hierarchy)
4. [Data Fields from Indian Kanoon API](#4-data-fields-from-indian-kanoon-api)
5. [Caching Strategy](#5-caching-strategy)
6. [IPC → BNS Section Mapping](#6-ipc--bns-section-mapping)

---

## 1. Indian Kanoon API Integration

### Overview

[Indian Kanoon](https://indiankanoon.org) is the largest free repository of Indian court judgments, statutes, and legal documents. BRAHMO integrates with the Indian Kanoon (IK) API to fetch relevant case law for knowledge-enriched document generation.

### API Base URL

```
https://api.indiankanoon.org
```

### Authentication

All requests require an API token passed via the `Authorization` header:

```http
POST /search/
Authorization: Token <INDIAN_KANOON_API_KEY>
Content-Type: application/x-www-form-urlencoded
```

### Core Endpoints

#### 1. Search

```http
POST /search/
Content-Type: application/x-www-form-urlencoded

formInput=anticipatory+bail+section+438&pagenum=0
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `formInput` | string | Yes | Search query string |
| `pagenum` | integer | No | Page number (0-indexed, default: 0) |

**Response:** Returns a list of matching documents with metadata.

#### 2. Document Detail

```http
POST /doc/<doc_id>/
Authorization: Token <INDIAN_KANOON_API_KEY>
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `doc_id` | string | Yes | Unique document identifier (URL path param) |

**Response:** Returns full text of the judgment, metadata, and cited cases.

#### 3. Document Fragment (Snippet)

```http
POST /docfragment/<doc_id>/
Authorization: Token <INDIAN_KANOON_API_KEY>
Content-Type: application/x-www-form-urlencoded

formInput=bail+conditions
```

Returns only the fragments of a document matching the query — useful for extracting relevant excerpts without downloading the full judgment.

### Integration Architecture

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  BRAHMO App  │────▶│  IK Client    │────▶│  IK API      │
│  (generate)  │     │  (lib/ik/)    │     │  (external)  │
└──────────────┘     └───────┬───────┘     └──────────────┘
                             │
                     ┌───────▼───────┐
                     │  ik_case_cache│
                     │  (Supabase)   │
                     └───────────────┘
```

### Rate Limiting & Best Practices

- **Rate limit:** Approximately 50 requests/minute (varies by plan)
- **Retry strategy:** Exponential backoff with jitter (max 3 retries)
- **Timeout:** 10 seconds per request
- **Batch queries:** Group related searches to reduce API calls
- **Cache aggressively:** See [Caching Strategy](#5-caching-strategy)

### Error Handling

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 200 | Success | Process results |
| 400 | Bad request | Validate query, retry with sanitized input |
| 401 | Unauthorized | Check API key |
| 429 | Rate limited | Back off exponentially |
| 500 | Server error | Retry with backoff, fallback to cache |

---

## 2. Case Citation Formats

### Standard Indian Citation Formats

BRAHMO recognizes and generates the following citation formats:

#### Supreme Court

```
Arnesh Kumar v. State of Bihar, (2014) 8 SCC 273
Maneka Gandhi v. Union of India, AIR 1978 SC 597
State of Rajasthan v. Balchand, (1977) 4 SCC 308
```

**Pattern:** `<Party 1> v. <Party 2>, (<Year>) <Volume> <Reporter> <Page>`

#### High Courts

```
Sushila Aggarwal v. State (NCT of Delhi), 2020 SCC OnLine Del 300
Rajesh Sharma v. State of U.P., 2017 SCC OnLine All 2012
```

**Pattern:** `<Party 1> v. <Party 2>, <Year> SCC OnLine <Court Abbr> <Number>`

#### Neutral Citation (Post-2023)

```
2024 INSC 234
2024 DHC 1567
2024 BHC 890
```

**Pattern:** `<Year> <Court Code> <Number>`

### Citation Reporters

| Abbreviation | Full Name | Coverage |
|-------------|-----------|----------|
| SCC | Supreme Court Cases | Supreme Court |
| AIR | All India Reporter | All courts |
| SCR | Supreme Court Reports | Supreme Court |
| Cr LJ | Criminal Law Journal | Criminal cases |
| SCC OnLine | SCC Online | All courts (digital) |
| SCALE | SCALE Reports | Supreme Court |
| MANU | Manupatra | All courts (digital) |

### Citation Parsing in BRAHMO

```typescript
interface ParsedCitation {
  parties: { petitioner: string; respondent: string };
  year: number;
  volume?: number;
  reporter: string;
  page?: number;
  court: string;
  neutral_citation?: string;
}
```

---

## 3. Court Hierarchy

### Structure of the Indian Judiciary

```
                    ┌─────────────────────┐
                    │   Supreme Court     │
                    │   of India          │
                    │   (New Delhi)       │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌──────────────┐ ┌────────────┐ ┌──────────────┐
     │  High Court  │ │ High Court │ │  High Court  │
     │  (25 HCs)    │ │            │ │              │
     └──────┬───────┘ └─────┬──────┘ └──────┬───────┘
            │               │               │
     ┌──────▼───────┐ ┌─────▼──────┐ ┌──────▼───────┐
     │  District    │ │  District  │ │  District    │
     │  Courts      │ │  Courts    │ │  Courts      │
     └──────┬───────┘ └─────┬──────┘ └──────┬───────┘
            │               │               │
     ┌──────▼───────┐ ┌─────▼──────┐ ┌──────▼───────┐
     │ Subordinate  │ │Subordinate │ │ Subordinate  │
     │ Courts       │ │Courts      │ │ Courts       │
     └──────────────┘ └────────────┘ └──────────────┘
```

### Court Details

#### Supreme Court of India

| Attribute | Value |
|-----------|-------|
| **Location** | New Delhi |
| **Jurisdiction** | Appellate, original, advisory |
| **Judges** | Chief Justice + 33 judges (max 34) |
| **Key Articles** | Art. 124–147 of the Constitution |
| **Binding** | Binding on all courts in India |
| **IK Court Filter** | `supremecourt` |

#### High Courts (25)

| Court | Abbreviation | Jurisdiction |
|-------|-------------|-------------|
| Allahabad High Court | `All` | Uttar Pradesh |
| Bombay High Court | `Bom` | Maharashtra, Goa, Dadra & Nagar Haveli, Daman & Diu |
| Calcutta High Court | `Cal` | West Bengal, Andaman & Nicobar |
| Delhi High Court | `Del` | NCT of Delhi |
| Madras High Court | `Mad` | Tamil Nadu, Puducherry |
| Karnataka High Court | `Kar` | Karnataka |
| Kerala High Court | `Ker` | Kerala, Lakshadweep |
| Punjab & Haryana High Court | `P&H` | Punjab, Haryana, Chandigarh |
| Gauhati High Court | `Gau` | Assam, Nagaland, Mizoram, Arunachal Pradesh |
| Gujarat High Court | `Guj` | Gujarat |
| Jharkhand High Court | `Jhr` | Jharkhand |
| Chhattisgarh High Court | `CG` | Chhattisgarh |
| Rajasthan High Court | `Raj` | Rajasthan |
| Madhya Pradesh High Court | `MP` | Madhya Pradesh |
| Patna High Court | `Pat` | Bihar |
| Orissa High Court | `Ori` | Odisha |
| Himachal Pradesh High Court | `HP` | Himachal Pradesh |
| Uttarakhand High Court | `Utt` | Uttarakhand |
| Jammu & Kashmir High Court | `J&K` | Jammu & Kashmir, Ladakh |
| Telangana High Court | `Tel` | Telangana |
| Andhra Pradesh High Court | `AP` | Andhra Pradesh |
| Tripura High Court | `Tri` | Tripura |
| Meghalaya High Court | `Meg` | Meghalaya |
| Manipur High Court | `Man` | Manipur |
| Sikkim High Court | `Sik` | Sikkim |

#### District Courts

- **Count:** 672+ district courts across India
- **Jurisdiction:** Original civil and criminal jurisdiction
- **Presiding Officer:** District Judge (civil), Sessions Judge (criminal)
- **IK Coverage:** Limited; primarily higher court decisions are indexed

#### Tribunals & Specialized Courts

| Tribunal | Abbreviation | Jurisdiction |
|----------|-------------|-------------|
| National Company Law Tribunal | NCLT | Company law, insolvency |
| National Green Tribunal | NGT | Environmental matters |
| Debt Recovery Tribunal | DRT | Bank debt recovery |
| Income Tax Appellate Tribunal | ITAT | Tax disputes |
| Securities Appellate Tribunal | SAT | SEBI orders |
| Armed Forces Tribunal | AFT | Military service matters |
| National Consumer Disputes Redressal Commission | NCDRC | Consumer disputes |
| Central Administrative Tribunal | CAT | Government service disputes |

---

## 4. Data Fields from Indian Kanoon API

### Search Result Fields

Each search result from the IK API contains:

```typescript
interface IKSearchResult {
  /** Unique document identifier */
  tid: number;

  /** Document title (usually case name) */
  title: string;

  /** Brief headline / summary */
  headline: string;

  /** Name of the court */
  docsource: string;

  /** Date of judgment (ISO string or Indian date format) */
  publishdate: string;

  /** Number of citations this case has received */
  numcites: number;

  /** Number of documents that cite this case */
  numcitedby: number;

  /** Author / Bench composition */
  author: string;

  /** Full URL to the document on indiankanoon.org */
  url: string;
}
```

### Document Detail Fields

When fetching the full document:

```typescript
interface IKDocumentDetail {
  /** Unique document identifier */
  tid: number;

  /** Full title */
  title: string;

  /** Full text of the judgment (HTML) */
  doc: string;

  /** Court / source name */
  docsource: string;

  /** Bench / author */
  author: string;

  /** Date of judgment */
  publishdate: string;

  /** Array of document IDs that this case cites */
  cites: number[];

  /** Array of document IDs that cite this case */
  citedby: number[];

  /** Catena information */
  catena: string[];
}
```

### Data Mapping to BRAHMO Types

| IK Field | BRAHMO Field (`IKCaseResult`) | Notes |
|----------|-------------------------------|-------|
| `tid` | `doc_id` | Converted to string |
| `title` | `title` | Cleaned, HTML stripped |
| `headline` | `headline` | Cleaned, HTML stripped |
| `docsource` | `court` | Normalized to standard court names |
| `publishdate` | `date` | Parsed to ISO date string |
| — | `citation` | Extracted from title or constructed |
| `headline` | `snippet` | First 500 chars, HTML stripped |
| — | `url` | Constructed: `https://indiankanoon.org/doc/{tid}/` |

---

## 5. Caching Strategy

### Why Cache?

1. **Rate limits:** IK API has request limits that must be respected
2. **Latency:** Avoid redundant API calls for identical queries
3. **Cost:** Reduce external API usage
4. **Reliability:** Serve results even when IK API is down (stale cache)

### Cache Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Query comes │────▶│ Compute     │────▶│  Check       │
│  in          │     │ query_hash  │     │  ik_case_cache│
└──────────────┘     │ (SHA-256)   │     └──────┬───────┘
                     └─────────────┘            │
                                         ┌──────┴──────┐
                                    Hit? │             │ Miss?
                                         ▼             ▼
                                  ┌───────────┐  ┌──────────┐
                                  │ Return    │  │ Call IK   │
                                  │ cached    │  │ API       │
                                  │ results   │  └────┬─────┘
                                  └───────────┘       │
                                                ┌─────▼─────┐
                                                │ Store in  │
                                                │ cache     │
                                                └───────────┘
```

### Cache Table: `ik_case_cache`

| Column | Purpose |
|--------|---------|
| `query_hash` | SHA-256 hash of normalized query (unique index) |
| `query_text` | Original query for debugging |
| `results` | JSONB array of `IKCaseResult` objects |
| `result_count` | Number of results (for quick filtering) |
| `fetched_at` | When results were fetched from IK |
| `expires_at` | Cache expiration (default: 7 days after fetch) |

### Cache Logic (Pseudocode)

```typescript
async function searchCaseLaw(query: string): Promise<IKCaseResult[]> {
  // 1. Normalize and hash the query
  const normalized = normalizeQuery(query);
  const hash = sha256(normalized);

  // 2. Check cache
  const cached = await supabase
    .from('ik_case_cache')
    .select('*')
    .eq('query_hash', hash)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (cached.data) {
    return cached.data.results;
  }

  // 3. Cache miss — call IK API
  const results = await ikClient.search(query);

  // 4. Store in cache
  await supabase.from('ik_case_cache').upsert({
    query_hash: hash,
    query_text: query,
    results: results,
    result_count: results.length,
    fetched_at: new Date().toISOString(),
    expires_at: addDays(new Date(), 7).toISOString(),
  });

  return results;
}
```

### Query Normalization

Before hashing, queries are normalized to improve cache hit rates:

1. Convert to lowercase
2. Remove extra whitespace
3. Remove punctuation (except legal-specific: §, /)
4. Sort keywords alphabetically
5. Remove common stop words

**Example:**

```
Input:   "Anticipatory Bail under Section 438   CrPC"
Normalized: "438 anticipatory bail crpc section"
Hash:    "a3f2b8c1..."
```

### Cache Eviction

- **TTL-based:** Records expire after 7 days (`expires_at` column)
- **Manual purge:** Admin can delete cached entries via Supabase dashboard
- **On-demand refresh:** API supports `?force_refresh=true` to bypass cache
- **Stale-while-revalidate:** If cache is expired but IK API is down, serve stale data with a warning

---

## 6. IPC → BNS Section Mapping

### Background

On **July 1, 2024**, three new criminal laws replaced colonial-era legislation:

| Old Law | New Law | Abbreviation |
|---------|---------|-------------|
| Indian Penal Code, 1860 (IPC) | Bharatiya Nyaya Sanhita, 2023 (BNS) | BNS |
| Code of Criminal Procedure, 1973 (CrPC) | Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) | BNSS |
| Indian Evidence Act, 1872 (IEA) | Bharatiya Sakshya Adhiniyam, 2023 (BSA) | BSA |

### Mapping Approach

#### Database-Driven

All mappings are stored in the `section_mappings` table:

```sql
SELECT * FROM section_mappings
WHERE old_code = 'IPC' AND old_section = '302';

-- Returns: new_code = 'BNS', new_section = '103'
--          description = 'Murder'
```

#### Bidirectional Lookup

```typescript
// IPC → BNS
const bnsSection = await mapSection('IPC', '302'); // Returns '103'

// BNS → IPC (reverse lookup)
const ipcSection = await reverseMapSection('BNS', '103'); // Returns '302'
```

#### Inline Normalization

When generating documents, BRAHMO automatically annotates section references:

```
Input:  "The accused is charged under Section 302 of IPC"
Output: "The accused is charged under Section 302 of IPC
         (corresponding to Section 103 of Bharatiya Nyaya Sanhita, 2023)"
```

### Key Mappings Reference

| IPC Section | BNS Section | Offence |
|-------------|-------------|---------|
| 302 | 103 | Murder |
| 304 | 105 | Culpable homicide not amounting to murder |
| 307 | 109 | Attempt to murder |
| 354 | 74 | Assault or criminal force to woman |
| 376 | 64 | Rape |
| 406 | 381 | Criminal breach of trust |
| 420 | 316 | Cheating and dishonestly inducing delivery of property |
| 467 | 336 | Forgery of valuable security |
| 498A | 84 | Cruelty by husband or relatives of husband |
| 506 | 351 | Criminal intimidation |

### Edge Cases

1. **Sections without direct mapping:** Some IPC sections were merged, split, or repealed in BNS. The `notes` field captures these nuances.
2. **Sub-sections:** Mappings support sub-section granularity (e.g., `376(2)` → `64(2)`).
3. **New offences in BNS:** Sections in BNS with no IPC equivalent are flagged as `old_code = 'NONE'`.
4. **Transition period:** Cases filed before July 1, 2024 continue under IPC; BRAHMO tracks this context.

### Data Integrity

- All mappings are reviewed by legal professionals before activation
- The `is_active` flag allows disabling incorrect mappings without deletion
- `notes` field captures judicial interpretations and exceptions
- Mappings can be version-controlled via the `created_at` timestamp

---

*This document should be updated as the Indian Kanoon API evolves and new section mappings are identified.*
