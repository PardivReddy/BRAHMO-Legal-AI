/**
 * Builds concise Indian Kanoon search queries from user matter text.
 * Avoids sending full drafting instructions as the scrape query.
 */

import type { QueryClassification } from '@/types/legal';
import { normalizeIndianKanoonQuery } from '@/lib/indiankanoon';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'to', 'of', 'in', 'on', 'at', 'by',
  'with', 'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
  'shall', 'can', 'need', 'draft', 'prepare', 'write', 'create', 'generate', 'application',
  'applications', 'under', 'section', 'where', 'when', 'that', 'this', 'these', 'those',
  'already', 'apprehended', 'documents', 'director', 'accused', 'matter', 'please',
]);

const LEGAL_TERM_PATTERN =
  /\b(?:section|article|rule)\s*\d+[a-z0-9]*/gi;

export function buildIkSearchQueryVariants(
  userQuery: string,
  classification: QueryClassification,
  templateMetadata?: Record<string, unknown> | null
): string[] {
  const variants = new Set<string>();

  const focused = extractFocusedLegalTerms(userQuery, classification);
  if (focused) {
    variants.add(normalizeIndianKanoonQuery(focused));
  }

  const docTypePhrase = classification.document_type.replace(/_/g, ' ');
  if (docTypePhrase && docTypePhrase !== 'general query') {
    variants.add(normalizeIndianKanoonQuery(docTypePhrase));
  }

  addClassificationFallbacks(variants, classification);

  if (templateMetadata && typeof templateMetadata.auto_research === 'string') {
    variants.add(normalizeIndianKanoonQuery(templateMetadata.auto_research));
  }

  return Array.from(variants)
    .map((q) => q.trim())
    .filter((q) => q.length >= 8)
    .slice(0, 4);
}

function extractFocusedLegalTerms(
  userQuery: string,
  classification: QueryClassification
): string {
  const terms = new Set<string>();

  for (const keyword of classification.matched_keywords) {
    const normalized = keyword.trim().toLowerCase();
    if (normalized.length > 2) terms.add(normalized);
  }

  const sectionMatches = userQuery.match(LEGAL_TERM_PATTERN) ?? [];
  for (const match of sectionMatches) {
    terms.add(match.toLowerCase().replace(/\s+/g, ' '));
  }

  const words = userQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));

  for (const word of words) {
    if (terms.size >= 12) break;
    terms.add(word);
  }

  return Array.from(terms).join(' ');
}

function addClassificationFallbacks(
  variants: Set<string>,
  classification: QueryClassification
): void {
  const { document_type: docType, practice_area: area } = classification;

  if (docType === 'anticipatory_bail' || area === 'criminal') {
    variants.add('anticipatory bail economic offence');
    variants.add('anticipatory bail custodial interrogation');
    variants.add('anticipatory bail director documents seized');
  }

  if (docType === 'nda_review') {
    variants.add('confidentiality agreement injunction');
  }

  if (docType === 'arbitration_clause') {
    variants.add('arbitration agreement seat India');
  }

  if (docType === 'board_resolution') {
    variants.add('companies act board resolution validity');
  }

  if (docType === 'compliance_notice') {
    variants.add('statutory show cause notice corporate');
  }

  if (docType === 'shareholder_dispute_notice') {
    variants.add('oppression mismanagement shareholders company law');
  }
}
