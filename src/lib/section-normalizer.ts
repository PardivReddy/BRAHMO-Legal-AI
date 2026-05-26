/**
 * section-normalizer.ts
 * Map legacy statutory codes/sections (e.g., IPC, CrPC) to normalized codes (BNS/BNSS)
 * using the `section_mappings` table in Supabase.
 */
import { supabase } from '@/lib/supabase';
import type { SectionMapping } from '@/types/legal';

/**
 * Normalize a single section reference using the DB mappings.
 * Returns the mapping if found, otherwise returns the input as fallback.
 */
export async function normalizeSection(oldCode: string, oldSection: string): Promise<{ new_code: string; new_section: string; description?: string | null } > {
  const code = (oldCode || '').trim();
  const section = (oldSection || '').trim();

  if (!code || !section) {
    return { new_code: code, new_section: section, description: null };
  }

  const { data, error } = await supabase
    .from('section_mappings')
    .select('*')
    .eq('old_code', code)
    .eq('old_section', section)
    .limit(1)
    .single();

  if (error || !data) {
    // try looser match: numeric part
    const numeric = section.replace(/[^0-9]/g, '');
    if (numeric) {
      const { data: loose } = await supabase
        .from('section_mappings')
        .select('*')
        .eq('old_code', code)
        .like('old_section', numeric || '')
        .limit(1);

      if (loose && loose.length > 0) {
        const row = loose[0] as SectionMapping;
        return { new_code: row.new_code, new_section: row.new_section, description: row.description };
      }
    }

    // fallback: return as-is
    return { new_code: code, new_section: section, description: null };
  }

  const row = data as SectionMapping;
  return { new_code: row.new_code, new_section: row.new_section, description: row.description };
}

export interface NormalizedSectionReference {
  original: string;
  normalized: string;
  new_code: string;
  new_section: string;
  description?: string | null;
}

export interface SectionNormalizationResult {
  text: string;
  references: NormalizedSectionReference[];
}

type SectionLookupResult = Awaited<ReturnType<typeof normalizeSection>>;

const SECTION_REFERENCE_PATTERN =
  /\b(?:section|sec\.?)\s+([0-9A-Za-z()/-]+)\s+(IPC|CrPC)\b/gi;

/**
 * Normalize old criminal-law section references found inside generated text.
 */
export async function normalizeSectionsInText(
  content: string
): Promise<SectionNormalizationResult> {
  if (!content.trim()) {
    return { text: content, references: [] };
  }

  const matches = Array.from(content.matchAll(SECTION_REFERENCE_PATTERN));

  if (matches.length === 0) {
    return { text: content, references: [] };
  }

  const uniqueLookups = new Map<string, Promise<SectionLookupResult>>();

  for (const match of matches) {
    const section = match[1];
    const code = match[2];
    const key = `${code}:${section}`;

    if (!uniqueLookups.has(key)) {
      uniqueLookups.set(key, normalizeSection(code, section));
    }
  }

  const resolvedLookups = new Map<string, SectionLookupResult>();

  await Promise.all(
    Array.from(uniqueLookups.entries()).map(async ([key, lookup]) => {
      resolvedLookups.set(key, await lookup);
    })
  );

  const references: NormalizedSectionReference[] = [];
  const text = content.replace(
    SECTION_REFERENCE_PATTERN,
    (original: string, section: string, code: string) => {
      const mapped = resolvedLookups.get(`${code}:${section}`);

      if (!mapped || (mapped.new_code === code && mapped.new_section === section)) {
        return original;
      }

      const normalized = `Section ${mapped.new_section} ${mapped.new_code}`;

      references.push({
        original,
        normalized,
        new_code: mapped.new_code,
        new_section: mapped.new_section,
        description: mapped.description,
      });

      return `${normalized} (formerly ${original})`;
    }
  );

  return { text, references };
}

export default normalizeSection;
