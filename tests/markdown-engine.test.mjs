import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnchorIndex } from '../packages/markdown-engine/src/index.mjs';

test('buildAnchorIndex extracts blocks, figures, equations, tables, and citations', () => {
  const markdown = `# Title

<!-- page: 2 -->
Intro paragraph with DOI 10.1000/xyz123.

## Method

![Figure 1](images/fig1.png)

$$
E = mc^2
$$

| a | b |
| - | - |
| 1 | 2 |

See arXiv:2401.01234 for details.
`;

  const index = buildAnchorIndex({
    bundleId: 'bundle_test',
    markdown,
  });

  assert.ok(index.blocks.length >= 5);
  assert.equal(index.figures.length, 1);
  assert.equal(index.equations.length, 1);
  assert.equal(index.tables.length, 1);
  assert.equal(index.citations.length, 2);
  assert.match(index.blocks[0].block_id, /^blk_/);
  assert.match(index.figures[0].figure_id, /^fig_/);
  assert.match(index.equations[0].equation_id, /^eq_/);
});
