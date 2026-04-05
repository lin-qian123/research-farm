import { useEffect, useRef, useState } from 'react';
import { UI } from './uiCopy';
import { useReaderTheme } from './providers/ThemeProvider';
import { useLibrary } from '../features/library/hooks/useLibrary';
import { LibraryPanel } from '../features/library/components/LibraryPanel';
import type { LeftRailPanel } from '../features/library/components/LibraryPanel';
import { LibraryContextMenu } from '../features/library/components/LibraryContextMenu';
import type { LibraryContextMenuState } from '../features/library/components/LibraryContextMenu';
import { LibraryDialog } from '../features/library/components/LibraryDialog';
import type { LibraryDialogState } from '../features/library/components/LibraryDialog';
import { ReaderPane } from '../features/reader/components/ReaderPane';
import { BlockContextMenu } from '../features/reader/components/BlockContextMenu';
import type { BlockContextMenuState } from '../features/reader/components/BlockContextMenu';
import { BlockActionPanel } from '../features/ai/components/BlockActionPanel';
import { SettingsPanel } from '../features/settings/components/SettingsPanel';

export function AppShell() {
  const { theme } = useReaderTheme();
  const library = useLibrary();
  const [activeLeftRailPanel, setActiveLeftRailPanel] = useState<LeftRailPanel>('library');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [libraryContextMenu, setLibraryContextMenu] = useState<LibraryContextMenuState>(null);
  const [blockContextMenu, setBlockContextMenu] = useState<BlockContextMenuState>(null);
  const [libraryDialog, setLibraryDialog] = useState<LibraryDialogState>(null);
  const settingsShellRef = useRef<HTMLDivElement | null>(null);
  const libraryContextMenuRef = useRef<HTMLDivElement | null>(null);
  const blockContextMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!libraryContextMenu) return;
    const closeFromPointer = (event: PointerEvent) => {
      const menu = libraryContextMenuRef.current;
      if (menu && menu.contains(event.target as Node)) {
        return;
      }
      setLibraryContextMenu(null);
    };
    const closeFromBlur = () => setLibraryContextMenu(null);
    window.addEventListener('pointerdown', closeFromPointer);
    window.addEventListener('blur', closeFromBlur);
    return () => {
      window.removeEventListener('pointerdown', closeFromPointer);
      window.removeEventListener('blur', closeFromBlur);
    };
  }, [libraryContextMenu]);

  useEffect(() => {
    if (!blockContextMenu) return;
    const closeFromPointer = (event: PointerEvent) => {
      const menu = blockContextMenuRef.current;
      if (menu && menu.contains(event.target as Node)) {
        return;
      }
      setBlockContextMenu(null);
    };
    const closeFromBlur = () => setBlockContextMenu(null);
    window.addEventListener('pointerdown', closeFromPointer);
    window.addEventListener('blur', closeFromBlur);
    return () => {
      window.removeEventListener('pointerdown', closeFromPointer);
      window.removeEventListener('blur', closeFromBlur);
    };
  }, [blockContextMenu]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const closeFromPointer = (event: PointerEvent) => {
      const panel = settingsShellRef.current;
      if (panel && panel.contains(event.target as Node)) {
        return;
      }
      setIsSettingsOpen(false);
    };
    window.addEventListener('pointerdown', closeFromPointer);
    return () => {
      window.removeEventListener('pointerdown', closeFromPointer);
    };
  }, [isSettingsOpen]);

  async function submitLibraryDialog() {
    if (!libraryDialog) return;
    try {
      if (libraryDialog.kind === 'rename-group') {
        const nextName = libraryDialog.value.trim();
        setLibraryDialog(null);
        await library.renameGroup(libraryDialog.groupPath, nextName);
        return;
      }

      if (libraryDialog.kind === 'set-tags') {
        setLibraryDialog(null);
        await library.setBundleTags(libraryDialog.bundle, libraryDialog.value);
        return;
      }

      if (libraryDialog.kind === 'move-bundle') {
        const target = libraryDialog.value.trim();
        setLibraryDialog(null);
        await library.moveBundle(libraryDialog.bundle, target);
      }
    } catch (error) {
      library.setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className={`reader-app theme-${theme}`}>
      <div className="top-toolbar">
        <div className="left-rail-switcher top-toolbar-switcher">
          <button
            type="button"
            className={activeLeftRailPanel === 'library' ? 'left-rail-button active' : 'left-rail-button'}
            onClick={() => setActiveLeftRailPanel('library')}
            title={UI.library}
            aria-label={UI.library}
          >
            {UI.leftRailLibraryShort}
          </button>
          <button
            type="button"
            className={activeLeftRailPanel === 'outline' ? 'left-rail-button active' : 'left-rail-button'}
            onClick={() => setActiveLeftRailPanel('outline')}
            title={UI.outline}
            aria-label={UI.outline}
          >
            {UI.leftRailOutlineShort}
          </button>
        </div>

        <div />

        <div ref={settingsShellRef} className="settings-shell top-toolbar-settings">
          <button
            type="button"
            className={isSettingsOpen ? 'settings-button active' : 'settings-button'}
            onClick={() => setIsSettingsOpen(current => !current)}
          >
            {UI.settings}
          </button>
          <SettingsPanel isOpen={isSettingsOpen} />
        </div>
      </div>

      <div className="reader-layout">
        <LibraryPanel
          activePanel={activeLeftRailPanel}
          bundles={library.bundles}
          tree={library.tree}
          activeBundlePath={library.activeBundlePath}
          expandedGroups={library.expandedGroups}
          tocEntries={library.tocEntries}
          selectedBlockId={library.selectedBlock?.block_id || null}
          onToggleGroup={library.toggleGroup}
          onOpenBundle={bundle => void library.openBundle(bundle)}
          onNavigateToBlock={library.navigateToBlockId}
          onGroupContextMenu={(event, groupPath, label) => {
            event.preventDefault();
            setLibraryContextMenu({
              x: event.clientX,
              y: event.clientY,
              target: { kind: 'group', groupPath, label },
            });
          }}
          onBundleContextMenu={(event, bundle) => {
            event.preventDefault();
            setLibraryContextMenu({
              x: event.clientX,
              y: event.clientY,
              target: { kind: 'bundle', bundle },
            });
          }}
        />

        <ReaderPane
          onBlockContextMenu={(event, block) => {
            setLibraryContextMenu(null);
            setBlockContextMenu({
              x: event.clientX,
              y: event.clientY,
              block,
            });
          }}
        />

        <BlockActionPanel />
      </div>

      <LibraryContextMenu
        state={libraryContextMenu}
        menuRef={libraryContextMenuRef}
        onRenameGroup={(groupPath, label) => {
          setLibraryContextMenu(null);
          setLibraryDialog({ kind: 'rename-group', groupPath, value: label });
        }}
        onSetTags={bundle => {
          setLibraryContextMenu(null);
          setLibraryDialog({ kind: 'set-tags', bundle, value: bundle.tags?.join(', ') || '' });
        }}
        onMoveToFolder={bundle => {
          setLibraryContextMenu(null);
          setLibraryDialog({
            kind: 'move-bundle',
            bundle,
            value: bundle.relativePath.split('/').slice(0, -1).join('/'),
          });
        }}
      />

      <BlockContextMenu
        state={blockContextMenu}
        menuRef={blockContextMenuRef}
        onCopy={block => {
          void library.copyBlockMarkdown(block);
          setBlockContextMenu(null);
        }}
        onEdit={block => {
          library.startInlineEdit(block);
          setBlockContextMenu(null);
        }}
      />

      <LibraryDialog
        state={libraryDialog}
        tree={library.tree}
        onClose={() => setLibraryDialog(null)}
        onChange={nextValue => setLibraryDialog(current => (current ? { ...current, value: nextValue } : current))}
        onSubmit={() => void submitLibraryDialog()}
      />
    </div>
  );
}
