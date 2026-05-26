import { logger } from '@/lib/ai/utils/logger';
import { AIProvider, AIProviderName, GenerateOptions, GenerateResult } from '@/lib/ai/providers/types';

export class LocalProvider implements AIProvider {
  public readonly name: AIProviderName = 'local';

  public isAvailable(): boolean {
    return false;
  }

  public async generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    void prompt;
    void options;
    logger.warn('Local provider is not available for generation.', { provider: 'local' });
    return {
      text: 'AI services are temporarily unavailable.',
      model: 'local-fallback',
      provider: 'local',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      degraded: true,
    };
  }
}

export const localProvider = new LocalProvider();
