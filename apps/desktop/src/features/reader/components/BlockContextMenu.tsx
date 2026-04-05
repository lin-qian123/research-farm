import type { RefObject } from 'react';
import { UI } from '../../../app/uiCopy';
import type { ReaderBlock } from '../model/blocks';

export type BlockContextMenuState = {
  x: number;
  y: number;
  block: ReaderBlock;
} | null;

type BlockContextMenuProps = {
  state: BlockContextMenuState;
  menuRef: RefObject<HTMLDivElement | null>;
  onCopy: (block: ReaderBlock) => void;
  onEdit: (block: ReaderBlock) => void;
};

export function BlockContextMenu({ state, menuRef, onCopy, onEdit }: BlockContextMenuProps) {
  if (!state) return null;

  return (
    <div
      ref={menuRef}
      className="library-context-menu"
      style={{ left: `${state.x}px`, top: `${state.y}px` }}
    >
      <button
        type="button"
        className="library-context-item"
        onClick={() => onCopy(state.block)}
      >
        {UI.copyBlock}
      </button>
      <button
        type="button"
        className="library-context-item"
        onClick={() => onEdit(state.block)}
      >
        {UI.editBlock}
      </button>
    </div>
  );
}
