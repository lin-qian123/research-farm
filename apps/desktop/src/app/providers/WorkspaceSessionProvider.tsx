import { createContext, startTransition, useContext, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { PropsWithChildren, RefObject } from 'react';
import { DEMO_BUNDLE, DEMO_BUNDLES } from '../../lib/demoBundle';
import { useAppServices } from './AppServicesProvider';
import {
  buildReaderBlocks,
  buildTocEntries,
  bundleLabel,
  displaySectionPath,
  firstVisibleBlockId,
  roleLabel,
} from '../../features/reader/model/blocks';
import type { ReaderBlock, TocEntry } from '../../features/reader/model/blocks';
import type { BundleSummary, ImportJob, LoadedBundle } from '../../shared/contracts';
import type { ReaderScrollSnapshot } from '../services/types';
import { collectAncestorGroupPaths } from '../../shared/lib/libraryTree';

export type InteractionMode = 'translate' | 'chat' | 'note' | null;

type WorkspaceSessionValue = {
  isNative: boolean;
  bundles: BundleSummary[];
  bundle: LoadedBundle;
  readerBlocks: ReaderBlock[];
  filteredBlocks: ReaderBlock[];
  tocEntries: TocEntry[];
  selectedBlock: ReaderBlock | null;
  selectedBlockId: string;
  searchText: string;
  deferredSearchText: string;
  bundleTitle: string;
  visibleBlockCount: number;
  message: string;
  importJobs: ImportJob[];
  interactionMode: InteractionMode;
  editingBlockId: string | null;
  editingBlockValue: string;
  scrollTargetBlockId: string | null;
  activeBundlePath: string | null;
  activeRelativePath: string | null;
  expandedGroups: Set<string>;
  readerBodyRef: RefObject<HTMLElement | null>;
  setSearchText: (value: string) => void;
  setMessage: (value: string) => void;
  setInteractionMode: (value: InteractionMode) => void;
  toggleGroup: (groupPath: string) => void;
  selectBlockId: (blockId: string) => void;
  navigateToBlockId: (blockId: string) => void;
  clearScrollTarget: () => void;
  openBundle: (summary: BundleSummary) => Promise<void>;
  openBundleFolder: (files: FileList) => Promise<void>;
  startImport: (kind: 'file' | 'folder') => Promise<void>;
  renameGroup: (groupPath: string, nextName: string) => Promise<void>;
  setBundleTags: (summary: BundleSummary, nextValue: string) => Promise<void>;
  moveBundle: (summary: BundleSummary, targetGroupPath: string) => Promise<void>;
  startInlineEdit: (block: ReaderBlock) => void;
  cancelInlineEdit: () => void;
  setEditingBlockValue: (value: string) => void;
  submitEditBlock: (blockId: string, nextMarkdown: string) => Promise<void>;
  copyBlockMarkdown: (block: ReaderBlock) => Promise<void>;
  roleLabel: typeof roleLabel;
  displaySectionPath: typeof displaySectionPath;
  bundleLabel: typeof bundleLabel;
};

const WorkspaceSessionContext = createContext<WorkspaceSessionValue | null>(null);

function getConciseError(error: unknown, fallback = '操作失败') {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.split('\n').find(line => line.trim()) || fallback;
}

function importJobsSignature(jobs: ImportJob[]) {
  return JSON.stringify(
    jobs.map(job => ({
      id: job.id,
      status: job.status,
      totalFiles: job.totalFiles,
      completedFiles: job.completedFiles,
      failedFiles: job.failedFiles,
      currentFile: job.currentFile || null,
      message: job.message || null,
      items: job.items.map(item => ({
        sourcePath: item.sourcePath,
        status: item.status,
        message: item.message || null,
        bundleDir: item.bundleDir || null,
      })),
    })),
  );
}

export function WorkspaceSessionProvider({ children }: PropsWithChildren) {
  const services = useAppServices();
  const isNative = services.bundleService.mode === 'native';
  const [bundles, setBundles] = useState<BundleSummary[]>(DEMO_BUNDLES);
  const [bundle, setBundle] = useState<LoadedBundle>(DEMO_BUNDLE);
  const [selectedBlockId, setSelectedBlockId] = useState(() => firstVisibleBlockId(buildReaderBlocks(DEMO_BUNDLE.blocks)));
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const [message, setMessage] = useState('已加载演示文档');
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingBlockValue, setEditingBlockValue] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [scrollTargetBlockId, setScrollTargetBlockId] = useState<string | null>(null);
  const readerBodyRef = useRef<HTMLElement | null>(null);
  const pendingScrollRestoreRef = useRef<ReaderScrollSnapshot | null>(null);
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const seenImportStatuses = useRef<Record<string, string>>({});
  const importJobsSignatureRef = useRef('');

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;

    async function bootstrap() {
      try {
        const nextBundles = await services.bundleService.listBundles();
        if (!cancelled && nextBundles.length > 0) {
          setBundles(nextBundles);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(getConciseError(error));
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isNative, services.bundleService]);

  useEffect(() => {
    const snapshot = pendingScrollRestoreRef.current;
    if (!snapshot) return;
    const container = readerBodyRef.current;
    if (!container) return;
    let attempts = 0;
    let frame = 0;

    const restore = () => {
      const restored = services.readerService.restoreScrollSnapshot(container, snapshot);
      if (restored || attempts >= 8) {
        pendingScrollRestoreRef.current = null;
        return;
      }
      attempts += 1;
      frame = window.requestAnimationFrame(restore);
    };

    frame = window.requestAnimationFrame(restore);
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [bundle.paperMarkdown, selectedBlockId, services.readerService]);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;

    async function poll() {
      try {
        const jobs = await services.importService.listJobs();
        if (cancelled) return;
        const nextSignature = importJobsSignature(jobs);
        if (nextSignature !== importJobsSignatureRef.current) {
          importJobsSignatureRef.current = nextSignature;
          setImportJobs(jobs);
        }

        let shouldRefreshBundles = false;
        for (const job of jobs) {
          const previous = seenImportStatuses.current[job.id];
          if (previous && previous !== job.status && ['completed', 'partial', 'failed'].includes(job.status)) {
            shouldRefreshBundles = true;
          }
          seenImportStatuses.current[job.id] = job.status;
        }

        if (shouldRefreshBundles) {
          const nextBundles = await services.bundleService.listBundles();
          if (!cancelled && nextBundles.length > 0) {
            setBundles(nextBundles);
          }
        }
      } catch {
        // best-effort polling
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isNative, services.bundleService, services.importService]);

  const readerBlocks = useMemo(() => buildReaderBlocks(bundle.blocks), [bundle.blocks]);
  const filteredBlocks = useMemo(() => {
    const query = deferredSearchText.trim().toLowerCase();
    const visibleBlocks = readerBlocks.filter(block => !block.hidden);
    if (!query) return visibleBlocks;
    return visibleBlocks.filter(block => {
      const haystack = `${block.section_path.join(' ')} ${block.markdown} ${block.block_type}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [deferredSearchText, readerBlocks]);
  const selectedBlock = useMemo(
    () => filteredBlocks.find(block => block.block_id === selectedBlockId) || filteredBlocks[0] || null,
    [filteredBlocks, selectedBlockId],
  );
  const tocEntries = useMemo(() => buildTocEntries(readerBlocks), [readerBlocks]);
  const visibleBlockCount = useMemo(() => readerBlocks.filter(block => !block.hidden).length, [readerBlocks]);
  const readerBlocksById = useMemo(() => new Map(readerBlocks.map(block => [block.block_id, block])), [readerBlocks]);
  const bundleTitle = useMemo(() => {
    const firstHeading = readerBlocks.find(block => block.displayRole === 'heading');
    return firstHeading ? firstHeading.markdown.replace(/^#+\s*/, '') : bundle.manifest.title || '还没有可阅读的 bundle';
  }, [bundle.manifest.title, readerBlocks]);

  const activeBundlePath = bundle.bundlePath || null;
  const activeRelativePath = useMemo(
    () => bundles.find(item => item.path === activeBundlePath)?.relativePath || null,
    [activeBundlePath, bundles],
  );

  useEffect(() => {
    if (!activeRelativePath) return;
    const ancestorPaths = collectAncestorGroupPaths(activeRelativePath);
    if (ancestorPaths.length === 0) return;
    setExpandedGroups(current => {
      const next = new Set(current);
      let changed = false;
      for (const path of ancestorPaths) {
        if (!next.has(path)) {
          next.add(path);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [activeRelativePath]);

  function reconcileCurrentBundlePath(nextBundles: BundleSummary[]) {
    const currentBundleId = bundle.manifest.bundle_id;
    if (!currentBundleId) return;
    const relocated = nextBundles.find(item => item.bundleId === currentBundleId);
    if (!relocated) return;
    if (relocated.path === bundle.bundlePath && relocated.title === bundle.manifest.title) return;
    setBundle(current => ({
      ...current,
      bundlePath: relocated.path,
      manifest: {
        ...current.manifest,
        title: relocated.title,
      },
    }));
  }

  async function openBundle(summary: BundleSummary) {
    if (summary.path.startsWith('demo://')) {
      const nextSelectedBlockId = firstVisibleBlockId(buildReaderBlocks(DEMO_BUNDLE.blocks));
      startTransition(() => {
        setBundle(DEMO_BUNDLE);
        setSelectedBlockId(nextSelectedBlockId);
        setScrollTargetBlockId(null);
        setEditingBlockId(null);
        setEditingBlockValue('');
      });
      setMessage('已加载演示文档');
      return;
    }

    const nextBundle = await services.bundleService.loadBundle(summary.path);
    const nextSelectedBlockId = firstVisibleBlockId(buildReaderBlocks(nextBundle.blocks));
    startTransition(() => {
      setBundle(nextBundle);
      setSelectedBlockId(nextSelectedBlockId);
      setScrollTargetBlockId(null);
      setEditingBlockId(null);
      setEditingBlockValue('');
    });
    setMessage(`已加载 ${summary.title || summary.bundleId}`);
  }

  async function openBundleFolder(files: FileList) {
    const nextBundle = await services.bundleService.loadBundleFromFiles(files);
    const nextSelectedBlockId = firstVisibleBlockId(buildReaderBlocks(nextBundle.blocks));
    startTransition(() => {
      setBundle(nextBundle);
      setSelectedBlockId(nextSelectedBlockId);
      setScrollTargetBlockId(null);
      setEditingBlockId(null);
      setEditingBlockValue('');
    });
    setMessage('已加载现有 bundle 文件夹');
  }

  async function startImport(kind: 'file' | 'folder') {
    try {
      const job = await services.importService.startImportFromPicker(kind);
      setImportJobs(current => [job, ...current.filter(item => item.id !== job.id)]);
      seenImportStatuses.current[job.id] = job.status;
      setMessage('导入任务已启动');
    } catch (error) {
      const concise = getConciseError(error, '导入任务启动失败');
      setMessage(concise);
    }
  }

  function navigateToBlockId(blockId: string) {
    if (!readerBlocksById.has(blockId)) return;
    if (!filteredBlocks.some(block => block.block_id === blockId)) {
      setSearchText('');
    }
    setSelectedBlockId(blockId);
    setScrollTargetBlockId(blockId);
  }

  function selectBlockId(blockId: string) {
    if (!readerBlocksById.has(blockId)) return;
    setSelectedBlockId(blockId);
  }

  function toggleGroup(groupPath: string) {
    setExpandedGroups(current => {
      const next = new Set(current);
      if (next.has(groupPath)) {
        next.delete(groupPath);
      } else {
        next.add(groupPath);
      }
      return next;
    });
  }

  async function renameGroup(groupPath: string, nextName: string) {
    if (!nextName.trim()) return;
    const nextBundles = await services.bundleService.renameGroup(groupPath, nextName);
    setBundles(nextBundles);
    reconcileCurrentBundlePath(nextBundles);
    const parentPath = groupPath.split('/').slice(0, -1).filter(Boolean).join('/');
    const nextGroupPath = parentPath ? `${parentPath}/${nextName.trim()}` : nextName.trim();
    setExpandedGroups(current => {
      const next = new Set(current);
      next.delete(groupPath);
      next.add(nextGroupPath);
      return next;
    });
    setMessage(`已重命名文件夹为 ${nextName.trim()}`);
  }

  async function setBundleTags(summary: BundleSummary, nextValue: string) {
    const tags = nextValue.split(',').map(item => item.trim()).filter(Boolean);
    const updated = await services.bundleService.updateLibraryMetadata(summary.path, { tags });
    setBundles(current => current.map(item => (item.path === summary.path ? updated : item)));
    setMessage(tags.length > 0 ? `已设置 ${tags.length} 个标签` : '已清空标签');
  }

  async function moveBundle(summary: BundleSummary, targetGroupPath: string) {
    const nextBundles = await services.bundleService.moveBundleToGroup(summary.path, targetGroupPath);
    setBundles(nextBundles);
    reconcileCurrentBundlePath(nextBundles);
    const nextAncestors = collectAncestorGroupPaths(
      nextBundles.find(item => item.bundleId === summary.bundleId)?.relativePath || targetGroupPath,
    );
    setExpandedGroups(current => {
      const next = new Set(current);
      for (const path of nextAncestors) next.add(path);
      return next;
    });
    setMessage(`已移动 ${bundleLabel(summary)}`);
  }

  function startInlineEdit(block: ReaderBlock) {
    setEditingBlockId(block.block_id);
    setEditingBlockValue(block.markdown);
  }

  function cancelInlineEdit() {
    setEditingBlockId(null);
    setEditingBlockValue('');
  }

  async function submitEditBlock(blockId: string, nextMarkdown: string) {
    const nextValue = nextMarkdown.replace(/\r\n/g, '\n');
    const targetBundlePath = bundle.bundlePath;
    setBundle(current => ({
      ...current,
      blocks: current.blocks.map(block => (block.block_id === blockId ? { ...block, markdown: nextValue } : block)),
    }));
    setEditingBlockId(null);
    setEditingBlockValue('');

    if (!targetBundlePath || !isNative) {
      setMessage('已更新当前区块内容');
      return;
    }

    pendingScrollRestoreRef.current = services.readerService.captureScrollSnapshot(readerBodyRef.current, blockId);
    setMessage('正在保存到源 Markdown 文件...');

    saveChainRef.current = saveChainRef.current
      .catch(() => {})
      .then(async () => {
        try {
          const nextBundle = await services.bundleService.saveBlock(targetBundlePath, blockId, nextValue);
          setBundle(nextBundle);
          setMessage('已保存到源 Markdown 文件');
        } catch (error) {
          pendingScrollRestoreRef.current = null;
          setMessage(getConciseError(error));
        }
      });

    await saveChainRef.current;
  }

  async function copyBlockMarkdown(block: ReaderBlock) {
    try {
      await navigator.clipboard.writeText(block.markdown);
      setMessage('已复制当前区块内容');
    } catch {
      setMessage('复制失败');
    }
  }

  const value = useMemo<WorkspaceSessionValue>(() => ({
    isNative,
    bundles,
    bundle,
    readerBlocks,
    filteredBlocks,
    tocEntries,
    selectedBlock,
    selectedBlockId,
    searchText,
    deferredSearchText,
    bundleTitle,
    visibleBlockCount,
    message,
    importJobs,
    interactionMode,
    editingBlockId,
    editingBlockValue,
    scrollTargetBlockId,
    activeBundlePath,
    activeRelativePath,
    expandedGroups,
    readerBodyRef,
    setSearchText,
    setMessage,
    setInteractionMode,
    toggleGroup,
    selectBlockId,
    navigateToBlockId,
    clearScrollTarget: () => setScrollTargetBlockId(null),
    openBundle,
    openBundleFolder,
    startImport,
    renameGroup,
    setBundleTags,
    moveBundle,
    startInlineEdit,
    cancelInlineEdit,
    setEditingBlockValue,
    submitEditBlock,
    copyBlockMarkdown,
    roleLabel,
    displaySectionPath,
    bundleLabel,
  }), [
    isNative,
    bundles,
    bundle,
    readerBlocks,
    filteredBlocks,
    tocEntries,
    selectedBlock,
    selectedBlockId,
    searchText,
    deferredSearchText,
    bundleTitle,
    visibleBlockCount,
    message,
    importJobs,
    interactionMode,
    editingBlockId,
    editingBlockValue,
    scrollTargetBlockId,
    activeBundlePath,
    activeRelativePath,
    expandedGroups,
  ]);

  return <WorkspaceSessionContext.Provider value={value}>{children}</WorkspaceSessionContext.Provider>;
}

export function useWorkspaceSession() {
  const context = useContext(WorkspaceSessionContext);
  if (!context) {
    throw new Error('useWorkspaceSession must be used within WorkspaceSessionProvider');
  }
  return context;
}
