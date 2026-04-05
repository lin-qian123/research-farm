import { UI } from '../../../app/uiCopy';
import { useBlockActions } from '../hooks/useBlockActions';

export function BlockActionPanel() {
  const {
    selectedBlock,
    filteredBlocks,
    visibleBlockCount,
    bundle,
    bundleTitle,
    interactionMode,
    setInteractionMode,
    displaySectionPath,
    roleLabel,
    message,
  } = useBlockActions();

  return (
    <aside className="right-rail">
      <section className="rail-panel sticky">
        <div className="panel-header">
          <p>{UI.paragraphTools}</p>
        </div>
        {selectedBlock ? (
          <>
            <div className="future-box stats-box">
              <p>{UI.docStats}</p>
              <div className="stats-grid">
                <span>{UI.figures}</span>
                <strong>{bundle.manifest.figure_count}</strong>
                <span>{UI.equations}</span>
                <strong>{bundle.manifest.equation_count}</strong>
                <span>{UI.tables}</span>
                <strong>{bundle.manifest.table_count}</strong>
                <span>{UI.citations}</span>
                <strong>{bundle.manifest.citation_count}</strong>
              </div>
            </div>

            <div className="selected-block-meta">
              <strong>{displaySectionPath(selectedBlock.section_path) || bundleTitle}</strong>
              <span>
                {UI.blockType}: {roleLabel(selectedBlock.displayRole)}
              </span>
              <span>
                {UI.page}: {selectedBlock.source_page_start}
              </span>
              <span>
                {UI.blockId}: {selectedBlock.block_id}
              </span>
              <span>
                {UI.selected}: {filteredBlocks.findIndex(block => block.block_id === selectedBlock.block_id) + 1} / {visibleBlockCount}
              </span>
            </div>

            <div className="interaction-buttons">
              <button type="button" className="reader-button secondary" onClick={() => setInteractionMode('translate')}>
                {UI.translate}
              </button>
              <button type="button" className="reader-button secondary" onClick={() => setInteractionMode('chat')}>
                {UI.chat}
              </button>
              <button type="button" className="reader-button secondary" onClick={() => setInteractionMode('note')}>
                {UI.note}
              </button>
            </div>

            <div className="future-box">
              <p>{UI.futureTitle}</p>
              <span>
                {interactionMode === 'translate'
                  ? UI.futureTranslate
                  : interactionMode === 'chat'
                    ? UI.futureChat
                    : interactionMode === 'note'
                      ? UI.futureNote
                      : UI.futureBody}
              </span>
            </div>
          </>
        ) : (
          <div className="empty-state small">
            <span>{UI.noBlock}</span>
          </div>
        )}

        <div className="status-line">{message}</div>
      </section>
    </aside>
  );
}
