import { createResearchTask, hashText } from '../../research-domain/src/index.mjs';

export const RESEARCH_AGENT_ROLES = [
  'scout',
  'conversion',
  'reader',
  'figure',
  'equation',
  'curator',
  'memory',
];

export const TASK_KINDS = [
  'import',
  'convert',
  'repair_bundle',
  'summarize_blocks',
  'extract_figures',
  'extract_equations',
  'build_graph',
  'compare_bundles',
  'write_memory',
];

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
