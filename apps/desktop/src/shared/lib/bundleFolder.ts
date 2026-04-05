import type { LoadedBundle } from '../contracts';

function normalizeAssetPath(value: string) {
  return decodeURIComponent(value).replace(/\\/g, '/').replace(/^\.?\//, '');
}

export async function parseBundleFromFiles(fileList: FileList): Promise<LoadedBundle> {
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
