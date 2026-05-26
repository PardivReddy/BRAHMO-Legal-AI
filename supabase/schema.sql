-- Supabase / PostgreSQL schema for BRAHMO Legal AI
-- Extensions
create extension if not exists "pgcrypto";

-- 1) legal_templates
create table if not exists legal_templates (
  id uuid primary key default gen_random_uuid(),
  practice_area text not null,
  document_type text not null,
  court_type text,
  title text not null,
  description text,
  content text not null,
  variables jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  is_active boolean default true,
  version integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_templates_practice_area on legal_templates(practice_area);
create index if not exists idx_templates_document_type on legal_templates(document_type);
create index if not exists idx_templates_court_type on legal_templates(court_type);
create index if not exists idx_templates_metadata_gin on legal_templates using gin (metadata jsonb_path_ops);

-- 2) knowledge_nodes
create table if not exists knowledge_nodes (
  id uuid primary key default gen_random_uuid(),
  practice_area text not null,
  category text not null, -- e.g., CONSTRAINT, ANTI_PATTERN, DECISION, CLIENT_FACT
  title text not null,
  content text not null,
  relevance_tags text[] default array[]::text[],
  citations jsonb default '[]'::jsonb,
  priority integer default 100,
  token_estimate integer default 0,
  client_id uuid,
  matter_id uuid,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_kn_practice_area on knowledge_nodes(practice_area);
create index if not exists idx_kn_client_id on knowledge_nodes(client_id);
create index if not exists idx_kn_matter_id on knowledge_nodes(matter_id);
create index if not exists idx_kn_tags_gin on knowledge_nodes using gin (relevance_tags);
create index if not exists idx_kn_citations_gin on knowledge_nodes using gin (citations jsonb_path_ops);

-- 3) section_mappings
create table if not exists section_mappings (
  id uuid primary key default gen_random_uuid(),
  old_code text not null,
  old_section text not null,
  new_code text not null,
  new_section text not null,
  description text,
  created_at timestamptz default now(),
  constraint uq_section_map unique (old_code, old_section)
);
create index if not exists idx_section_old on section_mappings(old_code, old_section);

-- 4) court_formats
create table if not exists court_formats (
  id uuid primary key default gen_random_uuid(),
  court_type text not null unique,
  header_format text,
  footer_format text,
  margin_rules jsonb default '{}'::jsonb,
  font_requirements text,
  numbering_style text default 'arabic',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5) ik_case_cache
create table if not exists ik_case_cache (
  id uuid primary key default gen_random_uuid(),
  query_hash text not null unique,
  query text not null,
  results jsonb not null,
  cached_at timestamptz default now(),
  expires_at timestamptz
);
create index if not exists idx_ik_query_hash on ik_case_cache(query_hash);

-- 6) matters
create table if not exists matters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  practice_area text not null,
  status text default 'draft',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_matters_user on matters(user_id);
create index if not exists idx_matters_practice_area on matters(practice_area);

-- Helpful: trigger to update updated_at on row modification
create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_update_templates_updated_at
before update on legal_templates
for each row execute function update_timestamp();

create trigger trg_update_kn_updated_at
before update on knowledge_nodes
for each row execute function update_timestamp();

create trigger trg_update_court_formats_updated_at
before update on court_formats
for each row execute function update_timestamp();

create trigger trg_update_matters_updated_at
before update on matters
for each row execute function update_timestamp();
