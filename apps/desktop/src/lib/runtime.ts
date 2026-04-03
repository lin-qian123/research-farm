import type { BundleSummary, LoadedBundle } from './types';

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

export async function loadNativeBundle(bundlePath: string): Promise<LoadedBundle> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<LoadedBundle>('load_bundle', { bundlePath });
}

export async function importNativePdfSource(sourcePath: string): Promise<BundleSummary[]> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<BundleSummary[]>('import_pdf_source', { sourcePath });
}

export async function loadNativeAsset(bundlePath: string, assetPath: string): Promise<string> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('load_bundle_asset', { bundlePath, assetPath });
}
