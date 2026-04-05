import type { BundleSummary, ImportJob, LoadedBundle } from './types';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauriRuntime() {
  return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

export async function chooseNativePdfFile() {
  if (!isTauriRuntime()) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple: false,
    title: 'Open PDF file',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  return typeof selected === 'string' ? selected : null;
}

export async function chooseNativePdfDirectory() {
  if (!isTauriRuntime()) return null;
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Open PDF directory',
  });
  return typeof selected === 'string' ? selected : null;
}

export async function listNativeBundles(): Promise<BundleSummary[]> {
  if (!isTauriRuntime()) return [];
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<BundleSummary[]>('list_local_bundles');
}

export async function renameNativeBundleGroup(groupRelativePath: string, newName: string): Promise<BundleSummary[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<BundleSummary[]>('rename_bundle_group', { groupRelativePath, newName });
}

export async function moveNativeBundleToGroup(bundlePath: string, targetGroupRelativePath: string): Promise<BundleSummary[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<BundleSummary[]>('move_bundle_to_group', { bundlePath, targetGroupRelativePath });
}

export async function updateNativeBundleLibraryMetadata(
  bundlePath: string,
  metadata: { title?: string | null; tags?: string[] },
): Promise<BundleSummary> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<BundleSummary>('update_bundle_library_metadata', {
    bundlePath,
    title: metadata.title,
    tags: metadata.tags,
  });
}

export async function loadNativeBundle(bundlePath: string): Promise<LoadedBundle> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<LoadedBundle>('load_bundle', { bundlePath });
}

export async function saveNativeBlockMarkdown(
  bundlePath: string,
  blockId: string,
  markdown: string,
): Promise<LoadedBundle> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<LoadedBundle>('save_block_markdown', { bundlePath, blockId, markdown });
}

export async function importNativePdfSource(sourcePath: string): Promise<BundleSummary[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<BundleSummary[]>('import_pdf_source', { sourcePath });
}

export async function loadNativeAsset(bundlePath: string, assetPath: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('load_bundle_asset', { bundlePath, assetPath });
}

export async function startNativeImport(sourcePath: string): Promise<ImportJob> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<ImportJob>('start_import_pdf_source', { sourcePath });
}

export async function listNativeImportJobs(): Promise<ImportJob[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<ImportJob[]>('list_import_jobs');
}

export async function loadNativeWorkspaceNote(bundleId: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('load_workspace_note', { bundleId });
}

export async function saveNativeWorkspaceNote(bundleId: string, content: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('save_workspace_note', { bundleId, content });
}
