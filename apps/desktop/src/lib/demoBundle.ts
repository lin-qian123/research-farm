import type { LoadedBundle } from './types';

export const DEMO_BUNDLE: LoadedBundle = {
  manifest: {
    title: 'Demo Bundle: Local-first Research Runtime',
    bundle_id: 'bundle_demo',
    quality_score: 0.91,
    conversion_status: 'completed',
    block_count: 6,
    figure_count: 1,
    equation_count: 1,
    table_count: 1,
    citation_count: 2,
    quality_flags: [],
  },
  blocks: [
    {
      block_id: 'blk_demo_1',
      section_path: ['title'],
      block_type: 'heading',
      markdown: '# Research Farm',
      source_page_start: 1,
      source_page_end: 1,
    },
    {
      block_id: 'blk_demo_2',
      section_path: ['title'],
      block_type: 'paragraph',
      markdown:
        'Research Farm treats Markdown as the canonical representation for scientific papers so agents can reason over stable paragraph blocks and evidence refs.',
      source_page_start: 1,
      source_page_end: 1,
    },
    {
      block_id: 'blk_demo_3',
      section_path: ['reader'],
      block_type: 'heading',
      markdown: '## Reader',
      source_page_start: 2,
      source_page_end: 2,
    },
    {
      block_id: 'blk_demo_4',
      section_path: ['reader'],
      block_type: 'paragraph',
      markdown:
        'The first desktop release focuses on loading local paper bundles, exploring block indexes, and exposing figures, equations, tables, and citations for later agents.',
      source_page_start: 2,
      source_page_end: 2,
    },
    {
      block_id: 'blk_demo_5',
      section_path: ['reader', 'equation'],
      block_type: 'equation',
      markdown: '$$\nquality = evidence * structure\n$$',
      source_page_start: 2,
      source_page_end: 2,
    },
    {
      block_id: 'blk_demo_6',
      section_path: ['reader', 'references'],
      block_type: 'paragraph',
      markdown: 'The ingest layer already extracts DOI 10.1000/demo123 and arXiv:2401.01234 anchors for follow-up tasks.',
      source_page_start: 3,
      source_page_end: 3,
    },
  ],
  equations: [{ equation_id: 'eq_demo_1', latex: 'quality = evidence * structure', block_id: 'blk_demo_5' }],
  tables: [
    {
      table_id: 'tbl_demo_1',
      block_id: 'blk_demo_4',
      markdown: '| layer | status |\n| - | - |\n| bundle ingest | live |\n| reader UI | live |\n| graph memory | planned |',
    },
  ],
  citations: [
    { citation_id: 'cit_demo_1', block_id: 'blk_demo_6', kind: 'doi', value: '10.1000/demo123' },
    { citation_id: 'cit_demo_2', block_id: 'blk_demo_6', kind: 'arxiv', value: '2401.01234' },
  ],
  contentList: null,
  paperMarkdown: `# Research Farm

Research Farm treats Markdown as the canonical representation for scientific papers so agents can reason over stable paragraph blocks and evidence refs.

## Reader

The first desktop release focuses on loading local paper bundles, exploring block indexes, and exposing figures, equations, tables, and citations for later agents.

$$
quality = evidence * structure
$$

The ingest layer already extracts DOI 10.1000/demo123 and arXiv:2401.01234 anchors for follow-up tasks.`,
};

export const DEMO_BUNDLES = [
  {
    title: DEMO_BUNDLE.manifest.title,
    bundleId: DEMO_BUNDLE.manifest.bundle_id,
    path: 'demo://bundle_demo',
    relativePath: 'demo/bundle_demo',
    qualityScore: DEMO_BUNDLE.manifest.quality_score,
    conversionStatus: DEMO_BUNDLE.manifest.conversion_status,
    updatedAt: null,
  },
];
