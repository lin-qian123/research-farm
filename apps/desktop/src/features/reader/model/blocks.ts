import type { BlockRecord, BundleSummary } from '../../../shared/contracts';

export type DisplayRole =
  | 'heading'
  | 'figure'
  | 'equation'
  | 'table'
  | 'caption'
  | 'reference'
  | 'metadata'
  | 'paragraph';

export type ReaderBlock = BlockRecord & {
  displayRole: DisplayRole;
  hidden: boolean;
};

export type TocEntry = {
  blockId: string;
  label: string;
};

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

function referenceLineCount(markdown: string) {
  return markdown
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => /^\[\d+\]/.test(line) || /^\d+\.\s+\S+/.test(line)).length;
}

function referenceLineRatio(markdown: string) {
  const lines = markdown.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return 0;
  return referenceLineCount(markdown) / lines.length;
}

function isLikelyReferenceContinuation(markdown: string) {
  const text = markdown.trim();
  if (!text) return false;
  if (isLikelyReferenceEntry(text)) return true;
  if (referenceLineRatio(text) >= 0.5) return true;
  return (
    /\b(doi|arxiv|vol\.|pp\.|et al\.|journal|phys\.|rev\.|letters|proceedings)\b/i.test(text)
    && /\d{4}/.test(text)
  );
}

function isLikelyHtmlTable(markdown: string) {
  return /<table\b[\s\S]*?<\/table>/i.test(markdown) || (/<(tr|td|th)\b/i.test(markdown) && /<\/(tr|td|th)>/i.test(markdown));
}

function isLikelyPageAuxiliary(markdown: string) {
  const text = markdown.trim();
  if (!text) return true;
  return /^\d+$/.test(text) || /^-\s*\d+\s*-$/.test(text);
}

function headingLevel(markdown: string) {
  const match = markdown.trim().match(/^(#+)\s+/);
  return match ? match[1].length : null;
}

function stripHeadingMarker(markdown: string) {
  return markdown.replace(/^#+\s*/, '').trim();
}

function isContentsHeading(text: string) {
  return /^(table of contents|contents|content|目录|目次)$/i.test(text.trim());
}

function isLikelyTocLine(text: string) {
  const trimmed = text.trim();
  return (
    /^[\dIVXivx]+\s*[.)、]?\s+/.test(trimmed)
    || /(\.{2,}|\s{3,})\d+$/.test(trimmed)
    || /^(chapter|section|part)\s+\d+/i.test(trimmed)
  );
}

export function buildReaderBlocks(blocks: BlockRecord[]) {
  let insideReferences = false;
  let contentsHeadingLevel: number | null = null;

  const readerBlocks = blocks.map((block, index) => {
    const text = block.markdown.trim();
    let displayRole: DisplayRole = 'paragraph';
    let hidden = false;

    if (block.block_type === 'heading') {
      displayRole = 'heading';
      insideReferences = /^(#+\s*)?(references|bibliography|参考文献)\b/i.test(text);

      const label = stripHeadingMarker(text);
      const level = headingLevel(text);
      if (isContentsHeading(label)) {
        contentsHeadingLevel = level;
        hidden = true;
      } else if (contentsHeadingLevel !== null && level !== null && level <= contentsHeadingLevel) {
        contentsHeadingLevel = null;
      }
    } else if (block.block_type === 'figure') {
      displayRole = 'figure';
    } else if (block.block_type === 'equation') {
      displayRole = 'equation';
    } else if (block.block_type === 'table' || isLikelyHtmlTable(text)) {
      displayRole = 'table';
    } else if (insideReferences || isLikelyReferenceContinuation(text)) {
      displayRole = 'reference';
    } else if (isLikelyFigureCaption(text) || isLikelyTableCaption(text)) {
      displayRole = 'caption';
    } else if (index < 6 && (isLikelyAuthorLine(text) || isLikelyReceivedLine(text) || isLikelyDoiLine(text))) {
      displayRole = 'metadata';
    }

    if (!hidden && contentsHeadingLevel !== null) {
      hidden = block.block_type !== 'heading' || isLikelyTocLine(text);
    }

    hidden = hidden || displayRole === 'metadata' || isLikelyPageAuxiliary(text);

    return {
      ...block,
      displayRole,
      hidden,
    };
  });

  return readerBlocks.map((block, index) => {
    if (block.displayRole !== 'paragraph') {
      return block;
    }

    const previous = readerBlocks[index - 1];
    const next = readerBlocks[index + 1];
    const text = block.markdown.trim();
    const bridgedReference =
      previous?.displayRole === 'reference'
      && next?.displayRole === 'reference'
      && isLikelyReferenceContinuation(text);

    if (!bridgedReference) {
      return block;
    }

    return {
      ...block,
      displayRole: 'reference',
    };
  });
}

export function firstVisibleBlockId(blocks: ReaderBlock[]) {
  return blocks.find(block => !block.hidden)?.block_id || blocks[0]?.block_id || '';
}

export function roleLabel(role: DisplayRole) {
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

export function humanizeText(value: string) {
  return value
    .replace(/^#+\s*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function bundleLabel(summary: BundleSummary) {
  if (summary.title && /\s/.test(summary.title)) {
    return summary.title;
  }
  const leaf = summary.relativePath.split('/').filter(Boolean).at(-1) || summary.bundleId;
  return humanizeText(leaf);
}

export function displaySectionPath(sectionPath: string[]) {
  if (sectionPath.length === 0) return '';
  return sectionPath.map(humanizeText).join(' / ');
}

export function buildTocEntries(blocks: ReaderBlock[]): TocEntry[] {
  return blocks
    .filter(block => !block.hidden && block.displayRole === 'heading' && block.markdown.trim().startsWith('#'))
    .map(block => ({
      blockId: block.block_id,
      label: stripHeadingMarker(block.markdown),
    }));
}

export function estimateBlockHeight(block: ReaderBlock) {
  const text = block.markdown.trim();
  const lineCount = Math.max(1, text.split('\n').length);
  const textWeight = Math.ceil(text.length / 90) * 18;

  switch (block.displayRole) {
    case 'heading':
      return Math.max(92, 72 + textWeight);
    case 'figure':
      return 420;
    case 'equation':
      return Math.max(180, 120 + lineCount * 26);
    case 'table':
      return Math.max(220, 140 + lineCount * 24);
    case 'caption':
      return Math.max(80, 56 + textWeight * 0.6);
    case 'reference':
      return Math.max(100, 70 + textWeight);
    default:
      return Math.max(110, 68 + lineCount * 22 + textWeight);
  }
}
