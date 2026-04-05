import {
  chooseNativePdfDirectory,
  chooseNativePdfFile,
  isTauriRuntime,
  listNativeBundles,
  listNativeImportJobs,
  loadNativeAsset,
  loadNativeBundle,
  loadNativeWorkspaceNote,
  moveNativeBundleToGroup,
  renameNativeBundleGroup,
  saveNativeBlockMarkdown,
  saveNativeWorkspaceNote,
  startNativeImport,
  updateNativeBundleLibraryMetadata,
} from '../../lib/runtime';
import { parseBundleFromFiles } from '../../shared/lib/bundleFolder';
import { createAiTaskService } from './aiTaskService';
import { createReaderService } from './readerService';
import type { AppServices, RuntimeMode } from './types';

function runtimeMode(): RuntimeMode {
  return isTauriRuntime() ? 'native' : 'browser';
}

export function createAppServices(): AppServices {
  const mode = runtimeMode();

  return {
    bundleService: {
      mode,
      async listBundles() {
        return mode === 'native' ? listNativeBundles() : [];
      },
      async loadBundle(bundlePath) {
        if (mode !== 'native') {
          throw new Error('浏览器模式不支持按路径读取 bundle');
        }
        return loadNativeBundle(bundlePath);
      },
      async loadBundleFromFiles(fileList) {
        return parseBundleFromFiles(fileList);
      },
      async renameGroup(groupRelativePath, newName) {
        if (mode !== 'native') {
          throw new Error('浏览器模式不支持重命名资料库目录');
        }
        return renameNativeBundleGroup(groupRelativePath, newName);
      },
      async moveBundleToGroup(bundlePath, targetGroupRelativePath) {
        if (mode !== 'native') {
          throw new Error('浏览器模式不支持移动文献');
        }
        return moveNativeBundleToGroup(bundlePath, targetGroupRelativePath);
      },
      async updateLibraryMetadata(bundlePath, metadata) {
        if (mode !== 'native') {
          throw new Error('浏览器模式不支持更新资料库元数据');
        }
        return updateNativeBundleLibraryMetadata(bundlePath, metadata);
      },
      async saveBlock(bundlePath, blockId, markdown) {
        if (mode !== 'native') {
          throw new Error('浏览器模式不支持写回源 Markdown 文件');
        }
        return saveNativeBlockMarkdown(bundlePath, blockId, markdown);
      },
    },
    importService: {
      mode,
      async startImportFromPicker(kind) {
        if (mode !== 'native') {
          throw new Error('PDF 导入需要原生桌面模式，请运行 npm run desktop:native:dev');
        }
        const sourcePath = kind === 'file' ? await chooseNativePdfFile() : await chooseNativePdfDirectory();
        if (!sourcePath) {
          throw new Error('已取消导入');
        }
        return startNativeImport(sourcePath);
      },
      async listJobs() {
        return mode === 'native' ? listNativeImportJobs() : [];
      },
    },
    assetService: {
      async loadAsset(bundlePath, assetPath) {
        if (mode !== 'native') {
          throw new Error('浏览器模式不支持直接读取本地资源');
        }
        return loadNativeAsset(bundlePath, assetPath);
      },
    },
    notesService: {
      async loadNote(bundleId) {
        return mode === 'native' ? loadNativeWorkspaceNote(bundleId) : '';
      },
      async saveNote(bundleId, content) {
        if (mode !== 'native') {
          throw new Error('浏览器模式不支持保存工作笔记');
        }
        return saveNativeWorkspaceNote(bundleId, content);
      },
    },
    readerService: createReaderService(),
    aiTaskService: createAiTaskService(),
  };
}
