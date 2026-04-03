import { createHash } from 'node:crypto';

export const SOURCE_TYPES = ['pdf', 'markdown', 'html', 'epub'];
export const CONVERSION_STATUSES = ['pending', 'completed', 'failed', 'needs_review'];
export const MEMORY_SCOPES = ['session', 'project', 'team', 'long_term'];
export const TASK_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'];

export function hashText(value, length = 12) {
  return createHash('sha1').update(value).digest('hex').slice(0, length);
}

export function createPaperBundleRecord(input) {
  const createdAt = input.created_at || new Date().toISOString();
  return {
    bundle_id: input.bundle_id,
    source_type: input.source_type,
    source_path: input.source_path,
    source_checksum: input.source_checksum,
    pdf_path: input.pdf_path || null,
    markdown_path: input.markdown_path,
    manifest_path: input.manifest_path,
    asset_root: input.asset_root,
    parser: input.parser || 'mineru',
    parser_version: input.parser_version || 'unknown',
    conversion_status: input.conversion_status || 'completed',
    quality_score: typeof input.quality_score === 'number' ? input.quality_score : 0,
    created_at: createdAt,
    title: input.title || null,
    block_count: input.block_count || 0,
    figure_count: input.figure_count || 0,
    equation_count: input.equation_count || 0,
    table_count: input.table_count || 0,
    citation_count: input.citation_count || 0,
    quality_flags: input.quality_flags || [],
  };
}

export function createResearchTask(input) {
  return {
    task_id: input.task_id,
    kind: input.kind,
    agent_role: input.agent_role,
    bundle_ids: input.bundle_ids || [],
    project_id: input.project_id || null,
    status: input.status || 'pending',
    created_at: input.created_at || new Date().toISOString(),
    input: input.input || {},
    result: input.result || null,
  };
}

export function createResearchMemory(input) {
  return {
    memory_id: input.memory_id,
    scope: input.scope,
    project_id: input.project_id || null,
    title: input.title,
    summary: input.summary,
    evidence_refs: input.evidence_refs || [],
    created_at: input.created_at || new Date().toISOString(),
    updated_at: input.updated_at || new Date().toISOString(),
    confidence: input.confidence ?? null,
    tags: input.tags || [],
  };
}
