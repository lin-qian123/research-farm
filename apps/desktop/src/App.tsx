import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import { DEMO_BUNDLE, DEMO_BUNDLES } from './lib/demoBundle';
import {
  chooseNativePdfDirectory,
  chooseNativePdfFile,
  importNativePdfSource,
  isTauriRuntime,
  loadNativeAsset,
  listNativeBundles,
  loadNativeBundle,
} from './lib/runtime';
import type { BlockRecord, BundleSummary, LoadedBundle } from './lib/types';

type ReaderTheme = 'paper' | 'journal' | 'slate';
type InteractionMode = 'translate' | 'chat' | 'note' | null;
type DisplayRole = 'heading' | 'figure' | 'equation' | 'table' | 'caption' | 'reference' | 'metadata' | 'paragraph';
type TreeNode = {
  groups: Map<string, TreeNode>;
  bundles: BundleSummary[];
};
type ReaderBlock = BlockRecord & {
  displayRole: DisplayRole;
  hidden: boolean;
};

const UI = {
  brand: 'Research Farm',
  title: 'Markdown Reader',
  subtitle: '先把阅读体验做好，再接段落翻译和 AI 对话。',
  nativeMode: '原生桌面模式',
  browserMode: '浏览器预览模式',
  importPdfFile: '导入 PDF 文件',
  importPdfFolder: '导入 PDF 文件夹',
  openBundleFolder: '打开现有 bundle 文件夹',
  loadDemo: '加载演示文档',
  nativeRequired: 'PDF 导入需要原生桌面模式，请运行 npm run desktop:native:dev',
  importing: '正在导入...',
  imported: '导入完成',
  importCancelled: '已取消导入',
  library: '资料库',
  outline: '目录',
  reader: '阅读器',
  paragraphTools: '段落交互',
  searchPlaceholder: '搜索标题、段落、公式、引用...',
  noBundles: '还没有可阅读的 bundle',
  noBundlesHint: '先导入 PDF，或加载演示文档。',
  noHeadings: '当前文档还没有可用目录',
  noBlock: '请选择一个段落或标题',
  docStats: '文档信息',
  blockType: '区块类型',
  page: '页码',
  blockId: '区块 ID',
  conversion: '转换状态',
  quality: '质量分',
  blocks: '段落数',
  selected: '当前段落',
  figures: '图片',
  equations: '公式',
  tables: '表格',
  citations: '引用',
  references: '参考文献',
  metadata: '文献信息',
  futureTitle: '下一步交互接口',
  futureBody: '这里先保留段落级接口，后续会接入翻译、AI 对话与引用式笔记。',
  translate: '段落翻译',
  chat: 'AI 对话',
  note: '做笔记',
  futureTranslate: '段落翻译接口已预留，下一步接入双语对照。',
  futureChat: '段落 AI 对话接口已预留，下一步接入上下文问答。',
  futureNote: '段落笔记接口已预留，下一步接入证据绑定笔记。',
  themes: {
    paper: 'Paper',
    journal: 'Journal',
    slate: 'Slate',
  },
};

function normalizeAssetPath(value: string) {
  return decodeURIComponent(value).replace(/\\/g, '/').replace(/^\.?\//, '');
}

async function parseBundleFromFiles(fileList: FileList): Promise<LoadedBundle> {
  const files = Array.from(fileList);
  const byName = new Map<string, File>();
  const assetUrls: Record<string, string> = {};

  for (const file of files) {
    const relative = file.webkitRelativePath || file.name;
    const parts = relative.split('/');
    const innerPath = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    byName.set(parts[parts.length - 1], file);
    assetUrls[normalizeAssetPath(innerPath)] = URL.createObjectURL(file);
  }

  const paperFile = byName.get('paper.md');
  const manifestFile = byName.get('manifest.json');
  const anchorsFile = byName.get('anchors.json');
  const equationsFile = byName.get('equations.json');
  const tablesFile = byName.get('tables.json');
  const citationsFile = byName.get('citations.json');
  const contentListFile = files.find(file => {
    const relative = file.webkitRelativePath || file.name;
    const name = relative.split('/').at(-1) || '';
    return name === 'content_list.json' || name.endsWith('_content_list.json');
  });

  if (!paperFile || !manifestFile || !anchorsFile || !equationsFile || !tablesFile || !citationsFile) {
    throw new Error('Bundle 文件夹必须包含 paper.md、manifest.json、anchors.json、equations.json、tables.json 和 citations.json');
  }

  const [paperMarkdown, manifestText, anchorsText, equationsText, tablesText, citationsText, contentListText] = await Promise.all([
    paperFile.text(),
    manifestFile.text(),
    anchorsFile.text(),
    equationsFile.text(),
    tablesFile.text(),
    citationsFile.text(),
    contentListFile?.text() ?? Promise.resolve(null),
  ]);

  return {
    manifest: JSON.parse(manifestText),
    blocks: JSON.parse(anchorsText).blocks || [],
    equations: JSON.parse(equationsText).equations || [],
    tables: JSON.parse(tablesText).tables || [],
    citations: JSON.parse(citationsText).citations || [],
    contentList: contentListText ? JSON.parse(contentListText) : null,
    paperMarkdown,
    bundlePath: null,
    notesPath: null,
    assetUrls,
  };
}

const NATIVE_ASSET_CACHE = new Map<string, string>();

function isLikelyAuthorLine(markdown: string) {
  return /\b(and|Department|University|Institute|Laboratory)\b/i.test(markdown) && /\d/.test(markdown);
}

function isLikelyReceivedLine(markdown: string) {
  return /^\(Received .*published .*?\)$/i.test(markdown.trim());
}

function isLikelyDoiLine(markdown: string) {
  return /^DOI:\s*/i.test(markdown.trim());
}

function isLikelyFigureCaption(markdown: string) {
  return /^(fig(?:ure)?\.?)\s*\d+/i.test(markdown.trim());
}

function isLikelyTableCaption(markdown: string) {
  return /^table\s*\d+/i.test(markdown.trim());
}

function isLikelyReferenceEntry(markdown: string) {
  const text = markdown.trim();
  return /^\[\d+\]/.test(text) || /^\d+\.\s+[A-Z]/.test(text);
}

function isLikelyPageAuxiliary(markdown: string) {
  const text = markdown.trim();
  if (!text) return true;
  return /^\d+$/.test(text) || /^-\s*\d+\s*-$/.test(text);
}

function buildReaderBlocks(blocks: BlockRecord[]) {
  let insideReferences = false;

  return blocks.map((block, index) => {
    const text = block.markdown.trim();
    let displayRole: DisplayRole = 'paragraph';

    if (block.block_type === 'heading') {
      displayRole = 'heading';
      insideReferences = /^(#+\s*)?(references|bibliography|参考文献)\b/i.test(text);
    } else if (block.block_type === 'figure') {
      displayRole = 'figure';
    } else if (block.block_type === 'equation') {
      displayRole = 'equation';
    } else if (block.block_type === 'table') {
      displayRole = 'table';
    } else if (insideReferences || isLikelyReferenceEntry(text)) {
      displayRole = 'reference';
    } else if (isLikelyFigureCaption(text) || isLikelyTableCaption(text)) {
      displayRole = 'caption';
    } else if (index < 6 && (isLikelyAuthorLine(text) || isLikelyReceivedLine(text) || isLikelyDoiLine(text))) {
      displayRole = 'metadata';
    }

    const hidden = displayRole === 'metadata' || isLikelyPageAuxiliary(text);
    return {
      ...block,
      displayRole,
      hidden,
    };
  });
}

function firstVisibleBlockId(blocks: ReaderBlock[]) {
  return blocks.find(block => !block.hidden)?.block_id || blocks[0]?.block_id || '';
}

function roleLabel(role: DisplayRole) {
  switch (role) {
    case 'caption':
      return 'caption';
    case 'reference':
      return 'reference';
    case 'metadata':
      return 'metadata';
    default:
      return role;
  }
}

function humanizeText(value: string) {
  return value
    .replace(/^#+\s*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bundleLabel(summary: BundleSummary) {
  if (summary.title && /\s/.test(summary.title)) {
    return summary.title;
  }
  const leaf = summary.relativePath.split('/').filter(Boolean).at(-1) || summary.bundleId;
  return humanizeText(leaf);
}

function displaySectionPath(sectionPath: string[]) {
  if (sectionPath.length === 0) return '';
  return sectionPath.map(humanizeText).join(' / ');
}

function ReaderImage({ bundle, src, alt }: { bundle: LoadedBundle; src?: string; alt?: string }) {
  const [resolvedSrc, setResolvedSrc] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!src) {
        setResolvedSrc('');
        return;
      }

      if (/^(https?:|data:|blob:)/.test(src)) {
        setResolvedSrc(src);
        return;
      }

      const normalized = normalizeAssetPath(src);

      if (bundle.assetUrls?.[normalized]) {
        setResolvedSrc(bundle.assetUrls[normalized]!);
        return;
      }

      if (bundle.bundlePath && isTauriRuntime()) {
        const cacheKey = `${bundle.bundlePath}:${normalized}`;
        if (NATIVE_ASSET_CACHE.has(cacheKey)) {
          setResolvedSrc(NATIVE_ASSET_CACHE.get(cacheKey)!);
          return;
        }

        try {
          const nextSrc = await loadNativeAsset(bundle.bundlePath, normalized);
          NATIVE_ASSET_CACHE.set(cacheKey, nextSrc);
          if (!cancelled) {
            setResolvedSrc(nextSrc);
          }
          return;
        } catch {
          if (!cancelled) {
            setResolvedSrc('');
          }
          return;
        }
      }

      setResolvedSrc(src);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [alt, bundle, src]);

  if (!resolvedSrc) {
    return <span className="image-placeholder">Image unavailable</span>;
  }

  return <img src={resolvedSrc} alt={alt || ''} loading="lazy" />;
}

function buildTree(bundles: BundleSummary[]) {
  const root: TreeNode = { groups: new Map(), bundles: [] };

  for (const bundle of bundles) {
    const segments = bundle.relativePath.split('/').filter(Boolean);
    const groupSegments = segments.slice(0, -1);
    let cursor = root;
    for (const segment of groupSegments) {
      if (!cursor.groups.has(segment)) {
        cursor.groups.set(segment, { groups: new Map(), bundles: [] });
      }
      cursor = cursor.groups.get(segment)!;
    }
    cursor.bundles.push(bundle);
  }

  return root;
}

function renderTree(
  tree: TreeNode,
  onOpen: (bundle: BundleSummary) => void,
  activePath: string | null,
): React.ReactNode {
  return (
    <>
      {[...tree.groups.entries()].map(([key, value]) => (
        <div key={key} className="tree-group">
          <p className="tree-label">{key}</p>
          <div className="tree-children">{renderTree(value, onOpen, activePath)}</div>
        </div>
      ))}
      {tree.bundles.map(bundle => (
        <button
          key={bundle.path}
          type="button"
          className={bundle.path === activePath ? 'tree-bundle active' : 'tree-bundle'}
          onClick={() => onOpen(bundle)}
        >
          {bundleLabel(bundle)}
        </button>
      ))}
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useState<ReaderTheme>('paper');
  const [bundles, setBundles] = useState<BundleSummary[]>(DEMO_BUNDLES);
  const [bundle, setBundle] = useState<LoadedBundle>(DEMO_BUNDLE);
  const [selectedBlockId, setSelectedBlockId] = useState(() => firstVisibleBlockId(buildReaderBlocks(DEMO_BUNDLE.blocks)));
  const [searchText, setSearchText] = useState('');
  const [message, setMessage] = useState('已加载演示文档');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(null);
  const [isImporting, setIsImporting] = useState(false);

  const isNative = isTauriRuntime();
  const deferredSearchText = useDeferredValue(searchText);

  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    async function bootstrap() {
      try {
        const nextBundles = await listNativeBundles();
        if (!cancelled && nextBundles.length > 0) {
          setBundles(nextBundles);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : String(error));
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [isNative]);

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

  const selectedBlock = useMemo(() => {
    return filteredBlocks.find(block => block.block_id === selectedBlockId) || filteredBlocks[0] || null;
  }, [filteredBlocks, selectedBlockId]);

  const headingBlocks = useMemo(
    () => readerBlocks.filter(block => block.displayRole === 'heading' && block.markdown.trim().startsWith('#')),
    [readerBlocks],
  );

  const tree = useMemo(() => buildTree(bundles), [bundles]);
  const visibleBlockCount = useMemo(() => readerBlocks.filter(block => !block.hidden).length, [readerBlocks]);
  const bundleTitle = useMemo(() => {
    const firstHeading = readerBlocks.find(block => block.displayRole === 'heading');
    return firstHeading ? firstHeading.markdown.replace(/^#+\s*/, '') : bundle.manifest.title || UI.noBundles;
  }, [bundle.manifest.title, readerBlocks]);

  function selectBlock(block: BlockRecord) {
    setSelectedBlockId(block.block_id);
    const element = document.getElementById(`block-${block.block_id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function openBundle(summary: BundleSummary) {
    if (summary.path.startsWith('demo://')) {
      setBundle(DEMO_BUNDLE);
      setSelectedBlockId(firstVisibleBlockId(buildReaderBlocks(DEMO_BUNDLE.blocks)));
      setMessage('已加载演示文档');
      return;
    }

    const nextBundle = await loadNativeBundle(summary.path);
    setBundle(nextBundle);
    setSelectedBlockId(firstVisibleBlockId(buildReaderBlocks(nextBundle.blocks)));
    setMessage(`已加载 ${summary.title || summary.bundleId}`);
  }

  async function handleImport(mode: 'file' | 'folder') {
    if (!isNative) {
      setMessage(UI.nativeRequired);
      return;
    }

    setIsImporting(true);
    setMessage(UI.importing);

    try {
      const sourcePath = mode === 'file' ? await chooseNativePdfFile() : await chooseNativePdfDirectory();
      if (!sourcePath) {
        setMessage(UI.importCancelled);
        return;
      }

      const imported = await importNativePdfSource(sourcePath);
      const refreshed = await listNativeBundles();
      const nextBundles = refreshed.length > 0 ? refreshed : imported;
      setBundles(nextBundles);
      setMessage(`${UI.imported}: ${sourcePath}`);

      if (imported.length > 0) {
        await openBundle(imported[0]!);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsImporting(false);
    }
  }

  async function handleOpenBundleFolder(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const nextBundle = await parseBundleFromFiles(files);
      setBundle(nextBundle);
      setSelectedBlockId(firstVisibleBlockId(buildReaderBlocks(nextBundle.blocks)));
      setMessage('已加载现有 bundle 文件夹');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      event.target.value = '';
    }
  }

  function triggerInteraction(mode: InteractionMode) {
    setInteractionMode(mode);
  }

  const activeBundlePath = bundle.bundlePath || null;

  return (
    <div className={`reader-app theme-${theme}`}>
      <header className="app-header">
        <div className="header-copy">
          <p className="brand">{UI.brand}</p>
          <h1>{UI.title}</h1>
          <p className="subtitle">{UI.subtitle}</p>
        </div>

        <div className="header-actions">
          <button type="button" className="reader-button primary" disabled={isImporting} onClick={() => void handleImport('file')}>
            {UI.importPdfFile}
          </button>
          <button type="button" className="reader-button secondary" disabled={isImporting} onClick={() => void handleImport('folder')}>
            {UI.importPdfFolder}
          </button>
          {!isNative && (
            <label className="reader-button secondary">
              {UI.openBundleFolder}
              <input type="file" multiple webkitdirectory="" directory="" onChange={handleOpenBundleFolder} />
            </label>
          )}
          <button type="button" className="reader-button ghost" onClick={() => void openBundle(DEMO_BUNDLES[0]!)}>
            {UI.loadDemo}
          </button>
        </div>
      </header>

      <div className="reader-toolbar">
        <div className="toolbar-status">
          <span>{isNative ? UI.nativeMode : UI.browserMode}</span>
          <strong>{bundleTitle}</strong>
        </div>
        <div className="toolbar-status compact">
          <span>{UI.conversion}</span>
          <strong>{bundle.manifest.conversion_status}</strong>
        </div>
        <div className="toolbar-status compact">
          <span>{UI.quality}</span>
          <strong>{bundle.manifest.quality_score}</strong>
        </div>
        <div className="toolbar-status compact">
          <span>{UI.blocks}</span>
          <strong>{bundle.manifest.block_count}</strong>
        </div>
        <div className="theme-switcher">
          {(['paper', 'journal', 'slate'] as ReaderTheme[]).map(item => (
            <button
              key={item}
              type="button"
              className={theme === item ? 'theme-button active' : 'theme-button'}
              onClick={() => setTheme(item)}
            >
              {UI.themes[item]}
            </button>
          ))}
        </div>
      </div>

      <div className="reader-layout">
        <aside className="left-rail">
          <section className="rail-panel">
            <div className="panel-header">
              <p>{UI.library}</p>
            </div>
            {bundles.length > 0 ? (
              <div className="tree-root">{renderTree(tree, bundle => void openBundle(bundle), activeBundlePath)}</div>
            ) : (
              <div className="empty-state">
                <strong>{UI.noBundles}</strong>
                <span>{UI.noBundlesHint}</span>
              </div>
            )}
          </section>

          <section className="rail-panel">
            <div className="panel-header">
              <p>{UI.outline}</p>
            </div>
            {headingBlocks.length > 0 ? (
              <div className="toc-list">
                {headingBlocks.map(block => (
                  <button key={block.block_id} type="button" className="toc-item" onClick={() => selectBlock(block)}>
                    {block.markdown.replace(/^#+\s*/, '')}
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state small">
                <span>{UI.noHeadings}</span>
              </div>
            )}
          </section>
        </aside>

        <main className="reader-main">
          <div className="reader-main-header">
            <div>
              <p className="panel-title">{UI.reader}</p>
              <h2>{bundleTitle}</h2>
            </div>
            <input
              className="reader-search"
              value={searchText}
              onChange={event => setSearchText(event.target.value)}
              placeholder={UI.searchPlaceholder}
            />
          </div>

          <div className="reader-document">
            {filteredBlocks.map(block => (
              <article
                key={block.block_id}
                id={`block-${block.block_id}`}
                className={
                  block.block_id === selectedBlock?.block_id
                    ? `reader-block role-${block.displayRole} active`
                    : `reader-block role-${block.displayRole}`
                }
                onClick={() => setSelectedBlockId(block.block_id)}
              >
                <div className="block-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeRaw, rehypeKatex]}
                    components={{
                      img: props => <ReaderImage bundle={bundle} src={typeof props.src === 'string' ? props.src : undefined} alt={props.alt} />,
                      a: props => <a {...props} target="_blank" rel="noreferrer" />,
                      table: props => (
                        <div className="table-scroll">
                          <table {...props} />
                        </div>
                      ),
                    }}
                  >
                    {block.markdown}
                  </ReactMarkdown>
                </div>
              </article>
            ))}
          </div>
        </main>

        <aside className="right-rail">
          <section className="rail-panel sticky">
            <div className="panel-header">
              <p>{UI.paragraphTools}</p>
            </div>
            {selectedBlock ? (
              <>
                <div className="future-box stats-box">
                  <p>{UI.docStats}</p>
                  <div className="stats-grid">
                    <span>{UI.figures}</span>
                    <strong>{bundle.manifest.figure_count}</strong>
                    <span>{UI.equations}</span>
                    <strong>{bundle.manifest.equation_count}</strong>
                    <span>{UI.tables}</span>
                    <strong>{bundle.manifest.table_count}</strong>
                    <span>{UI.citations}</span>
                    <strong>{bundle.manifest.citation_count}</strong>
                  </div>
                </div>

                <div className="selected-block-meta">
                  <strong>{displaySectionPath(selectedBlock.section_path) || bundleTitle}</strong>
                  <span>
                    {UI.blockType}: {roleLabel(selectedBlock.displayRole)}
                  </span>
                  <span>
                    {UI.page}: {selectedBlock.source_page_start}
                  </span>
                  <span>
                    {UI.blockId}: {selectedBlock.block_id}
                  </span>
                  <span>
                    {UI.selected}: {filteredBlocks.findIndex(block => block.block_id === selectedBlock.block_id) + 1} / {visibleBlockCount}
                  </span>
                </div>

                <div className="interaction-buttons">
                  <button type="button" className="reader-button secondary" onClick={() => triggerInteraction('translate')}>
                    {UI.translate}
                  </button>
                  <button type="button" className="reader-button secondary" onClick={() => triggerInteraction('chat')}>
                    {UI.chat}
                  </button>
                  <button type="button" className="reader-button secondary" onClick={() => triggerInteraction('note')}>
                    {UI.note}
                  </button>
                </div>

                <div className="future-box">
                  <p>{UI.futureTitle}</p>
                  <span>
                    {interactionMode === 'translate'
                      ? UI.futureTranslate
                      : interactionMode === 'chat'
                        ? UI.futureChat
                        : interactionMode === 'note'
                          ? UI.futureNote
                          : UI.futureBody}
                  </span>
                </div>
              </>
            ) : (
              <div className="empty-state small">
                <span>{UI.noBlock}</span>
              </div>
            )}

            <div className="status-line">{message}</div>
          </section>
        </aside>
      </div>
    </div>
  );
}
