/**
 * @module types/legal
 * @description Core type definitions for BRAHMO Legal AI.
 * All shared interfaces, enums, and constants used across lib modules.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Practice Areas
// ─────────────────────────────────────────────────────────────────────────────

/** Supported practice areas — extend this union type to add new areas */
export type PracticeArea =
  | 'criminal'
  | 'corporate'
  | 'civil'
  | 'family'
  | 'tax'
  | 'labour'
  | 'constitutional'
  | 'generic';

/** Registry of all known practice areas with display metadata */
export const PRACTICE_AREAS: Record<PracticeArea, { label: string; description: string }> = {
  criminal: { label: 'Criminal Law', description: 'IPC/BNS, CrPC/BNSS, Evidence Act/BSA matters' },
  corporate: { label: 'Corporate Law', description: 'Companies Act, SEBI, contracts, M&A' },
  civil: { label: 'Civil Law', description: 'CPC, property, contract disputes' },
  family: { label: 'Family Law', description: 'Divorce, custody, maintenance, succession' },
  tax: { label: 'Tax Law', description: 'Income Tax, GST, customs, excise' },
  labour: { label: 'Labour Law', description: 'Industrial disputes, employment, wages' },
  constitutional: { label: 'Constitutional Law', description: 'Fundamental rights, writs, PIL' },
  generic: { label: 'General', description: 'General legal queries' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Template Types
// ─────────────────────────────────────────────────────────────────────────────

/** A variable placeholder within a legal template */
export interface TemplateVariable {
  name: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'textarea';
  required: boolean;
  default_value?: string;
  options?: string[];
  description?: string;
}

/** A legal document template stored in Supabase */
export interface LegalTemplate {
  id: string;
  practice_area: PracticeArea;
  document_type: string;
  court_type: string | null;
  title: string;
  description: string | null;
  content: string;
  variables: TemplateVariable[];
  metadata?: Record<string, unknown>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Graph
// ─────────────────────────────────────────────────────────────────────────────

/** A node in the legal knowledge graph */
export interface KnowledgeNode {
  id: string;
  practice_area: PracticeArea;
  category: string;
  title: string;
  content: string;
  relevance_tags: string[];
  citations: Citation[] | Record<string, unknown>[];
  priority: number;
  token_estimate?: number;
  client_id?: string | null;
  matter_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** A case law citation */
export interface Citation {
  title: string;
  citation_ref: string;
  court: string;
  year: number | null;
  relevance: string;
  url?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Mapping (IPC → BNS etc.)
// ─────────────────────────────────────────────────────────────────────────────

/** Mapping between old and new statutory section numbers */
export interface SectionMapping {
  id: string;
  old_code: string;
  old_section: string;
  new_code: string;
  new_section: string;
  description: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Indian Kanoon
// ─────────────────────────────────────────────────────────────────────────────

/** Live HTML scrape result from Indian Kanoon search */
export interface IKCase {
  title: string;
  url: string;
  snippet: string;
  court?: string | null;
}

/** A single case result from Indian Kanoon */
export interface IKCaseResult {
  doc_id: string;
  title: string;
  headline: string;
  doc_author: string;
  court: string;
  date: string;
  citation: string;
  snippet: string;
  url: string;
}

/** Cached Indian Kanoon query result */
export interface IKCaseCache {
  id: string;
  query_hash: string;
  query: string;
  results: IKCaseResult[];
  cached_at: string;
  expires_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Court Formatting
// ─────────────────────────────────────────────────────────────────────────────

/** Court-specific document formatting rules */
export interface CourtFormat {
  court_type: string;
  header_format: string;
  footer_format: string;
  margin_rules: string;
  font_requirements: string;
  numbering_style: 'roman' | 'arabic' | 'alphabetic';
}

// ─────────────────────────────────────────────────────────────────────────────
// Matters
// ─────────────────────────────────────────────────────────────────────────────

/** A legal matter / case being tracked */
export interface Matter {
  id: string;
  user_id: string;
  title: string;
  practice_area: PracticeArea;
  status: 'active' | 'archived' | 'draft';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Classification
// ─────────────────────────────────────────────────────────────────────────────

/** Result of classifying a user's legal query */
export interface QueryClassification {
  practice_area: PracticeArea;
  document_type: string;
  court_type: string;
  confidence: number;
  matched_keywords: string[];
  raw_query: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Generation
// ─────────────────────────────────────────────────────────────────────────────

/** AI sophistication level */
export type AILevel = 'generic' | 'template' | 'knowledge';

/** Request payload for AI document generation */
export interface AIGenerationRequest {
  query: string;
  level: AILevel;
  classification: QueryClassification;
  template?: LegalTemplate | null;
  knowledge?: InjectedKnowledge | null;
  court_format?: CourtFormat | null;
  variables?: Record<string, string>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

/** Response from AI document generation */
export interface AIGenerationResponse {
  content: string;
  model: string;
  level: AILevel;
  classification: QueryClassification;
  tokens_used: {
    input: number;
    output: number;
    total: number;
  };
  provider?: string | null;
  fallbackUsed?: boolean;
  quality_score?: QualityScore;
  generated_at: string;
}

/** Injected knowledge context for AI prompts */
export interface InjectedKnowledge {
  practice_area: PracticeArea;
  nodes: ScoredKnowledgeNode[];
  total_nodes_found: number;
  injection_timestamp: string;
  injection_text?: string;
}

/** A knowledge node with a computed relevance score */
export interface ScoredKnowledgeNode {
  node: KnowledgeNode;
  relevance_score: number;
  matched_tags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Evaluation
// ─────────────────────────────────────────────────────────────────────────────

/** Quality evaluation scores for generated content */
export interface QualityScore {
  overall: number;
  accuracy: number;
  completeness: number;
  formatting: number;
  citation_quality: number;
  recommendations: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Generated Outputs
// ─────────────────────────────────────────────────────────────────────────────

/** Collection of all generated outputs for a query */
export interface GeneratedOutputs {
  generic?: AIGenerationResponse;
  template?: AIGenerationResponse;
  knowledge?: AIGenerationResponse;
}
