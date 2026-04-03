import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { indexPaperBundle } from '../packages/paper-ingest/src/index.mjs';

test('indexPaperBundle writes canonical manifest and index files', async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'paper-bundle-'));
  const bundleDir = path.join(tempRoot, 'sample-paper');
  const imagesDir = path.join(bundleDir, 'images');

  await fs.mkdir(imagesDir, { recursive: true });
  await fs.writeFile(
    path.join(bundleDir, 'paper.md'),
    `# Sample Paper

Intro paragraph.

## Figure

![Alt](images/figure.png)

$$
x = y + z
$$
`,
    'utf8',
  );
  await fs.writeFile(path.join(imagesDir, 'figure.png'), 'placeholder', 'utf8');

  const result = await indexPaperBundle({
    bundleDir,
  });

  assert.equal(result.manifest.source_type, 'markdown');
  assert.equal(result.manifest.figure_count, 1);
  assert.equal(result.manifest.equation_count, 1);

  const manifestText = await fs.readFile(path.join(bundleDir, 'manifest.json'), 'utf8');
  const anchorsText = await fs.readFile(path.join(bundleDir, 'anchors.json'), 'utf8');
  const equationsText = await fs.readFile(path.join(bundleDir, 'equations.json'), 'utf8');
  const citationsText = await fs.readFile(path.join(bundleDir, 'citations.json'), 'utf8');

  assert.match(manifestText, /"bundle_id":\s*"bundle_/);
  assert.match(anchorsText, /"blocks":/);
  assert.match(equationsText, /"equations":/);
  assert.match(citationsText, /"citations":/);
});
