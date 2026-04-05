import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReaderBlocks } from '../apps/desktop/src/features/reader/model/blocks.ts';

test('buildReaderBlocks keeps reference sequences continuous across adjacent blocks', () => {
  const blocks = [
    {
      block_id: 'blk_ref_heading',
      section_path: ['root', 'references'],
      block_type: 'heading',
      markdown: '## References',
      source_page_start: 1,
      source_page_end: 1,
    },
    {
      block_id: 'blk_ref_1',
      section_path: ['root', 'references'],
      block_type: 'paragraph',
      markdown: '[1] A. Author, Paper title, Phys. Rev. Lett. 120 (2018) 1-8.',
      source_page_start: 1,
      source_page_end: 1,
    },
    {
      block_id: 'blk_ref_2',
      section_path: ['root', 'references'],
      block_type: 'paragraph',
      markdown: '[2] B. Author, Another paper,\n[3] C. Author, Third paper.',
      source_page_start: 1,
      source_page_end: 1,
    },
    {
      block_id: 'blk_ref_3',
      section_path: ['root', 'references'],
      block_type: 'paragraph',
      markdown: 'J. Journal 15 (2020) 99-120. doi:10.1000/example',
      source_page_start: 1,
      source_page_end: 1,
    },
    {
      block_id: 'blk_body',
      section_path: ['root', 'body'],
      block_type: 'heading',
      markdown: '## Appendix',
      source_page_start: 2,
      source_page_end: 2,
    },
  ];

  const readerBlocks = buildReaderBlocks(blocks);
  assert.equal(readerBlocks[1].displayRole, 'reference');
  assert.equal(readerBlocks[2].displayRole, 'reference');
  assert.equal(readerBlocks[3].displayRole, 'reference');
});

test('buildReaderBlocks upgrades html table-like blocks to table display role', () => {
  const blocks = [
    {
      block_id: 'blk_tbl',
      section_path: ['root'],
      block_type: 'paragraph',
      markdown: '<table><tr><td>Level</td><td>Position, ref (eV)</td></tr><tr><td>6s</td><td>-20.738</td></tr></table>',
      source_page_start: 1,
      source_page_end: 1,
    },
  ];

  const readerBlocks = buildReaderBlocks(blocks);
  assert.equal(readerBlocks[0].displayRole, 'table');
});
