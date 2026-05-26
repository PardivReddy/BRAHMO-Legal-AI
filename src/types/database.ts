/**
 * @module types/database
 * @description Supabase database type definitions for BRAHMO Legal AI.
 * Extend this file as new tables are added to the Supabase schema.
 */

export interface Database {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string;
          practice_area: string;
          document_type: string;
          court_type: string | null;
          title: string;
          description: string | null;
          content: string;
          variables: Record<string, unknown>[];
          is_active: boolean;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['templates']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['templates']['Insert']>;
      };
      knowledge_nodes: {
        Row: {
          id: string;
          practice_area: string;
          category: string;
          title: string;
          content: string;
          relevance_tags: string[];
          citations: Record<string, unknown>[] | string[];
          token_estimate: number | null;
          client_id: string | null;
          matter_id: string | null;
          priority: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['knowledge_nodes']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['knowledge_nodes']['Insert']>;
      };
      section_mappings: {
        Row: {
          id: string;
          old_code: string;
          old_section: string;
          new_code: string;
          new_section: string;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['section_mappings']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['section_mappings']['Insert']>;
      };
      ik_case_cache: {
        Row: {
          id: string;
          query_hash: string;
          query: string;
          results: Record<string, unknown>[] | Record<string, unknown>;
          cached_at: string;
          expires_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ik_case_cache']['Row'], 'id' | 'cached_at'>;
        Update: Partial<Database['public']['Tables']['ik_case_cache']['Insert']>;
      };
      matters: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          practice_area: string;
          status: string;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['matters']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['matters']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
