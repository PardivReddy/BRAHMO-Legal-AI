/**
 * Lightweight entity extraction for template placeholder replacement.
 * Uses regex, keywords, and heuristics to extract common legal entities.
 */

interface ExtractedEntities {
  [key: string]: string | undefined;
  client_name?: string;
  company_name?: string;
  counterparty?: string;
  fir_ecir_number?: string;
  company?: string;
  parties?: string;
  facts?: string;
  reliefs?: string;
  issues?: string;
  resolution?: string;
}

/**
 * Extract probable client/party name from query string.
 * Priority: quoted strings > capitalized words > first mentioned entity
 */
export function extractClientName(query: string): string | undefined {
  // Try quoted name first
  const quoted = query.match(/"([^"]+)"/);
  if (quoted?.[1]) {
    return quoted[1];
  }

  // Common patterns: "Mr./Ms./Dr./Advocate {Name}"
  const titleMatch = query.match(
    /(?:Mr\.|Ms\.|Mrs\.|Dr\.|Advocate|Counselor)\s+([A-Z][a-zA-Z\s]+)/
  );
  if (titleMatch?.[1]) {
    return titleMatch[1].trim();
  }

  // Single capital phrase with optional surname
  const capMatch = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (capMatch?.[1] && capMatch[1].length > 2) {
    return capMatch[1];
  }

  return undefined;
}

/**
 * Extract company/counterparty name from query.
 * Looks for: "Ltd", "LLC", "Inc", "Corp", or quoted corporate names.
 */
export function extractCompanyName(query: string): string | undefined {
  // Corporate entity pattern
  const corpMatch = query.match(
    /([A-Z][a-zA-Z\s&]+(?:Ltd|LLC|Inc|Corp|Company|Pvt|Limited|Incorporated)\.?)/
  );
  if (corpMatch?.[1]) {
    return corpMatch[1].trim();
  }

  // Quoted name (corporate context)
  const quoted = query.match(/"([^"]+(?:Ltd|LLC|Inc|Corp|Company|Pvt|Limited)[^"]*)"/);
  if (quoted?.[1]) {
    return quoted[1];
  }

  return undefined;
}

/**
 * Extract FIR/ECIR number pattern from query.
 * Looks for: "FIR No. 1234/2024", "ECIR 5678", etc.
 */
export function extractFIRNumber(query: string): string | undefined {
  const firMatch = query.match(
    /(?:FIR\s*(?:No\.?)?|ECIR|Case\s*No\.?|Crime\s*No\.?)\s*([0-9/\-A-Z]+)/i
  );
  return firMatch?.[1]?.trim();
}

/**
 * Extract primary facts section from query (first sentence or context).
 */
export function extractFactsContext(query: string): string | undefined {
  const sentences = query.split(/[.!?]+/);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    if (firstSentence.length > 20) {
      return firstSentence;
    }
  }
  return undefined;
}

/**
 * Extract issue/relief keywords from query.
 */
export function extractIssuesKeywords(query: string): string | undefined {
  const keywords = [];

  // Relief/relief-seeking keywords
  if (/bail|custody|release|interim|injunction|stay/i.test(query)) {
    keywords.push('bail or custody relief');
  }
  if (/confidentiality|nda|disclosure/i.test(query)) {
    keywords.push('confidentiality protection');
  }
  if (/oppression|mismanagement|valuation/i.test(query)) {
    keywords.push('shareholder rights');
  }

  return keywords.length > 0 ? keywords.join('; ') : undefined;
}

/**
 * Apply extracted entities to replace template placeholders.
 * Gracefully falls back to <<placeholder>> if not extracted.
 */
export function replaceTemplatePlaceholders(
  template: string,
  query: string,
  variables?: Record<string, string | undefined>
): string {
  const extracted = extractEntitiesFromQuery(query);
  const combined = { ...extracted, ...variables };

  return template.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_, key: string) => {
    const value = combined[key.toLowerCase()];
    if (value) return value;
    return `<<${key}>>`;
  });
}

/**
 * Main extraction function combining all heuristics.
 */
export function extractEntitiesFromQuery(query: string): ExtractedEntities {
  return {
    client_name: extractClientName(query),
    company_name: extractCompanyName(query),
    counterparty: extractCompanyName(query) || extractClientName(query),
    fir_ecir_number: extractFIRNumber(query),
    company: extractCompanyName(query),
    parties: extractClientName(query),
    facts: extractFactsContext(query),
    reliefs: extractIssuesKeywords(query),
    issues: extractIssuesKeywords(query),
    resolution: undefined,
  };
}

/**
 * Sanitize output to remove any unresolved template placeholders.
 * Safe fallback labels when extraction fails.
 */
export function sanitizeUnresolvedPlaceholders(text: string): string {
  let sanitized = text;

  // Replace unresolved placeholders with safe defaults
  sanitized = sanitized.replace(
    /<<client_name>>/gi,
    'the Client'
  );
  sanitized = sanitized.replace(
    /<<company_name>>/gi,
    'the Company'
  );
  sanitized = sanitized.replace(
    /<<counterparty>>/gi,
    'the other party'
  );
  sanitized = sanitized.replace(
    /<<fir_ecir_number>>/gi,
    '[FIR/Case Number]'
  );
  sanitized = sanitized.replace(
    /<<company>>/gi,
    'the Company'
  );
  sanitized = sanitized.replace(
    /<<parties>>/gi,
    'the parties'
  );
  sanitized = sanitized.replace(
    /<<facts>>/gi,
    '[Relevant Facts]'
  );
  sanitized = sanitized.replace(
    /<<reliefs>>/gi,
    '[Relief Sought]'
  );
  sanitized = sanitized.replace(
    /<<issues>>/gi,
    '[Key Issues]'
  );
  sanitized = sanitized.replace(
    /<<resolution>>/gi,
    '[Resolution Details]'
  );

  return sanitized;
}
