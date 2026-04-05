import { UI } from '../../../app/uiCopy';
import type { TocEntry } from '../model/blocks';

type OutlinePanelProps = {
  tocEntries: TocEntry[];
  selectedBlockId: string | null;
  onNavigateToBlock: (blockId: string) => void;
};

export function OutlinePanel({ tocEntries, selectedBlockId, onNavigateToBlock }: OutlinePanelProps) {
  if (tocEntries.length === 0) {
    return (
      <div className="empty-state small">
        <span>{UI.noHeadings}</span>
      </div>
    );
  }

  return (
    <div className="toc-list">
      {tocEntries.map(entry => (
        <button
          key={entry.blockId}
          type="button"
          className={selectedBlockId === entry.blockId ? 'toc-item active' : 'toc-item'}
          onClick={() => onNavigateToBlock(entry.blockId)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
