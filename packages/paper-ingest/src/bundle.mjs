import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildAnchorIndex } from '../../markdown-engine/src/index.mjs';
import { createPaperBundleRecord, hashText } from '../../research-domain/src/index.mjs';

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function checksumFile(filePath) {
  const content = await fs.readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function findOptionalArtifact(bundleDir, suffix) {
  const entries = await fs.readdir(bundleDir, { withFileTypes: true });
  const match = entries.find(entry => entry.isFile() && entry.name.endsWith(suffix));
  return match ? path.join(bundleDir, match.name) : null;
}

async function copyOptionalArtifact(sourcePath, targetPath) {
  if (!sourcePath || sourcePath === targetPath) return null;
  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}

function sanitizeBundleName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'paper-bundle';
}

function computeQualityScore({ blocks, figures, equations, tables, citations }) {
  if (blocks.length === 0) return 0;
  let score = 0.4;
  if (blocks.some(block => block.block_type === 'heading')) score += 0.15;
  if (figures.length > 0) score += 0.15;
  if (equations.length > 0) score += 0.1;
  if (tables.length > 0) score += 0.1;
  if (citations.length > 0) score += 0.1;
  return Number(Math.min(score, 1).toFixed(2));
}

function buildQualityFlags(markdown, indexes) {
  const flags = [];
  if (!markdown.trim()) flags.push('empty_markdown');
  if (!indexes.blocks.some(block => block.block_type === 'heading')) {
    flags.push('missing_headings');
  }
  if (indexes.blocks.length < 3) {
    flags.push('very_few_blocks');
  }
  return flags;
}

export async function indexPaperBundle({ bundleDir, sourcePath, parser = 'mineru', parserVersion = 'unknown' }) {
  const resolvedBundleDir = path.resolve(bundleDir);
  const markdownPath = path.join(resolvedBundleDir, 'paper.md');
  const manifestPath = path.join(resolvedBundleDir, 'manifest.json');
  const anchorsPath = path.join(resolvedBundleDir, 'anchors.json');
  const equationsPath = path.join(resolvedBundleDir, 'equations.json');
  const tablesPath = path.join(resolvedBundleDir, 'tables.json');
  const citationsPath = path.join(resolvedBundleDir, 'citations.json');
  const contentListPath = path.join(resolvedBundleDir, 'content_list.json');
  const middleJsonPath = path.join(resolvedBundleDir, 'middle.json');
  const modelJsonPath = path.join(resolvedBundleDir, 'model.json');
  const imagesDir = path.join(resolvedBundleDir, 'images');

  if (!(await fileExists(markdownPath))) {
    throw new Error(`paper.md not found in bundle directory: ${resolvedBundleDir}`);
  }

  const markdown = await fs.readFile(markdownPath, 'utf8');
  await copyOptionalArtifact(await findOptionalArtifact(resolvedBundleDir, '_content_list.json'), contentListPath);
  await copyOptionalArtifact(await findOptionalArtifact(resolvedBundleDir, '_middle.json'), middleJsonPath);
  await copyOptionalArtifact(await findOptionalArtifact(resolvedBundleDir, '_model.json'), modelJsonPath);
  const bundleName = sanitizeBundleName(path.basename(resolvedBundleDir));
  const resolvedSourcePath = sourcePath ? path.resolve(sourcePath) : markdownPath;
  const pdfPath = resolvedSourcePath.toLowerCase().endsWith('.pdf') ? resolvedSourcePath : null;
  const sourceChecksum = await checksumFile(resolvedSourcePath);
  const bundleId = `bundle_${hashText(`${sourceChecksum}:${markdown}`)}`;
  const indexes = buildAnchorIndex({ bundleId, markdown });
  const qualityFlags = buildQualityFlags(markdown, indexes);

  const manifest = createPaperBundleRecord({
    bundle_id: bundleId,
    source_type: pdfPath ? 'pdf' : 'markdown',
    source_path: resolvedSourcePath,
    source_checksum: sourceChecksum,
    pdf_path: pdfPath,
    markdown_path: markdownPath,
    manifest_path: manifestPath,
    asset_root: imagesDir,
    parser,
    parser_version: parserVersion,
    conversion_status: qualityFlags.length === 0 ? 'completed' : 'needs_review',
    quality_score: computeQualityScore(indexes),
    title: bundleName,
    block_count: indexes.blocks.length,
    figure_count: indexes.figures.length,
    equation_count: indexes.equations.length,
    table_count: indexes.tables.length,
    citation_count: indexes.citations.length,
    quality_flags: qualityFlags,
  });

  await fs.mkdir(imagesDir, { recursive: true });
  await writeJson(manifestPath, manifest);
  await writeJson(anchorsPath, { bundle_id: bundleId, blocks: indexes.blocks });
  await writeJson(equationsPath, { bundle_id: bundleId, equations: indexes.equations });
  await writeJson(tablesPath, { bundle_id: bundleId, tables: indexes.tables });
  await writeJson(citationsPath, { bundle_id: bundleId, citations: indexes.citations });

  return {
    bundleDir: resolvedBundleDir,
    manifest,
    indexes,
    paths: {
      markdownPath,
      manifestPath,
      anchorsPath,
      equationsPath,
      tablesPath,
      citationsPath,
      contentListPath,
      middleJsonPath,
      modelJsonPath,
      imagesDir,
    },
  };
}
