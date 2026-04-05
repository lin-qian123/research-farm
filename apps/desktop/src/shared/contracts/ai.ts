export type BlockActionType = 'translate' | 'summarize' | 'explain' | 'rewrite' | 'correct';

export type EvidenceRef = {
  bundleId: string;
  blockId: string;
  quote?: string | null;
};

export type BlockActionInput = {
  bundleId: string;
  blockId: string;
  actionType: BlockActionType;
  selection?: string | null;
};

export type BlockActionResult = {
  blockId: string;
  markdown: string;
  summary?: string | null;
  translation?: string | null;
  explanation?: string | null;
  evidenceRefs: EvidenceRef[];
};

export type ArticleOutlineSection = {
  title: string;
  blockIds: string[];
  summary: string;
  evidenceRefs: EvidenceRef[];
};

export type ArticleOutline = {
  bundleId: string;
  sections: ArticleOutlineSection[];
};

export type MemoryScope = 'article' | 'library' | 'long_term';

export type MemoryDocument = {
  memoryId: string;
  scope: MemoryScope;
  title: string;
  summary: string;
  linkedBundleIds: string[];
  evidenceRefs: EvidenceRef[];
};

export type ResearchTaskKind =
  | 'block_action'
  | 'article_outline'
  | 'library_synthesis'
  | 'persistent_memory';

export type ResearchTaskStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed';

export type ResearchTask<TInput = unknown, TResult = unknown> = {
  taskId: string;
  kind: ResearchTaskKind;
  status: ResearchTaskStatus;
  input: TInput;
  result?: TResult | null;
  createdAt: string;
  updatedAt: string;
};
