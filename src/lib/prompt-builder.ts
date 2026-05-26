/**
 * Modular prompt builders for the three BRAHMO drafting levels.
 */

import type {
  AIGenerationRequest,
  IKCaseResult,
  InjectedKnowledge,
  LegalTemplate,
} from '@/types/legal';
import { replaceTemplatePlaceholders } from '@/lib/placeholder-extractor';

function applyVariables(
  content: string,
  variables?: Record<string, string | undefined>,
  query?: string
): string {
  if (!variables && !query) {
    return content;
  }

  // Try to extract entities from query and merge with provided variables
  if (query) {
    return replaceTemplatePlaceholders(content, query, variables);
  }

  return content.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, (_, name: string) => {
    return variables?.[name] ?? `<<${name}>>`;
  });
}

export function buildGenericPrompt(
  request: AIGenerationRequest
): { prompt: string; estimateTokens: number } {
  const prompt = [
    'You are a baseline legal drafting assistant (Level 1 — minimal context).',
    `User query: ${request.query}`,
    '',
    `Produce a short, outline-level response for ${request.classification.practice_area} matters only.`,
    'Requirements:',
    '- Maximum length: about 350–550 words.',
    '- Use brief headings only; no full court filing format.',
    '- Do not include extensive case law citations or detailed prayers.',
    '- Mark missing facts with <<placeholder>>.',
    '- This is a generic baseline — intentionally less detailed than template- or research-enriched drafts.',
  ].join('\n');

  return { prompt, estimateTokens: 180 };
}

export function buildTemplatePrompt(
  request: AIGenerationRequest
): { prompt: string; estimateTokens: number } {
  const template = request.template as LegalTemplate | undefined;
  const filledTemplate = template
    ? applyVariables(template.content, request.variables, request.query)
    : `Template not found. Use query: ${request.query}`;

  const prompt = [
    'You are a legal drafting assistant using the template provided.',
    `Query: ${request.query}`,
    '',
    '--- TEMPLATE ---',
    filledTemplate,
    '--- END TEMPLATE ---',
    '',
    'Fill placeholders professionally; respect template structure. Mark missing facts with <<placeholder>>.',
  ].join('\n');

  return { prompt, estimateTokens: 320 };
}

export function buildKnowledgePrompt(
  request: AIGenerationRequest,
  ikResults: IKCaseResult[] = []
): { prompt: string; estimateTokens: number } {
  const template = request.template as LegalTemplate | undefined;
  const filledTemplate = template ? applyVariables(template.content, request.variables, request.query) : '';
  const knowledgeBlock = request.knowledge
    ? buildKnowledgeBlock(request.knowledge)
    : 'No injected knowledge available.';
  const ikBlock = buildIndianKanoonBlock(ikResults);
  const strategicGuidance = buildLevel3StrategicGuidance(request.query, ikResults);

  const practiceGuidance = buildPracticeAreaGuidance(request);

  const prompt = [
    'You are a senior Indian advocate drafting at partner quality for law-firm review.',
    'Write concisely, strategically, and with professional judgment — not verbose generic AI prose.',
    '',
    `User query: ${request.query}`,
    '',
    '--- TEMPLATE ---',
    filledTemplate || buildFallbackTemplateHint(request.classification.practice_area),
    '',
    '--- FIRM KNOWLEDGE ---',
    knowledgeBlock,
    '',
    '--- LIVE INDIAN KANOON PRECEDENTS (retrieved for this query) ---',
    ikBlock,
    '',
    '--- LEVEL 3 DRAFTING INSTRUCTIONS ---',
    practiceGuidance,
    strategicGuidance,
    '',
    'Output requirements:',
    '- Produce a filing-ready draft with crisp headings and tight paragraphs.',
    '- Weave retrieved precedents naturally into reasoning; do not invent citations, neutral citations, or case names not listed above.',
    '- Where retrieved cases support a principle, reference them by exact title from the research block and explain the legal principle briefly.',
    '- Preserve client-specific facts from the query; use <<placeholder>> only for genuinely missing particulars.',
    '- End with a short, tactical prayer or relief clause suited to the court and offence type.',
  ].join('\n');

  return { prompt, estimateTokens: 1100 };
}

function buildKnowledgeBlock(knowledge: InjectedKnowledge): string {
  if (!knowledge.nodes.length) {
    return 'No injected knowledge available.';
  }

  return knowledge.nodes
    .map((item) => `-- [${item.node.category}] ${item.node.title}\n${item.node.content}`)
    .join('\n\n');
}

function buildIndianKanoonBlock(ikResults: IKCaseResult[]): string {
  if (!ikResults.length) {
    return 'No live Indian Kanoon precedents were retrieved. Rely on firm knowledge and established principles only; do not fabricate case citations.';
  }

  return ikResults
    .slice(0, 5)
    .map((result, index) => {
      const court = result.court?.trim() || 'Court not identified in scrape';
      const principle = result.snippet?.trim() || result.headline?.trim() || 'See linked judgment.';

      return [
        `${index + 1}. ${result.title}`,
        `   Court: ${court}`,
        `   Principle / excerpt: ${principle}`,
        `   Source: ${result.url}`,
      ].join('\n');
    })
    .join('\n\n');
}

function buildFallbackTemplateHint(practiceArea: string): string {
  if (practiceArea === 'corporate') {
    return '(No template — use concise corporate drafting: recitals, operative clauses, definitions, governing law, and signature blocks.)';
  }
  return '(No template — use professional Indian court pleading structure with facts, grounds, and prayer.)';
}

function buildPracticeAreaGuidance(request: AIGenerationRequest): string {
  const area = request.classification.practice_area;
  const docType = request.classification.document_type;

  if (area === 'corporate') {
    const lines = [
      'Corporate: clauses precise, defined terms consistent, commercial intent clear.',
    ];

    if (docType.includes('nda')) {
      lines.push('NDA: confidential information, permitted disclosures, term, return/destruction.');
    } else if (docType.includes('arbitration')) {
      lines.push('Arbitration: seat, institution, tribunal composition, language, interim relief.');
    } else if (docType.includes('board')) {
      lines.push('Board resolution: number, date, quorum, signatories, Companies Act basis.');
    } else if (docType.includes('shareholder') || docType.includes('dispute')) {
      lines.push('Shareholder: grievance, statutory basis, relief, prerequisites.');
    } else if (docType.includes('compliance')) {
      lines.push('Compliance: provision cited, non-compliance factual, cure period, consequences.');
    }

    return lines.join('\n');
  }

  return 'Litigation: court tone, chronological facts, distinct grounds and prayer.';
}

function buildLevel3StrategicGuidance(query: string, ikResults: IKCaseResult[]): string {
  const lower = query.toLowerCase();
  const lines: string[] = [
    'Citation discipline: reference only matters listed in the LIVE or FIRM KNOWLEDGE blocks; do not invent case names.',
  ];

  if (ikResults.length > 0) {
    lines.push(
      `${ikResults.length} live authority(ies) retrieved — weave each into reasoning by exact title from the LIVE block.`
    );
  } else {
    lines.push(
      'No live precedents retrieved — rely on firm knowledge and established principles; do not fabricate citations.'
    );
  }

  const isBail = /\b(anticipatory|bail|438|439)\b/i.test(lower);
  const isEconomic = /\b(economic|pmla|money laundering|cheating|fraud)\b/i.test(lower);
  const isCustodial = /\b(custod|interrogat|arrest|seizure|ed |enforcement directorate|cbi)\b/i.test(lower);

  if (isBail) {
    lines.push(
      'Bail: address apprehension of arrest, flight risk, proportionality, and necessity (cite live authorities only).'
    );
  } else if (isEconomic || isCustodial) {
    lines.push(
      'Custody arguments: emphasise documentary evidence already secured; argue proportionality and limited interrogation need.'
    );
  }

  return lines.join('\n');
}

const builder = {
  buildGenericPrompt,
  buildTemplatePrompt,
  buildKnowledgePrompt,
};

export default builder;
