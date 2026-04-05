import {
  createArticleOutline,
  createMemoryDocument,
  createResearchMemory,
  hashText,
  MEMORY_SCOPES,
} from '../../research-domain/src/index.mjs';

export function ensureEvidenceBackedMemory(input) {
  if ((input.scope === 'project' || input.scope === 'team' || input.scope === 'long_term') && (!input.evidence_refs || input.evidence_refs.length === 0)) {
    throw new Error(`Durable memory in scope "${input.scope}" requires at least one evidence ref`);
  }
  return createResearchMemory({
    memory_id: input.memory_id || `mem_${hashText(`${input.scope}:${input.title}:${input.summary}`)}`,
    scope: input.scope,
    project_id: input.project_id || null,
    title: input.title,
    summary: input.summary,
    evidence_refs: input.evidence_refs || [],
    confidence: input.confidence ?? null,
    tags: input.tags || [],
  });
}

export function getAllowedMemoryScopes() {
  return [...MEMORY_SCOPES];
}

export function createArticleOutlineMemory(input) {
  return createArticleOutline({
    scope: 'article',
    bundle_id: input.bundle_id,
    title: input.title,
    sections: input.sections || [],
    evidence_refs: input.evidence_refs || [],
  });
}

export function createLibraryMemoryDocument(input) {
  if (!input.evidence_refs || input.evidence_refs.length === 0) {
    throw new Error('Library memory requires evidence refs');
  }
  return createMemoryDocument({
    scope: 'library',
    title: input.title,
    summary: input.summary,
    linked_bundle_ids: input.linked_bundle_ids || [],
    evidence_refs: input.evidence_refs,
  });
}

export function createLongTermMemoryDocument(input) {
  if (!input.evidence_refs || input.evidence_refs.length === 0) {
    throw new Error('Long-term memory requires evidence refs');
  }
  return createMemoryDocument({
    scope: 'long_term',
    title: input.title,
    summary: input.summary,
    linked_bundle_ids: input.linked_bundle_ids || [],
    evidence_refs: input.evidence_refs,
  });
}
