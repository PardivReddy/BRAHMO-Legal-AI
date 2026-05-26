import type { AIProviderName, GenerateOptions, GenerateResult } from '@/lib/ai/providers/types';
import { generateContent as orchestratedGenerateContent, getAIStatus, assertAIConfigured } from '@/lib/ai/orchestration/orchestrator';

export const GEMINI_MODEL_NAME = 'gemini-2.5-flash';


export type { GenerateResult, GenerateOptions };

export async function generateContent(
  prompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {

  // Delegate to the orchestrator which performs availability checks and returns
  // a degraded response when appropriate. Avoid throwing early here so callers
  // (including demo/test environments without API keys) receive a graceful
  // degraded result instead of an exception.
  try {
    return await orchestratedGenerateContent(prompt, options);
  } catch (error: unknown) {
    console.error('[Gemini] Content generation failed:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(String(error));
  }
}

export function getGeminiStatus(): {
  configured: boolean;
  providers: Record<AIProviderName, boolean>;
  defaults: {
    geminiModelChain: readonly string[];
    openAIModelChain: readonly string[];
    claudeModelChain: readonly string[];
  };
} {

  // Verify status service is available
  try {
    return getAIStatus();
  } catch (error) {
    console.error('[Gemini] Status check failed:', error);
    return {
      configured: false,
      providers: {} as Record<AIProviderName, boolean>,
      defaults: {
        geminiModelChain: [],
        openAIModelChain: [],
        claudeModelChain: []
      }
    };
  }
}

export function assertGeminiConfigured(): void {
  try {
    assertAIConfigured();
  } catch {
    // Convert generic orchestrator error into the legacy message consumers expect
    throw new Error('Gemini is not configured');
  }
}
