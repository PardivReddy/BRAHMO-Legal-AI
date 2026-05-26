-- Seed data for BRAHMO Legal AI (development / initial)
-- NOTE: In production, use migrations / safer seed process.

-- Insert sample templates
insert into legal_templates (id, practice_area, document_type, court_type, title, description, content, variables, metadata, is_active, version)
values
  (gen_random_uuid(), 'criminal', 'anticipatory_bail', 'high_court', 'Anticipatory Bail Application (High Court)', 'Standard anticipatory bail pleading for High Court',
   '<<TEMPLATE_START>>\nTitle: Anticipatory Bail Application\nClient: {{client_name}}\nFacts: {{facts}}\nReliefs: {{reliefs}}\n\n-- Knowledge Injection --\n<<INJECT_KNOWLEDGE>>\n<<TEMPLATE_END>>',
   '[{"name":"client_name","label":"Client Name","type":"text","required":true},{"name":"facts","label":"Facts","type":"textarea","required":true},{"name":"reliefs","label":"Reliefs","type":"textarea","required":false}]'::jsonb,
   '{"auto_research":"anticipatory bail high court"}'::jsonb, true, 1),

  (gen_random_uuid(), 'corporate', 'nda_review', null, 'NDA Review Checklist and Redlines', 'Template for NDA review and suggested redlines',
   '<<TEMPLATE_START>>\nTitle: NDA Review\nCounterparty: {{counterparty}}\nKey Issues: {{issues}}\n\n-- Knowledge Injection --\n<<INJECT_KNOWLEDGE>>\n<<TEMPLATE_END>>',
   '[{"name":"counterparty","label":"Counterparty","type":"text","required":true},{"name":"issues","label":"Key Issues","type":"textarea","required":false}]'::jsonb,
   '{"auto_research":"nda confidentiality agreement"}'::jsonb, true, 1),

  (gen_random_uuid(), 'corporate', 'board_resolution', null, 'Board Resolution', 'Board resolution for corporate approvals',
   '<<TEMPLATE_START>>\nRESOLUTION\nCompany: {{company}}\nResolution: {{resolution}}\n\n-- Knowledge Injection --\n<<INJECT_KNOWLEDGE>>\n<<TEMPLATE_END>>',
   '[{"name":"company","label":"Company","type":"text","required":true},{"name":"resolution","label":"Resolution","type":"textarea","required":true}]'::jsonb,
   '{"auto_research":"companies act board resolution"}'::jsonb, true, 1),

  (gen_random_uuid(), 'corporate', 'arbitration_clause', null, 'Arbitration Clause', 'Dispute resolution clause for commercial agreements',
   '<<TEMPLATE_START>>\nArbitration Clause\nParties: {{parties}}\n\n-- Knowledge Injection --\n<<INJECT_KNOWLEDGE>>\n<<TEMPLATE_END>>',
   '[{"name":"parties","label":"Parties","type":"text","required":true}]'::jsonb,
   '{"auto_research":"arbitration agreement India seat"}'::jsonb, true, 1);

-- Insert sample knowledge nodes (criminal)
insert into knowledge_nodes (id, practice_area, category, title, content, relevance_tags, citations, priority, token_estimate, client_id, matter_id, is_active)
values
  (gen_random_uuid(), 'criminal', 'CONSTRAINT', 'Section 438 Limitation Note', 'Be mindful: anticipatory bail under Section 438 requires showing of reasonable apprehension of arrest; courts weigh custodial interrogation risk heavily.', array['anticipatory','section 438','bail'], '[]'::jsonb, 10, 120, null, null, true),
  (gen_random_uuid(), 'criminal', 'ANTI_PATTERN', 'Avoid over-detailed facts', 'Long, unstructured facts sections dilute prima facie narrative; prefer concise chronological bullets.', array['facts','drafting','strategy'], '[]'::jsonb, 20, 80, null, null, true),
   (gen_random_uuid(), 'criminal', 'DECISION', 'Firm note: anticipatory bail — custodial risk (Del HC)', 'Reported Delhi High Court bail jurisprudence supports relief where custodial interrogation is unlikely to advance investigation and documents are already secured — use as internal drafting guidance only.', array['case law','anticipatory','high court'], '[{"title":"Custodial risk — anticipatory bail (Del HC sample)","citation_ref":"Internal firm knowledge","court":"Delhi High Court","year":2019}]'::jsonb, 30, 300, null, null, true),
   (gen_random_uuid(), 'corporate', 'CLIENT_FACT', 'Confidentiality carve-outs', 'For technology clients, consider carve-outs for listed open-source and pre-existing IP; capture these as explicit schedules.', array['nda','confidentiality','ip'], '[]'::jsonb, 40, 90, null, null, true),
  (gen_random_uuid(), 'corporate', 'ANTI_PATTERN', 'Avoid broad perpetual obligations', 'Perpetual confidentiality obligations are rarely acceptable; use time-limited obligations tied to reasonable commercial periods.', array['nda','duration','anti-pattern'], '[]'::jsonb, 50, 100, null, null, true);

-- Insert section mappings (samples)
insert into section_mappings (id, old_code, old_section, new_code, new_section, description)
values
  (gen_random_uuid(), 'IPC', '302', 'BNS', 'BNS-IPC-302', 'Homicide mapping example'),
  (gen_random_uuid(), 'IPC', '307', 'BNS', 'BNS-IPC-307', 'Attempt to Murder mapping example'),
  (gen_random_uuid(), 'CrPC', '482', 'BNSS', 'BNSS-CrPC-482', 'Quashing / inherent powers mapping example');

-- Insert sample matters
insert into matters (id, user_id, title, practice_area, status, metadata)
values
  (gen_random_uuid(), gen_random_uuid(), 'Sharma — Anticipatory Bail Matter', 'criminal', 'active', '{"client":"Sharma","opposing":"State"}'::jsonb),
  (gen_random_uuid(), gen_random_uuid(), 'Acme Corp NDA review', 'corporate', 'draft', '{"client":"Acme Corp","counterparty":"Beta LLC"}'::jsonb);
