import { generateGenericDraft, generateKnowledgeDraft, generateTemplateDraft } from '@/lib/generation-helpers';
import { assertGeminiConfigured } from '@/lib/gemini';
import { buildIkSearchQueryVariants } from '@/lib/ik-query-builder';
import { ikCasesToResults, searchIndianKanoonWithRetry } from '@/lib/indiankanoon';
import { sanitizeDraftOutput } from '@/lib/output-sanitizer';
import { injectKnowledge } from '@/lib/knowledge-injector';
import { normalizeSectionsInText, type SectionNormalizationResult } from '@/lib/section-normalizer';
import { buildLevelIntelligenceScores } from '@/lib/intelligence-score';
import { classifyQuery, selectTemplate } from '@/lib/template-selector';
import type {
  AIGenerationRequest,
  AIGenerationResponse,
  IKCaseResult,
  InjectedKnowledge,
  LegalTemplate,
} from '@/types/legal';

export const runtime = 'nodejs';

interface GenerateRouteInput {
  query: string;
  clientId?: string;
  matterId?: string;
}

interface PipelineKnowledge extends InjectedKnowledge {
  token_usage?: {
    used: number;
    budget: number;
  };
  error?: string;
}

interface IKResearchSummary {
  results: IKCaseResult[];
  query?: string;
  fromCache?: boolean;
  error?: string;
  warning?: string;
}

interface OutputTokenUsage {
  input: number;
  output: number;
  total: number;
}

type OutputLevel = 'level1' | 'level2' | 'level3';

type SectionNormalizationByLevel = Record<OutputLevel, SectionNormalizationResult['references']>;

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await parseRequestBody(request);

    if (!body.query.trim()) {
      return Response.json(
        { error: 'Validation failed', details: 'query is required.' },
        { status: 400 }
      );
    }

    assertGeminiConfigured();

    const classification = classifyQuery(body.query);
    const template = await selectTemplate(classification);
    const knowledge = await safeInjectKnowledge({
      practice_area: classification.practice_area,
      tags: buildKnowledgeTags(classification),
      client_id: body.clientId ?? null,
      matter_id: body.matterId ?? null,
    });
    const baseRequest: AIGenerationRequest = {
      query: body.query,
      level: 'generic',
      classification,
      template,
      knowledge,
    };

    const [level1, level2, ikResearch] = await Promise.all([
      generateGenericDraft({ ...baseRequest, level: 'generic' }),
      generateTemplateDraft({ ...baseRequest, level: 'template' }),
      runIKResearch(body.query, template, classification),
    ]);

    const level3 = await generateKnowledgeDraft(
      { ...baseRequest, level: 'knowledge' },
      ikResearch.results
    );

    const normalized = await normalizeGeneratedOutputs({
      level1,
      level2,
      level3,
    });

    const tokens = buildTokenUsage(normalized.responses, knowledge);
    const intelligence = buildLevelIntelligenceScores({
      outputs: {
        level1: normalized.responses.level1.content,
        level2: normalized.responses.level2.content,
        level3: normalized.responses.level3.content,
      },
      classification,
      hasTemplate: Boolean(template?.id),
      knowledgeNodeCount: knowledge.nodes?.length ?? 0,
      knowledgeTokensUsed: knowledge.token_usage?.used ?? 0,
      knowledgeNodes: knowledge.nodes ?? [],
      precedents: ikResearch.results,
      tokens: {
        level1: tokens.level1,
        level2: tokens.level2,
        level3: tokens.level3,
      },
      sectionReferences: {
        level1: normalized.sectionReferences.level1.length,
        level2: normalized.sectionReferences.level2.length,
        level3: normalized.sectionReferences.level3.length,
      },
    });

    return Response.json({
      classification,
      template: serializeTemplate(template),
      knowledge: {
        ...knowledge,
        ikResearch,
        sectionNormalization: normalized.sectionReferences,
      },
      tokenUsage: tokens,
      intelligence,
      pipelineSignals: buildPipelineSignals(template, knowledge, ikResearch),
      outputs: {
        level1: normalized.responses.level1.content,
        level2: normalized.responses.level2.content,
        level3: normalized.responses.level3.content,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected generation error.';
    const status = message.includes('Invalid JSON')
      ? 400
      : message.includes('Gemini is not configured')
        ? 503
        : 500;

    console.error('[BRAHMO Generate API]', error);

    return Response.json(
      {
        error: 'Generation failed',
        details: message,
      },
      { status }
    );
  }
}

async function parseRequestBody(request: Request): Promise<GenerateRouteInput> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new Error('Invalid JSON request body.');
  }

  if (!isRecord(payload) || typeof payload.query !== 'string') {
    throw new Error('Invalid JSON request body. Expected { query: string, clientId?: string, matterId?: string }.');
  }

  return {
    query: payload.query,
    clientId: typeof payload.clientId === 'string' ? payload.clientId : undefined,
    matterId: typeof payload.matterId === 'string' ? payload.matterId : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildKnowledgeTags(
  classification: ReturnType<typeof classifyQuery>
): string[] {
  return Array.from(
    new Set([
      classification.practice_area,
      classification.document_type,
      classification.court_type,
      ...classification.matched_keywords,
    ].filter(Boolean))
  );
}

async function runIKResearch(
  query: string,
  template: LegalTemplate | null,
  classification: ReturnType<typeof classifyQuery>
): Promise<IKResearchSummary> {
  const variants = buildIkSearchQueryVariants(
    query,
    classification,
    isRecord(template?.metadata) ? template.metadata : null
  );

  try {
    const search = await searchIndianKanoonWithRetry(variants);
    const results = ikCasesToResults(search.results);
    const displayQuery = search.query || variants[0] || query;

    if (!results.length) {
      return {
        results: [],
        query: displayQuery,
        fromCache: search.fromCache,
        warning:
          'No live precedents retrieved for this query. Level 3 continued using firm knowledge and template orchestration.',
      };
    }

    return {
      results,
      query: displayQuery,
      fromCache: search.fromCache,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Indian Kanoon research failed.';
    console.warn('[BRAHMO Generate API] Indian Kanoon research skipped:', message);
    return {
      results: [],
      query: variants[0] ?? query,
      error: message,
      warning:
        'Live retrieval unavailable — fallback orchestration active. Level 3 used firm knowledge and template intelligence only.',
    };
  }
}

async function safeInjectKnowledge(
  options: Parameters<typeof injectKnowledge>[0]
): Promise<PipelineKnowledge> {
  try {
    return await injectKnowledge(options);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Knowledge injection failed.';
    console.warn('[BRAHMO Generate API] Knowledge injection skipped:', message);

    return {
      practice_area: options.practice_area,
      nodes: [],
      total_nodes_found: 0,
      injection_timestamp: new Date().toISOString(),
      injection_text: '',
      token_usage: { used: 0, budget: options.tokenBudget ?? 800 },
      error: message,
    };
  }
}

async function normalizeGeneratedOutputs(responses: Record<OutputLevel, AIGenerationResponse>): Promise<{
  responses: Record<OutputLevel, AIGenerationResponse>;
  sectionReferences: SectionNormalizationByLevel;
}> {
  const [level1, level2, level3] = await Promise.all([
    normalizeSectionsInText(responses.level1.content),
    normalizeSectionsInText(responses.level2.content),
    normalizeSectionsInText(responses.level3.content),
  ]);

  return {
    responses: {
      level1: { ...responses.level1, content: sanitizeDraftOutput(level1.text) },
      level2: { ...responses.level2, content: sanitizeDraftOutput(level2.text) },
      level3: { ...responses.level3, content: sanitizeDraftOutput(level3.text) },
    },
    sectionReferences: {
      level1: level1.references,
      level2: level2.references,
      level3: level3.references,
    },
  };
}

function serializeTemplate(template: LegalTemplate | null): LegalTemplate | Record<string, never> {
  return template ?? {};
}

function buildPipelineSignals(
  template: LegalTemplate | null,
  knowledge: PipelineKnowledge,
  ikResearch: IKResearchSummary
): {
  liveRetrieval: 'live' | 'cached' | 'empty' | 'failed';
  knowledgeInjected: boolean;
  templateOrchestration: boolean;
  knowledgeFallbackActive: boolean;
} {
  const hasLive = ikResearch.results.length > 0;
  const liveRetrieval: 'live' | 'cached' | 'empty' | 'failed' = ikResearch.error
    ? 'failed'
    : hasLive
      ? ikResearch.fromCache
        ? 'cached'
        : 'live'
      : 'empty';

  const knowledgeInjected = (knowledge.nodes?.length ?? 0) > 0;

  return {
    liveRetrieval,
    knowledgeInjected,
    templateOrchestration: Boolean(template?.id),
    knowledgeFallbackActive: knowledgeInjected && !hasLive,
  };
}

function buildTokenUsage(
  responses: Record<OutputLevel, AIGenerationResponse>,
  knowledge: PipelineKnowledge
): {
  level1: OutputTokenUsage;
  level2: OutputTokenUsage;
  level3: OutputTokenUsage;
  total: OutputTokenUsage;
  knowledge: PipelineKnowledge['token_usage'] | null;
} {
  const level1 = responses.level1.tokens_used;
  const level2 = responses.level2.tokens_used;
  const level3 = responses.level3.tokens_used;

  const pipelineInput = level1.input + level2.input + level3.input;
  const pipelineOutput = level1.output + level2.output + level3.output;

  return {
    level1,
    level2,
    level3,
    total: {
      input: pipelineInput,
      output: pipelineOutput,
      total: pipelineInput + pipelineOutput,
    },
    knowledge: knowledge.token_usage ?? null,
  };
}
