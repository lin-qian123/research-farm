import {
  BLOCK_ACTION_TYPES,
  createBlockActionInput,
  createResearchTask,
  hashText,
  TASK_KINDS as DOMAIN_TASK_KINDS,
} from '../../research-domain/src/index.mjs';

export const RESEARCH_AGENT_ROLES = [
  'scout',
  'conversion',
  'reader',
  'figure',
  'equation',
  'curator',
  'memory',
  'library',
  'durable_memory',
];

export const TASK_KINDS = [...DOMAIN_TASK_KINDS];

export function createRuntimeTask({ kind, agentRole, bundleIds = [], projectId = null, input = {} }) {
  return createResearchTask({
    task_id: `task_${hashText(`${kind}:${agentRole}:${bundleIds.join(',')}:${JSON.stringify(input)}`)}`,
    kind,
    agent_role: agentRole,
    bundle_ids: bundleIds,
    project_id: projectId,
    input,
  });
}

export function canRunTasksInParallel(leftTask, rightTask) {
  const writeKinds = new Set(['repair_bundle', 'write_memory']);
  if (leftTask.project_id && rightTask.project_id && leftTask.project_id === rightTask.project_id) {
    if (writeKinds.has(leftTask.kind) || writeKinds.has(rightTask.kind)) {
      return false;
    }
  }
  if (leftTask.bundle_ids.some(id => rightTask.bundle_ids.includes(id))) {
    if (leftTask.kind === 'repair_bundle' || rightTask.kind === 'repair_bundle') {
      return false;
    }
  }
  return true;
}

export function createBlockActionTask({ bundleId, blockId, actionType, selection = null, projectId = null }) {
  const input = createBlockActionInput({
    bundle_id: bundleId,
    block_id: blockId,
    action_type: actionType,
    selection,
  });

  return createRuntimeTask({
    kind: 'block_action',
    agentRole: 'reader',
    bundleIds: [bundleId],
    projectId,
    input,
  });
}

export function createArticleOutlineTask({ bundleId, projectId = null, outlineTitle = null }) {
  return createRuntimeTask({
    kind: 'article_outline',
    agentRole: 'memory',
    bundleIds: [bundleId],
    projectId,
    input: {
      bundle_id: bundleId,
      outline_title: outlineTitle,
    },
  });
}

export function createLibrarySynthesisTask({ bundleIds, projectId = null, scopeId = null }) {
  return createRuntimeTask({
    kind: 'library_synthesis',
    agentRole: 'library',
    bundleIds,
    projectId,
    input: {
      scope_id: scopeId,
      bundle_ids: bundleIds,
    },
  });
}

export function createPersistentMemoryTask({ projectId = null, sourceMemoryIds = [] }) {
  return createRuntimeTask({
    kind: 'persistent_memory',
    agentRole: 'durable_memory',
    bundleIds: [],
    projectId,
    input: {
      source_memory_ids: sourceMemoryIds,
    },
  });
}

export function getSupportedBlockActionTypes() {
  return [...BLOCK_ACTION_TYPES];
}

export function createEvidenceSearchQuery({ bundleId, blockId = null, query }) {
  return {
    bundle_id: bundleId,
    block_id: blockId,
    query,
  };
}

export function buildTaskNotification({ task, status, summary, result = null }) {
  const escapedSummary = String(summary).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const resultText = result ? `<result>${JSON.stringify(result)}</result>` : '';
  return `<task-notification>
<task-id>${task.task_id}</task-id>
<status>${status}</status>
<summary>${escapedSummary}</summary>
${resultText}
</task-notification>`;
}
