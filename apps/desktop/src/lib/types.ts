export type BundleManifest = {
  title: string | null;
  bundle_id: string;
  quality_score: number;
  conversion_status: string;
  block_count: number;
  figure_count: number;
  equation_count: number;
  table_count: number;
  citation_count: number;
  quality_flags?: string[];
};

export type BlockRecord = {
  block_id: string;
  section_path: string[];
  block_type: string;
  markdown: string;
  source_page_start: number;
  source_page_end: number;
};

export type EquationRecord = {
  equation_id: string;
  latex: string;
  block_id: string;
};

export type TableRecord = {
  table_id: string;
  block_id: string;
  markdown: string;
};

export type CitationRecord = {
  citation_id: string;
  block_id: string;
  kind: string;
  value: string;
};

export type ContentListRecord = {
  type: string;
  text?: string;
  text_level?: number;
  img_path?: string;
  page_idx?: number;
  image_caption?: string[];
  image_footnote?: string[];
  table_caption?: string[];
  table_footnote?: string[];
};

export type LoadedBundle = {
  manifest: BundleManifest;
  blocks: BlockRecord[];
  equations: EquationRecord[];
  tables: TableRecord[];
  citations: CitationRecord[];
  contentList?: ContentListRecord[] | null;
  paperMarkdown: string;
  bundlePath?: string | null;
  notesPath?: string | null;
  assetUrls?: Record<string, string>;
};

export type BundleSummary = {
  title: string | null;
  bundleId: string;
  path: string;
  relativePath: string;
  qualityScore: number;
  conversionStatus: string;
  updatedAt: string | null;
};
