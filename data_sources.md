# BRAHMO Legal AI — Legal Research Audit

This document is a provenance and governance record for the BRAHMO Legal AI Template Engine. It documents the sources, retrieval methods, verification controls, and template provenance used to support Level 3 legal drafting outputs.

## 1. Title & Overview

BRAHMO Legal AI combines grounded retrieval from Indian Kanoon with institutionally curated knowledge injection. The system is designed to produce draft legal text that is traceable, auditable, and aligned with court-format conventions.

Purpose:

- Document the architecture and data dependencies that support legal draft generation.
- Preserve provenance for precedent retrieval, template selection, and knowledge injection.
- Ensure transparency across query construction, authority selection, and normalization.

Scope:

- This document covers Indian Kanoon research, court formatting references, section mapping, template provenance, knowledge node sourcing, validation controls, and system limitations.
- Outputs are prototype assistance for legal drafting and are not substitutes for qualified legal review.

## 2. Research Methodology

The research methodology is structured as a forensic audit of precedent retrieval and selection.

### Query construction

- Queries are built from the practice area, issue statement, court type, and relevant statutory provisions.
- Search strings prioritize issue-specific terms such as "anticipatory bail", "search and seizure", "economic offence", "NCLT petition", and "interim relief".
- Where applicable, queries include both substantive law terms and procedural anchors (for example, Section 438 CrPC, Section 100 CrPC, or IBC interim application language).

### Retrieval process

- Indian Kanoon search is used as the primary retrieval source.
- Retrieval uses the same query construction parameters as the production pipeline to preserve reproducibility.
- Results are captured with retrieval date and the search interface result count.

### Authority selection

Selected authorities are evaluated against the following criteria:

- Practice area match: Does the authority address the same procedural or substantive issue?
- Factual overlap: Are the core fact patterns materially aligned with the query?
- Court hierarchy: Preference is given to higher court and tribunal decisions where relevant.
- Procedural relevance: Authorities are prioritized for procedural guidance on bail, arrest, evidence, notice, or interim relief.
- Custodial interrogation relevance: For criminal queries, cases that discuss search, seizure, custody, or non-testimonial evidence are flagged.

### Metadata verification

Each selected authority is recorded with the following fields:

- Exact query string used for retrieval.
- Retrieval date.
- Result count as reported by the search interface.
- Selected case name.
- Citation string or placeholder where verification is pending.
- Court or tribunal.
- IK docid placeholder when the identifier is pending verification.
- Selection rationale.

## 3. Indian Kanoon Query Audit Logs

The following audit table demonstrates representative query logs. Each entry is intended as an auditable research artifact.

| Query string | Retrieval date | Result count | Purpose | Top selected authorities | Citation / Court | IK docids | Selection rationale |
|---|---|---|---|---|---|---|---|
| `"anticipatory bail" Section 438 CrPC economic offence arrest apprehension documents seized` | 2026-05-28 | 192 | Identify authorities for anticipatory bail in alleged economic offence cases with document seizure. | 1) `P. Chidambaram vs Directorate Of Enforcement` 2) `Dr. Subhash Kashinath Mahajan vs The State Of Maharashtra` 3) `Directorate Of Enforcement vs Deepak Mahajan` | Supreme Court / bail jurisprudence | 90251163, 108728085, 1013766 | Selected for direct Supreme Court bail precedent, economic-offence arrest context, and custody/seizure oversight. |
| `"search and seizure" Section 100 CrPC custodial arrest documentary evidence` | 2026-05-28 | 41 | Capture procedural precedent on Section 100 CrPC search and documentary evidence in custody cases. | 1) `Tofan Singh vs The State Of Tamil Nadu` 2) `Noor Aga vs State Of Punjab & Anr` 3) `Mukesh & Anr vs State For NCT Of Delhi & Ors` | Supreme Court / High Court procedural evidence | 143202244, 1584447, 68696327 | Selected for search-and-seizure procedure, custody scrutiny, and high court evidence practice. |
| `"NCLT" notice petition interim relief arbitration clause company` | 2026-05-28 | 743 | Identify corporate and tribunal-related interim relief practice with notice and arbitration references. | 1) `M/S.Archer Power Systems Private ... vs Kohli Ventures Limited` 2) `Dlf Ltd. vs Il&Fs Engineering And Construction ...` 3) `Roger Shashoua & Others vs Mukesh Sharma & Others` | High Court / corporate-relief practice | 163248511, 26386549, 118226873 | Selected for corporate relief language, arbitration reference, and petition structure patterns. |
| `"search and seizure" company documents investigation IBC criminal investigation` | 2026-05-28 | 59 | Capture mixed-domain precedent where criminal search/seizure overlaps corporate and investigation evidence. | 1) `Vijay Madanlal Choudhary vs Union Of India` 2) `Kp Sanghvi And Sons Llp & Anr. vs Directorate Of Enforcement` 3) `Anurag Dalmia, New Delhi vs Dcit, Central Circle-26, New Delhi` | High Court / ITAT / procedural overlap | 14485072, 180528916, 163800463 | Selected to represent evidence procedure across financial investigation, corporate document seizure, and tribunal-adjacent practice. |

Notes:

- Metadata verified manually through Indian Kanoon result pages when available.
- Docid values are derived from the Indian Kanoon result URLs; exact legal citation formatting remains subject to final verification.
- Result counts may vary with indexing freshness and query normalization.
- The audit log is intended as a reviewer-facing provenance record, not a substitute for formal legal validation.

## 4. Court Formatting Research

The court formatting research is documented separately for each jurisdiction. This section records source references and the template design impact.

### Delhi High Court

- Official source: `https://delhihighcourt.nic.in`
- Formatting conventions studied: cause title format, party array, subject line, statement of facts, prayer structure, affidavit exhibits, and listing of counsel.
- Template impact: added court-specific headings, described party blocks, included cause title prefixes, and preserved the subject line and prayer paragraph conventions for High Court petitions.
- Key differences: Delhi High Court templates emphasize cause titles, formal prayer paragraphs, and affidavit references that are more detailed than lower court drafts.

### Sessions Court

- Official source: `https://ecourts.gov.in`
- Formatting conventions studied: case number notation, FIR details in the caption, charge sheet references, lower court stage notation, and judicial officer identification.
- Template impact: included simplified cause titles, FIR and offence disclosure blocks, charge reference fields, and discrete hearing stage language for Sessions Court filings.
- Key differences: Sessions Court templates use shorter cause titles, explicit magistrate references, and localized case numbering conventions.

### NCLT

- Official source: `https://nclt.gov.in`
- Formatting conventions studied: petition title blocks, corporate identity disclosures, authorized representative statements, tribunal numbering, and IBC-specific order language.
- Template impact: incorporated NCLT petition particulars, company and creditor details, itemized relief clauses, and tribunal numbering structure consistent with NCLT orders.
- Key differences: NCLT templates require corporate petition particulars, authorized signatory declarations, and structured relief clauses unlike standard court pleadings.

## 5. Section Mapping Sources

Section mapping is an explicit source of legal normalization in the system.

### Primary references

- `Bharatiya Nyaya Sanhita 2023 Gazette`
- `Bharatiya Nagarik Suraksha Sanhita 2023 Gazette`

### Mapping coverage

- IPC → BNS: offence definitions, penal provisions, and transition mapping from historic IPC sections to the revised Bharatiya Nyaya Sanhita.
- CrPC → BNSS: procedural provisions, arrest and bail rules, trial procedures, and evidence handling mapped to the revised Bharatiya Nagarik Suraksha Sanhita.

### Purpose in the system

- Supports section normalization in generated outputs.
- Enables backward compatibility for older precedent references.
- Maintains legal reference consistency across query, draft, and citation stages.

## 6. Template Sources

The template library is built from source-verified drafting conventions and public court filing structures.

Template source categories:

- Publicly available filings and form examples from court portals.
- Court structure conventions documented by Delhi High Court, Sessions Court, and NCLT.
- Tribunal and petition formatting guidance from the NCLT website.
- Drafting heuristics for headings, fact statements, grounds, and relief clauses.

Clarification:

- Templates are orchestration skeletons for draft structure.
- Templates are not official court-approved forms.
- The system uses templates to guide structure, but the final draft requires legal review and refinement.

## 7. Knowledge Injection Sources

Knowledge nodes are manually curated to supply contextual drafting logic beyond raw precedent retrieval.

Knowledge node categories:

- Constraints: mandatory facts, jurisdictional filters, limitation period checks, and procedural preconditions.
- Drafting heuristics: paragraph sequencing, issue framing, argument prioritization, and prayer formatting.
- Anti-patterns: warnings against overbroad prayers, unsupported factual assertions, and improper jurisdictional claims.
- Procedural strategies: notice windows, interim relief timing, evidence preservation, and petition service strategy.
- Court-specific guidance: jurisdiction norms, preferred relief language, and tribunal practice direction nuances.
- Institutional drafting logic: firm-level language preferences, compliance emphasis, and client-specific risk framing.

Rationale:

- Knowledge injection improves grounded drafting quality by aligning draft output with institutionally vetted legal practice.
- It reduces blind reliance on precedent retrieval alone and supports more consistent structural outcomes.

## 8. Validation & Grounding Controls

This section documents the controls applied to verify and trace the drafting pipeline.

### Metadata verification

- Retrieval metadata is captured for each audit query.
- Selected authorities are logged with citation strings or verification placeholders.
- Docid validation is documented as a pending step using `[VERIFY_DOCID]` placeholders.

### Precedent traceability

- Level 3 generation combines templates, knowledge nodes, and live authority retrieval.
- Each draft is linked to the authority selection rationale and the search query used to obtain the authority.

### Retrieval auditability

- Indian Kanoon queries are recorded with exact search strings.
- Retrieval dates and counts are preserved as audit artifacts.
- Search query logs are intended to be reproducible under the same search conditions.

### Section normalization

- The system normalizes statutory references using IPC→BNS and CrPC→BNSS mappings.
- Normalization is used to keep generated drafts aligned with evolving legal code nomenclature.

### Orchestration transparency

- Draft output at Level 3 is explicitly the product of:
  - template orchestration,
  - institutional knowledge injection,
  - and live authority retrieval.
- Pipeline logs are intended to preserve provenance from query construction to final draft.
- This separation supports audit review of how each component contributes to the final text.

## 9. Limitations

The document identifies current system limitations with an engineering focus.

- Indian Kanoon retrieval is dependent on the external public indexing and search interface.
- Search result completeness is not guaranteed; some precedent authorities may be omitted.
- Manual verification is required for citation accuracy, docid assignment, and authority currency.
- The system is a prototype and should not be used as a standalone legal opinion generator.
- Grounding quality is affected by query precision, knowledge node coverage, and template fit.

## 10. Future Improvements

Planned enhancements for governance and retrieval maturity:

- Semantic retrieval over legal text and issue concepts.
- Vector search for similarity ranking and duplicate detection.
- Legal knowledge graphs connecting statutes, cases, templates, and firm policies.
- Citation verification pipelines to confirm authority metadata and docids.
- Hybrid reranking to combine authority strength, factual overlap, and procedural relevance.
- Automated precedent validation workflows for production-grade audit compliance.
