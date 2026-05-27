import type { IKCaseView } from '@/components/IKResearchPanel';
import type { KnowledgeNodeView } from '@/components/KnowledgePanel';
import type { IntelligenceScore } from '@/lib/intelligence-score';

export interface DraftTokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface PipelineTrustSignals {
  liveRetrieval: 'live' | 'cached' | 'empty' | 'failed';
  knowledgeInjected: boolean;
  templateOrchestration: boolean;
  knowledgeFallbackActive: boolean;
}

export interface ClassificationResult {
  practice_area: string;
  document_type: string;
  court_type: string;
  confidence: number;
  matched_keywords: string[];
}

export interface TemplateResult {
  id?: string;
  title?: string;
  description?: string | null;
  document_type?: string;
  court_type?: string | null;
  version?: number;
}

export interface GenerateResponse {
  classification: ClassificationResult;
  template: TemplateResult;
  knowledge: {
    nodes?: KnowledgeNodeView[];
    error?: string;
    token_usage?: {
      used: number;
      budget: number;
    };
    ikResearch?: {
      results: IKCaseView[];
      query?: string;
      fromCache?: boolean;
      error?: string;
      warning?: string;
    };
  };
  tokenUsage: {
    level1: DraftTokenUsage;
    level2: DraftTokenUsage;
    level3: DraftTokenUsage;
    total: DraftTokenUsage;
  };
  outputs: {
    level1: string;
    level2: string;
    level3: string;
  };
  intelligence: {
    level1: IntelligenceScore;
    level2: IntelligenceScore;
    level3: IntelligenceScore;
    liveAuthorities: string[];
    knowledgeAuthorities: string[];
    /** @deprecated Use liveAuthorities */
    authoritiesUsed: string[];
  };
  pipelineSignals: PipelineTrustSignals;
  providerUsed?: string;
  providerFallback?: boolean;
}

export interface EnvCheckView {
  name: string;
  configured: boolean;
  required: boolean;
  fallback?: string;
}

export interface TableStatusView {
  table: string;
  ok: boolean;
  count: number | null;
  error?: string;
}

export interface IntegrationStatus {
  env: EnvCheckView[];
  gemini: {
    configured: boolean;
    model?: string;
    envName?: string;
    providers?: Record<string, boolean>;
  };
  supabase: {
    configured: boolean;
    tables: TableStatusView[];
  };
}
