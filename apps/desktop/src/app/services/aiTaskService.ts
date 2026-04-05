import type {
  BlockActionInput,
  BlockActionResult,
  ResearchTask,
} from '../../shared/contracts';
import type { AiTaskService } from './types';

const tasks = new Map<string, ResearchTask<BlockActionInput, BlockActionResult>>();

function now() {
  return new Date().toISOString();
}

function makeTaskId(input: BlockActionInput) {
  return `ai_${input.actionType}_${input.bundleId}_${input.blockId}_${Date.now()}`;
}

export function createAiTaskService(): AiTaskService {
  return {
    async enqueueBlockAction(input) {
      const timestamp = now();
      const task: ResearchTask<BlockActionInput, BlockActionResult> = {
        taskId: makeTaskId(input),
        kind: 'block_action',
        status: 'completed',
        input,
        result: {
          blockId: input.blockId,
          markdown: '',
          summary: null,
          translation: null,
          explanation: null,
          evidenceRefs: [{ bundleId: input.bundleId, blockId: input.blockId }],
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      tasks.set(task.taskId, task);
      return task;
    },
    async getTask(taskId) {
      return tasks.get(taskId) || null;
    },
  };
}
