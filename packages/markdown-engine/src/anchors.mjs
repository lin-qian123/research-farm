import path from 'node:path';
import { hashText } from '../../research-domain/src/index.mjs';

const PAGE_MARKER_RE = /^<!--\s*page:\s*(\d+)\s*-->$/i;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const FIGURE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const BLOCK_EQUATION_RE = /\$\$([\s\S]+?)\$\$/g;
const HTML_TABLE_RE = /<table\b[\s\S]*?<\/table>/i;
const HTML_TABLE_CELL_RE = /<(table|thead|tbody|tr|td|th)\b/i;
const DOI_RE = /\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+\b/gi;
const ARXIV_RE = /\barXiv:\s*([0-9]{4}\.[0-9]{4,5}(?:v\d+)?)\b/gi;

function slugifyHeading(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`*_~()[\]{}]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

function toSectionPath(sectionStack) {
  if (sectionStack.length === 0) return ['root'];
  return sectionStack.map(slugifyHeading);
}

function buildBlock(bundleId, index, sectionPath, blockType, markdown, page, startLine, endLine) {
  const normalized = markdown.trim();
  return {
    block_id: `blk_${hashText(`${bundleId}:${sectionPath.join('/')}:${index}:${normalized}`)}`,
    section_path: sectionPath,
    block_type: blockType,
    markdown: normalized,
    source_page_start: page,
    source_page_end: page,
    preceding_block_id: null,
    following_block_id: null,
    start_line: startLine,
    end_line: endLine,
  };
}

function classifyBufferedBlock(markdown) {
  if (
    HTML_TABLE_RE.test(markdown)
    || (HTML_TABLE_CELL_RE.test(markdown) && /<\/(td|th|tr|table)>/i.test(markdown))
    || (markdown.includes('|') && markdown.split('\n').some(line => /^\s*\|?[-: ]+\|[-|: ]+\s*$/.test(line)))
  ) {
    return 'table';
  }
  if (markdown.includes('![')) return 'figure';
  if (markdown.includes('$$')) return 'equation';
  return 'paragraph';
}

export function splitMarkdownIntoBlocks(bundleId, markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let currentPage = 1;
  let sectionStack = [];
  let buffer = [];
  let bufferStartLine = 1;

  function flushBuffer(endLine) {
    const joined = buffer.join('\n').trim();
    if (!joined) {
      buffer = [];
      return;
    }
    blocks.push(
      buildBlock(
        bundleId,
        blocks.length,
        toSectionPath(sectionStack),
        classifyBufferedBlock(joined),
        joined,
        currentPage,
        bufferStartLine,
        endLine,
      ),
    );
    buffer = [];
  }

  lines.forEach((line, lineIndex) => {
    const oneBasedLine = lineIndex + 1;
    const pageMatch = line.match(PAGE_MARKER_RE);
    const headingMatch = line.match(HEADING_RE);

    if (pageMatch) {
      flushBuffer(oneBasedLine - 1);
      currentPage = Number(pageMatch[1]);
      return;
    }

    if (headingMatch) {
      flushBuffer(oneBasedLine - 1);
      const depth = headingMatch[1].length;
      const title = headingMatch[2].trim();
      sectionStack = sectionStack.slice(0, depth - 1);
      sectionStack[depth - 1] = title;
      blocks.push(
        buildBlock(
          bundleId,
          blocks.length,
          toSectionPath(sectionStack),
          'heading',
          line.trim(),
          currentPage,
          oneBasedLine,
          oneBasedLine,
        ),
      );
      return;
    }

    if (line.trim() === '') {
      flushBuffer(oneBasedLine - 1);
      bufferStartLine = oneBasedLine + 1;
      return;
    }

    if (buffer.length === 0) {
      bufferStartLine = oneBasedLine;
    }
    buffer.push(line);
  });

  flushBuffer(lines.length);

  return blocks.map((block, index) => ({
    ...block,
    preceding_block_id: index > 0 ? blocks[index - 1].block_id : null,
    following_block_id: index < blocks.length - 1 ? blocks[index + 1].block_id : null,
  }));
}

export function extractFigureAssets(bundleId, blocks) {
  const figures = [];
  for (const block of blocks) {
    let match;
    let localIndex = 0;
    while ((match = FIGURE_RE.exec(block.markdown)) !== null) {
      const alt = match[1].trim();
      const relativePath = match[2].trim();
      const fileName = path.basename(relativePath);
      figures.push({
        figure_id: `fig_${hashText(`${bundleId}:${block.block_id}:${relativePath}:${localIndex}`)}`,
        block_id: block.block_id,
        section_path: block.section_path,
        alt_text: alt,
        asset_path: relativePath,
        asset_name: fileName,
        source_page_start: block.source_page_start,
        source_page_end: block.source_page_end,
      });
      localIndex += 1;
    }
    FIGURE_RE.lastIndex = 0;
  }
  return figures;
}

export function extractEquationAssets(bundleId, blocks) {
  const equations = [];
  for (const block of blocks) {
    let match;
    let localIndex = 0;
    while ((match = BLOCK_EQUATION_RE.exec(block.markdown)) !== null) {
      const latex = match[1].trim();
      equations.push({
        equation_id: `eq_${hashText(`${bundleId}:${block.block_id}:${latex}:${localIndex}`)}`,
        block_id: block.block_id,
        section_path: block.section_path,
        latex,
        raw_text: match[0],
        source_page_start: block.source_page_start,
        source_page_end: block.source_page_end,
      });
      localIndex += 1;
    }
    BLOCK_EQUATION_RE.lastIndex = 0;
  }
  return equations;
}

export function extractTableAssets(bundleId, blocks) {
  return blocks
    .filter(block => block.block_type === 'table')
    .map(block => ({
      table_id: `tbl_${hashText(`${bundleId}:${block.block_id}:${block.markdown}`)}`,
      block_id: block.block_id,
      section_path: block.section_path,
      markdown: block.markdown,
      source_page_start: block.source_page_start,
      source_page_end: block.source_page_end,
    }));
}

export function extractCitations(bundleId, blocks) {
  const citations = [];
  for (const block of blocks) {
    const localMatches = [];
    for (const match of block.markdown.matchAll(DOI_RE)) {
      localMatches.push({ kind: 'doi', value: match[0] });
    }
    for (const match of block.markdown.matchAll(ARXIV_RE)) {
      localMatches.push({ kind: 'arxiv', value: match[1] });
    }
    localMatches.forEach((match, index) => {
      citations.push({
        citation_id: `cit_${hashText(`${bundleId}:${block.block_id}:${match.kind}:${match.value}:${index}`)}`,
        block_id: block.block_id,
        kind: match.kind,
        value: match.value,
        source_page_start: block.source_page_start,
        source_page_end: block.source_page_end,
      });
    });
  }
  return citations;
}

export function buildAnchorIndex({ bundleId, markdown }) {
  const blocks = splitMarkdownIntoBlocks(bundleId, markdown);
  const figures = extractFigureAssets(bundleId, blocks);
  const equations = extractEquationAssets(bundleId, blocks);
  const tables = extractTableAssets(bundleId, blocks);
  const citations = extractCitations(bundleId, blocks);

  return {
    blocks,
    figures,
    equations,
    tables,
    citations,
  };
}
