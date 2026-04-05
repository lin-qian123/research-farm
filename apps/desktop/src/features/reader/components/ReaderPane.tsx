import type { MouseEvent } from 'react';
import { UI } from '../../../app/uiCopy';
import { useReader } from '../hooks/useReader';
import { ReaderDocument } from './ReaderDocument';
import type { ReaderBlock } from '../model/blocks';

type ReaderPaneProps = {
  onBlockContextMenu: (event: MouseEvent, block: ReaderBlock) => void;
};

export function ReaderPane({ onBlockContextMenu }: ReaderPaneProps) {
  const {
    bundle,
    bundleTitle,
    filteredBlocks,
    selectedBlock,
    searchText,
    setSearchText,
    readerBodyRef,
    editingBlockId,
    editingBlockValue,
    scrollTargetBlockId,
    setEditingBlockValue,
    selectBlockId,
    startInlineEdit,
    cancelInlineEdit,
    clearScrollTarget,
    submitEditBlock,
    navigateToBlockId,
  } = useReader();

  return (
    <main className="reader-main">
      <div className="reader-main-header">
        <div>
          <p className="panel-title">{UI.reader}</p>
          <h2>{bundleTitle}</h2>
        </div>
        <input
          className="reader-search"
          value={searchText}
          onChange={event => setSearchText(event.target.value)}
          placeholder={UI.searchPlaceholder}
        />
      </div>

      <div ref={readerBodyRef} className="reader-main-body">
        {scrollTargetBlockId ? (
          <div className="reader-loading-indicator" aria-live="polite">
            正在定位...
          </div>
        ) : null}
        <ReaderDocument
          blocks={filteredBlocks}
          bundle={bundle}
          scrollContainerRef={readerBodyRef}
          selectedBlockId={selectedBlock?.block_id || ''}
          onSelect={selectBlockId}
          onBlockContextMenu={onBlockContextMenu}
          onStartEdit={startInlineEdit}
          editingBlockId={editingBlockId}
          editingValue={editingBlockValue}
          onEditingChange={setEditingBlockValue}
          onSaveEdit={() => void (editingBlockId ? submitEditBlock(editingBlockId, editingBlockValue) : Promise.resolve())}
          onCancelEdit={cancelInlineEdit}
          scrollTargetBlockId={scrollTargetBlockId}
          onScrollTargetHandled={clearScrollTarget}
        />
      </div>
    </main>
  );
}
