import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { convertPdfToMarkdownBundle, importPdfSourceTree, indexPaperBundle } from '../../../packages/paper-ingest/src/index.mjs';

function printUsage() {
  console.log(`Usage:
  node apps/cli/src/index.mjs import-paper <pdf-path> [--output <dir>] [--python <exe>] [--script <path>]
  node apps/cli/src/index.mjs import-source <pdf-or-dir-path> [--output <dir>] [--python <exe>] [--script <path>]
  node apps/cli/src/index.mjs index-markdown <bundle-dir> [--source <path>]
`);
}

function parseFlags(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value && !value.startsWith('--')) {
      flags[key] = value;
      index += 1;
    } else {
      flags[key] = true;
    }
  }
  return flags;
}

async function main() {
  const [, , command, target, ...rest] = process.argv;
  const flags = parseFlags(rest);
  const converterScript = flags.script
    ? path.resolve(flags.script)
    : path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        '../../../python/sidecar/mineru_convert.py',
      );

  if (!command || command === 'help' || command === '--help') {
    printUsage();
    process.exitCode = 0;
    return;
  }

  if (command === 'import-paper') {
    if (!target) {
      throw new Error('import-paper requires a PDF path');
    }

    const outputRoot = path.resolve(flags.output || 'data/bundles');
    const result = await convertPdfToMarkdownBundle({
      pdfPath: path.resolve(target),
      outputRoot,
      pythonExecutable: flags.python || 'python3',
      converterScript,
    });

    console.log(JSON.stringify(result.manifest, null, 2));
    return;
  }

  if (command === 'import-source') {
    if (!target) {
      throw new Error('import-source requires a PDF path or directory');
    }

    const resolvedTarget = path.resolve(target);
    const stats = await fs.stat(resolvedTarget);
    const outputRoot = path.resolve(flags.output || 'data/bundles');

    if (stats.isDirectory()) {
      const result = await importPdfSourceTree({
        inputPath: resolvedTarget,
        outputRoot,
        pythonExecutable: flags.python || 'python3',
        converterScript,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    const result = await convertPdfToMarkdownBundle({
      pdfPath: resolvedTarget,
      outputRoot,
      pythonExecutable: flags.python || 'python3',
      converterScript,
    });

    console.log(
      JSON.stringify(
        {
          inputPath: resolvedTarget,
          outputRoot,
          imported: [
            {
              sourcePath: resolvedTarget,
              relativeDir: '',
              bundleDir: result.bundleDir,
              manifest: result.manifest,
            },
          ],
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === 'index-markdown') {
    if (!target) {
      throw new Error('index-markdown requires a bundle directory');
    }

    const bundleDir = path.resolve(target);
    const result = await indexPaperBundle({
      bundleDir,
      sourcePath: flags.source ? path.resolve(flags.source) : undefined,
    });

    console.log(JSON.stringify(result.manifest, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
