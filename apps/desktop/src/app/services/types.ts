import type {
  BlockActionInput,
  BlockActionResult,
  BundleSummary,
  ImportJob,
  LoadedBundle,
  ResearchTask,
} from '../../shared/contracts';

export type RuntimeMode = 'native' | 'browser';

export type BundleMetadataUpdate = {
  title?: string | null;
  tags?: string[];
};

export type ReaderScrollSnapshot = {
  blockId: string;
  top: number;
  containerScrollTop: number;
};

export interface BundleService {
  readonly mode: RuntimeMode;
  listBundles(): Promise<BundleSummary[]>;
  loadBundle(bundlePath: string): Promise<LoadedBundle>;
  loadBundleFromFiles(fileList: FileList): Promise<LoadedBundle>;
  renameGroup(groupRelativePath: string, newName: string): Promise<BundleSummary[]>;
  moveBundleToGroup(bundlePath: string, targetGroupRelativePath: string): Promise<BundleSummary[]>;
  updateLibraryMetadata(bundlePath: string, metadata: BundleMetadataUpdate): Promise<BundleSummary>;
  saveBlock(bundlePath: string, blockId: string, markdown: string): Promise<LoadedBundle>;
}

export interface ImportService {
  readonly mode: RuntimeMode;
  startImportFromPicker(kind: 'file' | 'folder'): Promise<ImportJob>;
  listJobs(): Promise<ImportJob[]>;
}

export interface AssetService {
  loadAsset(bundlePath: string, assetPath: string): Promise<string>;
}

export interface NotesService {
  loadNote(bundleId: string): Promise<string>;
  saveNote(bundleId: string, content: string): Promise<string>;
}

export interface ReaderService {
  captureScrollSnapshot(container: HTMLElement | null, blockId: string): ReaderScrollSnapshot | null;
  restoreScrollSnapshot(container: HTMLElement | null, snapshot: ReaderScrollSnapshot | null): boolean;
}

export interface AiTaskService {
  enqueueBlockAction(input: BlockActionInput): Promise<ResearchTask<BlockActionInput, BlockActionResult>>;
  getTask(taskId: string): Promise<ResearchTask<BlockActionInput, BlockActionResult> | null>;
}

export type AppServices = {
  bundleService: BundleService;
  importService: ImportService;
  assetService: AssetService;
  notesService: NotesService;
  readerService: ReaderService;
  aiTaskService: AiTaskService;
};
