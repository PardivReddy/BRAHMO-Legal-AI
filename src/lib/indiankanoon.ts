/**
 * @module lib/indiankanoon
 * @description Indian Kanoon research for BRAHMO Legal AI.
 * Live HTML search (cheerio) for Level 3 precedents, plus optional REST API helpers.
 */

import * as cheerio from 'cheerio';
import type { Cheerio, CheerioAPI } from 'cheerio';
import type { AnyNode } from 'domhandler';
import type { IKCase, IKCaseResult } from '@/types/legal';
import { supabase } from '@/lib/supabase';

export type { IKCase };

export interface IndianKanoonSearchResponse {
  results: IKCase[];
  fromCache: boolean;
  query: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const IK_BASE_URL = 'https://api.indiankanoon.org';
const IK_API_KEY = process.env.INDIAN_KANOON_API_KEY;

/** How long cached results remain valid (in hours) */
const CACHE_TTL_HOURS = 72;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 15_000;

/** Live HTML search — result cap */
const HTML_MAX_RESULTS = 5;

/** Live HTML search — snippet length cap */
const HTML_SNIPPET_MAX_LENGTH = 420;

const IK_PUBLIC_BASE_URL = 'https://indiankanoon.org';

/** Normalize user query for Indian Kanoon search relevance */
export function normalizeIndianKanoonQuery(query: string): string {
  const trimmed = query.trim().replace(/\s+/g, ' ');
  const lower = trimmed.toLowerCase();

  const focusTerms: string[] = [];

  if (/\b(anticipatory|438)\b/.test(lower)) focusTerms.push('anticipatory bail');
  if (/\b(bail|439)\b/.test(lower)) focusTerms.push('bail');
  if (/\b(economic|pmla|money laundering|cheating)\b/.test(lower)) focusTerms.push('economic offence bail');
  if (/\b(custodial|interrogat|arrest)\b/.test(lower)) focusTerms.push('custodial interrogation');
  if (/\b(supreme court|sc)\b/.test(lower)) focusTerms.push('Supreme Court');

  if (focusTerms.length > 0) {
    return focusTerms.join(' ').slice(0, 120);
  }

  const keywords = trimmed
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 10)
    .join(' ');

  return keywords.slice(0, 120);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build standard headers for Indian Kanoon API requests.
 */
function buildHeaders(): HeadersInit {
  if (!IK_API_KEY) {
    throw new Error(
      '[BRAHMO IndianKanoon] Missing INDIAN_KANOON_API_KEY environment variable. ' +
        'Set it in .env.local to your Indian Kanoon API token.'
    );
  }
  return {
    Authorization: `Token ${IK_API_KEY}`,
    Accept: 'application/json',
  };
}

/**
 * Compute a simple hash of a string for cache-key purposes.
 * Uses a 53-bit hash that is deterministic and fast.
 */
function hashQuery(query: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < query.length; i++) {
    const ch = query.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * Perform a fetch with timeout via AbortController.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Layer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check the Supabase ik_case_cache table for a valid cached result.
 */
async function getCachedPayload<T>(queryHash: string): Promise<T[] | null> {
  try {
    const { data, error } = await supabase
      .from('ik_case_cache')
      .select('results, expires_at')
      .eq('query_hash', queryHash)
      .limit(1)
      .single();

    if (error || !data) return null;

    const row = data as unknown as { results: unknown; expires_at: string };

    if (new Date(row.expires_at) < new Date()) {
      return null;
    }

    const results = row.results;
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    return results as T[];
  } catch {
    return null;
  }
}

async function setCachedPayload<T>(
  queryHash: string,
  query: string,
  results: T[]
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  try {
    await supabase.from('ik_case_cache').upsert(
      {
        query_hash: queryHash,
        query,
        results: results as unknown as Record<string, unknown>,
        expires_at: expiresAt,
      },
      { onConflict: 'query_hash' }
    );
  } catch (err) {
    console.warn('[BRAHMO IndianKanoon] Failed to cache results:', err);
  }
}

async function getCachedResults(queryHash: string): Promise<IKCaseResult[] | null> {
  return getCachedPayload<IKCaseResult>(queryHash);
}

async function setCachedResults(
  queryHash: string,
  query: string,
  results: IKCaseResult[]
): Promise<void> {
  await setCachedPayload(queryHash, query, results);
}

// ─────────────────────────────────────────────────────────────────────────────
// Response Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise raw Indian Kanoon search result docs into typed IKCaseResult[].
 */
function parseSearchResults(rawDocs: Record<string, unknown>[]): IKCaseResult[] {
  return rawDocs.map((doc) => ({
    doc_id: String(doc.tid ?? doc.docid ?? ''),
    title: String(doc.title ?? ''),
    headline: String(doc.headline ?? ''),
    doc_author: String(doc.author ?? doc.doc_author ?? ''),
    court: String(doc.docsource ?? doc.court ?? ''),
    date: String(doc.publishdate ?? doc.date ?? ''),
    citation: String(doc.citation ?? ''),
    snippet: stripHtml(String(doc.headline ?? doc.snippet ?? '')),
    url: `https://indiankanoon.org/doc/${doc.tid ?? doc.docid ?? ''}`,
  }));
}

/**
 * Naive HTML tag stripper for snippets returned by IK.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search Indian Kanoon for cases matching a query.
 * Results are cached in Supabase ik_case_cache for {@link CACHE_TTL_HOURS} hours.
 *
 * @param query   - Search query string
 * @param pagenum - Page number for pagination (default: 0)
 * @returns Array of {@link IKCaseResult}
 *
 * @example
 * ```ts
 * const cases = await searchCases('anticipatory bail Supreme Court');
 * ```
 */
export async function searchCases(
  query: string,
  pagenum: number = 0
): Promise<IKCaseResult[]> {
  if (!query.trim()) {
    throw new Error('[BRAHMO IndianKanoon] Search query cannot be empty.');
  }

  const cacheKey = hashQuery(`search:${query}:${pagenum}`);

  // Check cache first
  const cached = await getCachedResults(cacheKey);
  if (cached) {
    return cached;
  }

  // Call Indian Kanoon API
  const url = `${IK_BASE_URL}/search/?formInput=${encodeURIComponent(query)}&pagenum=${pagenum}`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `[BRAHMO IndianKanoon] Search request failed with status ${response.status}: ${response.statusText}`
    );
  }

  const body = (await response.json()) as Record<string, unknown>;
  const docs = (body.docs ?? []) as Record<string, unknown>[];
  const results = parseSearchResults(docs);

  // Cache for future requests
  await setCachedResults(cacheKey, query, results);

  return results;
}

/**
 * Retrieve the full text of a case document by its ID.
 *
 * @param docId - The Indian Kanoon document ID
 * @returns The full case document as an {@link IKCaseResult}
 */
export async function getCaseDocument(docId: string): Promise<IKCaseResult> {
  if (!docId.trim()) {
    throw new Error('[BRAHMO IndianKanoon] Document ID cannot be empty.');
  }

  const url = `${IK_BASE_URL}/doc/${encodeURIComponent(docId)}/`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `[BRAHMO IndianKanoon] Document request failed with status ${response.status}: ${response.statusText}`
    );
  }

  const body = (await response.json()) as Record<string, unknown>;

  return {
    doc_id: docId,
    title: String(body.title ?? ''),
    headline: String(body.headline ?? ''),
    doc_author: String(body.author ?? body.doc_author ?? ''),
    court: String(body.docsource ?? ''),
    date: String(body.publishdate ?? ''),
    citation: String(body.citation ?? ''),
    snippet: stripHtml(String(body.doc ?? body.headline ?? '')).slice(0, 500),
    url: `https://indiankanoon.org/doc/${docId}`,
  };
}

/**
 * Fetch cases related to a given document.
 *
 * @param docId - The Indian Kanoon document ID to find related cases for
 * @returns Array of related {@link IKCaseResult}
 */
export async function getRelatedCases(docId: string): Promise<IKCaseResult[]> {
  if (!docId.trim()) {
    throw new Error('[BRAHMO IndianKanoon] Document ID cannot be empty.');
  }

  const cacheKey = hashQuery(`related:${docId}`);

  const cached = await getCachedResults(cacheKey);
  if (cached) {
    return cached;
  }

  const url = `${IK_BASE_URL}/docfragment/${encodeURIComponent(docId)}/?type=rel`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(
      `[BRAHMO IndianKanoon] Related-cases request failed with status ${response.status}: ${response.statusText}`
    );
  }

  const body = (await response.json()) as Record<string, unknown>;
  const docs = (body.docs ?? []) as Record<string, unknown>[];
  const results = parseSearchResults(docs);

  await setCachedResults(cacheKey, `related:${docId}`, results);

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Live HTML Search (Level 3 precedents)
// ─────────────────────────────────────────────────────────────────────────────

function buildIndianKanoonSearchUrl(query: string): string {
  const normalized = normalizeIndianKanoonQuery(query);
  return `${IK_PUBLIC_BASE_URL}/search/?formInput=${encodeURIComponent(normalized).replace(/%20/g, '+')}`;
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

function truncateSnippet(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');
  const safeCut = lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated;

  return `${safeCut}...`;
}

function toAbsoluteIndianKanoonUrl(href: string): string {
  try {
    return new URL(href, IK_PUBLIC_BASE_URL).toString();
  } catch {
    return href;
  }
}

function extractDocIdFromUrl(url: string): string {
  const match = url.match(/\/doc\/(\d+)/);
  return match?.[1] ?? '';
}

function removeLeadingTitle(text: string, title: string): string {
  if (!title) {
    return text;
  }

  return normalizeWhitespace(text.replace(title, ''));
}

function findCourtLikeText(text: string): string | null {
  const courtPatterns = [
    /\bSupreme Court of India\b/i,
    /\bSupreme Court\b/i,
    /\b[A-Z][A-Za-z ]+ High Court\b/,
    /\bHigh Court of [A-Z][A-Za-z ]+\b/,
    /\bDelhi High Court\b/i,
    /\bBombay High Court\b/i,
    /\bMadras High Court\b/i,
    /\bCalcutta High Court\b/i,
    /\bKarnataka High Court\b/i,
    /\bKerala High Court\b/i,
    /\bGujarat High Court\b/i,
    /\bAllahabad High Court\b/i,
    /\bPunjab-Haryana High Court\b/i,
    /\bPatna High Court\b/i,
    /\bRajasthan High Court\b/i,
  ];

  for (const pattern of courtPatterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      return normalizeWhitespace(match[0]);
    }
  }

  const judgeMatch = text.match(/\b(?:Justice|Hon'?ble|Judge)\s+[A-Z][A-Za-z .'-]+/i);
  return judgeMatch?.[0] ? normalizeWhitespace(judgeMatch[0]) : null;
}

function extractHtmlResultContainers($: CheerioAPI): Cheerio<AnyNode>[] {
  const containers: Cheerio<AnyNode>[] = [];

  $('.result, .resultbox, .search-result, div[id^="result"]').each((_index, element) => {
    const container = $(element);
    if (container.find('a[href^="/doc/"]').length > 0) {
      containers.push(container);
    }
  });

  if (containers.length > 0) {
    return containers;
  }

  $('a[href^="/doc/"]').each((_index, element) => {
    const anchor = $(element);
    const parent = anchor.closest('div');

    if (parent.length > 0) {
      containers.push(parent);
    }
  });

  return containers;
}

function extractHtmlSnippet($: CheerioAPI, container: Cheerio<AnyNode>, title: string): string {
  const preferredSelectors = [
    '.headline',
    '.snippet',
    '.result-snippet',
    '.docsource_main',
    '.judgments',
  ];

  for (const selector of preferredSelectors) {
    const text = normalizeWhitespace(container.find(selector).first().text());
    if (text && text !== title) {
      return truncateSnippet(removeLeadingTitle(text, title), HTML_SNIPPET_MAX_LENGTH);
    }
  }

  const clone = cheerio.load(container.html() ?? '').root();
  clone.find('script, style, a[href^="/doc/"]').remove();
  const fallback = removeLeadingTitle(normalizeWhitespace(clone.text()), title);

  return truncateSnippet(fallback, HTML_SNIPPET_MAX_LENGTH);
}

function extractHtmlCourt($: CheerioAPI, container: Cheerio<AnyNode>): string | null {
  const explicitSelectors = [
    '.docsource',
    '.court',
    '.result-court',
    '.docsource_main',
    '[class*="court"]',
    '[class*="source"]',
  ];

  for (const selector of explicitSelectors) {
    const text = normalizeWhitespace(container.find(selector).first().text());
    const court = findCourtLikeText(text);
    if (court) {
      return court;
    }
  }

  return findCourtLikeText(normalizeWhitespace(container.text()));
}

const GENERIC_TITLE_PATTERN =
  /^(?:full\s*document|judgment|order|document|doc|untitled|read\s*more|view\s*doc|click\s*here)$/i;

function isGenericCaseTitle(title: string): boolean {
  return GENERIC_TITLE_PATTERN.test(title.trim());
}

function extractTitleFromSnippet(snippet: string): string | null {
  const vsMatch = snippet.match(
    /([A-Z][A-Za-z0-9.'\s-]{2,60}\s+(?:vs?\.?|versus)\s+[A-Z][A-Za-z0-9.'\s-]{2,60})/
  );
  if (vsMatch?.[1]) {
    return normalizeWhitespace(vsMatch[1]);
  }

  const partyMatch = snippet.match(/\b(?:Petitioner|Appellant|Applicant):\s*([^,\n]{4,80})/i);
  if (partyMatch?.[1]) {
    return normalizeWhitespace(partyMatch[1]);
  }

  return null;
}

function resolveCaseTitle(
  $: CheerioAPI,
  container: Cheerio<AnyNode>,
  anchor: Cheerio<AnyNode>,
  snippet: string
): string | null {
  const anchorText = normalizeWhitespace(anchor.text());
  const altSelectors = ['.htitle', '.doc_title', '.result_title', 'h2 a', 'h3 a'];

  const candidates: string[] = [];

  if (anchorText) candidates.push(anchorText);
  for (const selector of altSelectors) {
    const text = normalizeWhitespace(container.find(selector).first().text());
    if (text) candidates.push(text);
  }

  const fromSnippet = extractTitleFromSnippet(snippet);
  if (fromSnippet) candidates.push(fromSnippet);

  for (const candidate of candidates) {
    if (!candidate || candidate.length < 6) continue;
    if (!isGenericCaseTitle(candidate)) {
      return candidate;
    }
  }

  return null;
}

function scoreCaseRelevance(item: IKCase, queryTerms: string[]): number {
  const haystack = `${item.title} ${item.snippet} ${item.court ?? ''}`.toLowerCase();
  let score = 0;

  for (const term of queryTerms) {
    if (haystack.includes(term)) score += 1;
  }

  if (/\bvs?\.?\b|\bversus\b/i.test(item.title)) score += 2;
  if (/\b(supreme court|high court)\b/i.test(haystack)) score += 1;
  if (isGenericCaseTitle(item.title)) score -= 5;

  return score;
}

function rankAndFilterIkCases(cases: IKCase[], query: string): IKCase[] {
  const terms = normalizeIndianKanoonQuery(query)
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 3);

  const deduped: IKCase[] = [];
  const seenTitles = new Set<string>();

  for (const item of cases) {
    const key = item.title.toLowerCase();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    deduped.push(item);
  }

  return deduped
    .sort((a, b) => scoreCaseRelevance(b, terms) - scoreCaseRelevance(a, terms))
    .slice(0, HTML_MAX_RESULTS);
}

function parseHtmlResultContainer(
  $: CheerioAPI,
  container: Cheerio<AnyNode>
): IKCase | null {
  const anchor = container.find('a[href^="/doc/"]').first();
  const href = anchor.attr('href');

  if (!href) {
    return null;
  }

  const url = toAbsoluteIndianKanoonUrl(href);
  const court = extractHtmlCourt($, container);
  const provisionalTitle = normalizeWhitespace(anchor.text());
  const snippet = extractHtmlSnippet($, container, provisionalTitle);
  const title = resolveCaseTitle($, container, anchor, snippet);

  if (!title || !url || isGenericCaseTitle(title)) {
    return null;
  }

  const cleanSnippet =
    snippet && !isGenericCaseTitle(snippet) ? snippet : snippet.replace(/^full document/i, '').trim();

  return {
    title,
    url,
    snippet: cleanSnippet || snippet,
    court,
  };
}

function parseIndianKanoonSearchHtml(html: string, query: string): IKCase[] {
  const $ = cheerio.load(html);
  const candidates = extractHtmlResultContainers($);
  const results: IKCase[] = [];
  const seenUrls = new Set<string>();

  for (const candidate of candidates) {
    const result = parseHtmlResultContainer($, candidate);

    if (!result || seenUrls.has(result.url)) {
      continue;
    }

    seenUrls.add(result.url);
    results.push(result);
  }

  return rankAndFilterIkCases(results, query);
}

async function fetchIndianKanoonSearchHtml(query: string): Promise<string> {
  const url = buildIndianKanoonSearchUrl(query);

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; BRAHMO-Legal-AI/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store',
  });

  const html = await response.text();

  if (!response.ok) {
    throw new Error(
      `[BRAHMO IndianKanoon] HTML search failed with status ${response.status}: ${response.statusText}`
    );
  }

  return html;
}

/**
 * Search Indian Kanoon via live HTML scraping (used for Level 3 precedent injection).
 * Results are cached in Supabase `ik_case_cache` for {@link CACHE_TTL_HOURS} hours.
 */
export interface IndianKanoonRetrySearchResponse extends IndianKanoonSearchResponse {
  attemptedQueries: string[];
}

/**
 * Try multiple concise query variants until results are returned.
 */
export async function searchIndianKanoonWithRetry(
  queries: string[]
): Promise<IndianKanoonRetrySearchResponse> {
  const attemptedQueries: string[] = [];
  let last: IndianKanoonSearchResponse = {
    results: [],
    fromCache: false,
    query: queries[0] ?? '',
  };

  for (const query of queries) {
    const trimmed = query.trim();
    if (!trimmed || attemptedQueries.includes(trimmed)) continue;

    attemptedQueries.push(trimmed);

    try {
      const result = await searchIndianKanoon(trimmed);
      last = result;
      if (result.results.length > 0) {
        return { ...result, attemptedQueries };
      }
    } catch {
      continue;
    }
  }

  return { ...last, attemptedQueries };
}

export async function searchIndianKanoon(query: string): Promise<IndianKanoonSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('[BRAHMO IndianKanoon] Search query cannot be empty.');
  }

  const normalizedQuery = normalizeIndianKanoonQuery(trimmed);
  const cacheKey = hashQuery(`html:${normalizedQuery}`);
  const cached = await getCachedPayload<IKCase>(cacheKey);

  if (cached) {
    return {
      results: rankAndFilterIkCases(cached, normalizedQuery),
      fromCache: true,
      query: normalizedQuery,
    };
  }

  const html = await fetchIndianKanoonSearchHtml(normalizedQuery);
  const results = parseIndianKanoonSearchHtml(html, normalizedQuery);

  if (results.length > 0) {
    await setCachedPayload(cacheKey, normalizedQuery, results);
  }

  return {
    results,
    fromCache: false,
    query: normalizedQuery,
  };
}

/** Map live scrape results to legacy {@link IKCaseResult} for prompts and UI. */
export function ikCasesToResults(cases: IKCase[]): IKCaseResult[] {
  return cases.map((item) => ({
    doc_id: extractDocIdFromUrl(item.url),
    title: item.title,
    headline: item.snippet,
    doc_author: '',
    court: item.court ?? '',
    date: '',
    citation: '',
    snippet: item.snippet,
    url: item.url,
  }));
}
