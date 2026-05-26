export type AIProviderName = 'gemini' | 'openai' | 'claude' | 'local';

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  systemInstruction?: string;
  requestId?: string;
}

export interface GenerateResult {
  text: string;
  model: string;
  provider: AIProviderName | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  degraded?: boolean;
}

export interface AIProvider {
  name: AIProviderName;
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;
  isAvailable(): boolean;
}
