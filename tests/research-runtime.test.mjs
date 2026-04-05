import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBlockActionTask,
  createArticleOutlineTask,
  getSupportedBlockActionTypes,
} from '../packages/agent-core/src/index.mjs';
import {
  createArticleOutlineMemory,
  createLibraryMemoryDocument,
  createLongTermMemoryDocument,
} from '../packages/research-memory/src/index.mjs';

test('agent runtime creates block action task with bundle-scoped input', () => {
  const task = createBlockActionTask({
    bundleId: 'bundle_a',
    blockId: 'blk_1',
    actionType: 'translate',
  });

  assert.equal(task.kind, 'block_action');
  assert.equal(task.agent_role, 'reader');
  assert.deepEqual(task.bundle_ids, ['bundle_a']);
  assert.equal(task.input.block_id, 'blk_1');
  assert.equal(task.input.action_type, 'translate');
  assert.ok(getSupportedBlockActionTypes().includes('translate'));
});

test('memory helpers build article and durable memory contracts', () => {
  const articleOutline = createArticleOutlineMemory({
    bundle_id: 'bundle_a',
    title: 'Paper skeleton',
    sections: [{ title: 'Intro', block_ids: ['blk_1'], summary: 'Summary', evidence_refs: [] }],
    evidence_refs: [{ bundle_id: 'bundle_a', block_id: 'blk_1' }],
  });
  assert.equal(articleOutline.scope, 'article');
  assert.equal(articleOutline.bundle_id, 'bundle_a');

  const libraryMemory = createLibraryMemoryDocument({
    title: 'Library synthesis',
    summary: 'Cross-paper summary',
    linked_bundle_ids: ['bundle_a', 'bundle_b'],
    evidence_refs: [{ bundle_id: 'bundle_a', block_id: 'blk_1' }],
  });
  assert.equal(libraryMemory.scope, 'library');

  const longTermMemory = createLongTermMemoryDocument({
    title: 'Long-term memory',
    summary: 'Stable insight',
    linked_bundle_ids: ['bundle_a'],
    evidence_refs: [{ bundle_id: 'bundle_a', block_id: 'blk_1' }],
  });
  assert.equal(longTermMemory.scope, 'long_term');

  assert.throws(() =>
    createLibraryMemoryDocument({
      title: 'Missing evidence',
      summary: 'No refs',
      linked_bundle_ids: [],
      evidence_refs: [],
    }),
  );
});

test('article outline task uses memory role', () => {
  const task = createArticleOutlineTask({
    bundleId: 'bundle_a',
    outlineTitle: 'Readable outline',
  });

  assert.equal(task.kind, 'article_outline');
  assert.equal(task.agent_role, 'memory');
  assert.equal(task.input.outline_title, 'Readable outline');
});
