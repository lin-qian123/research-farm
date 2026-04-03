import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { indexPaperBundle } from './bundle.mjs';

function sanitizeStem(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function collectPdfFiles(inputPath) {
  const resolvedInputPath = path.resolve(inputPath);
  const stats = await fs.stat(resolvedInputPath);

  if (stats.isFile()) {
    if (path.extname(resolvedInputPath).toLowerCase() !== '.pdf') {
      throw new Error(`Only PDF files are supported: ${resolvedInputPath}`);
    }
    return [{ pdfPath: resolvedInputPath, relativeDir: '' }];
  }

  const collected = [];

  async function walk(currentDir, relativeDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const nextRelativeDir = relativeDir ? path.join(relativeDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        await walk(absolutePath, nextRelativeDir);
        continue;
      }
      if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf') {
        collected.push({
          pdfPath: absolutePath,
          relativeDir,
        });
      }
    }
  }

  await walk(resolvedInputPath, '');
  return collected;
}

function runCommand(command, args, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += String(chunk);
    });

    child.stderr.on('data', chunk => {
      stderr += String(chunk);
      process.stderr.write(chunk);
    });

    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const details = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n');
      reject(
        new Error(
          `Command failed with exit code ${code}: ${command} ${args.join(' ')}${details ? `\n${details}` : ''}`,
        ),
      );
    });
  });
}

export async function convertPdfToMarkdownBundle({
  pdfPath,
  outputRoot,
  pythonExecutable = 'python3',
  converterScript,
}) {
  const resolvedPdfPath = path.resolve(pdfPath);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const bundleName = sanitizeStem(resolvedPdfPath);
  const bundleDir = path.join(resolvedOutputRoot, bundleName);

  await fs.mkdir(resolvedOutputRoot, { recursive: true });

  await runCommand(pythonExecutable, [
    converterScript,
    resolvedPdfPath,
    '--output',
    resolvedOutputRoot,
  ]);

  const sourceMarkdown = path.join(bundleDir, `${bundleName}.md`);
  const canonicalMarkdown = path.join(bundleDir, 'paper.md');
  try {
    await fs.access(sourceMarkdown);
    await fs.copyFile(sourceMarkdown, canonicalMarkdown);
  } catch {
    await fs.access(canonicalMarkdown);
  }

  const bundledPdfPath = path.join(bundleDir, path.basename(resolvedPdfPath));
  if (resolvedPdfPath !== bundledPdfPath || !(await pathExists(bundledPdfPath))) {
    await fs.copyFile(resolvedPdfPath, bundledPdfPath);
  }

  return indexPaperBundle({
    bundleDir,
    sourcePath: bundledPdfPath,
    parser: 'mineru',
  });
}

export async function importPdfSourceTree({
  inputPath,
  outputRoot,
  pythonExecutable = 'python3',
  converterScript,
}) {
  const resolvedInputPath = path.resolve(inputPath);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const pdfFiles = await collectPdfFiles(resolvedInputPath);

  if (pdfFiles.length === 0) {
    throw new Error(`No PDF files found under: ${resolvedInputPath}`);
  }

  const imported = [];

  for (const item of pdfFiles) {
    const targetRoot = item.relativeDir ? path.join(resolvedOutputRoot, item.relativeDir) : resolvedOutputRoot;
    const result = await convertPdfToMarkdownBundle({
      pdfPath: item.pdfPath,
      outputRoot: targetRoot,
      pythonExecutable,
      converterScript,
    });

    imported.push({
      sourcePath: item.pdfPath,
      relativeDir: item.relativeDir,
      bundleDir: result.bundleDir,
      manifest: result.manifest,
    });
  }

  return {
    inputPath: resolvedInputPath,
    outputRoot: resolvedOutputRoot,
    imported,
  };
}
