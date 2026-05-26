import { generateContent, GEMINI_MODEL_NAME, type GenerateResult } from '@/lib/gemini';
import {
  buildGenericPrompt,
  buildKnowledgePrompt,
  buildTemplatePrompt,
} from '@/lib/prompt-builder';
import type {
  AIGenerationRequest,
  AIGenerationResponse,
  AILevel,
  IKCaseResult,
} from '@/types/legal';

const LEGAL_DRAFTING_SYSTEM_INSTRUCTION = [
  'You are BRAHMO Legal AI, a careful Indian legal drafting assistant.',
  'Draft usable legal work product, avoid invented facts, and mark missing information with clear placeholders.',
  'Do not state uncertain legal propositions as settled law.',
].join(' ');

export async function generateGenericDraft(
  request: AIGenerationRequest
): Promise<AIGenerationResponse> {
  const { prompt } = buildGenericPrompt({ ...request, level: 'generic' });
  const result = await runDraftGeneration(prompt, request, {
    maxOutputTokens: 1536,
    temperature: 0.45,
  });

  return toGenerationResponse('generic', request, result);
}

export async function generateTemplateDraft(
  request: AIGenerationRequest
): Promise<AIGenerationResponse> {
  const { prompt } = buildTemplatePrompt({ ...request, level: 'template' });
  const result = await runDraftGeneration(prompt, request, {
    maxOutputTokens: 2048,
    temperature: 0.4,
  });

  return toGenerationResponse('template', request, result);
}

export async function generateKnowledgeDraft(
  request: AIGenerationRequest,
  ikResults: IKCaseResult[] = []
): Promise<AIGenerationResponse> {
  const { prompt } = buildKnowledgePrompt({ ...request, level: 'knowledge' }, ikResults);
  const result = await runDraftGeneration(prompt, request, {
    maxOutputTokens: 4096,
    temperature: 0.3,
  });

  return toGenerationResponse('knowledge', request, result);
}

async function runDraftGeneration(
  prompt: string,
  request: AIGenerationRequest,
  overrides?: { maxOutputTokens?: number; temperature?: number }
): Promise<GenerateResult> {
  return generateContent(prompt, {
    model: request.model ?? GEMINI_MODEL_NAME,
    temperature: overrides?.temperature ?? request.temperature ?? 0.35,
    maxOutputTokens: overrides?.maxOutputTokens ?? request.max_tokens ?? 8192,
    systemInstruction: LEGAL_DRAFTING_SYSTEM_INSTRUCTION,
  });
}

function toGenerationResponse(
  level: AILevel,
  request: AIGenerationRequest,
  result: GenerateResult
): AIGenerationResponse {
  return {
    content: result.text,
    model: result.model,
    level,
    classification: request.classification,
    tokens_used: {
      input: result.inputTokens,
      output: result.outputTokens,
      total: result.inputTokens + result.outputTokens,
    },
    generated_at: new Date().toISOString(),
  };
}
