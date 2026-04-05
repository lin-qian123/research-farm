import type { RefObject } from 'react';
import { UI } from '../../../app/uiCopy';
import type { BundleSummary } from '../../../shared/contracts';

export type LibraryContextTarget =
  | { kind: 'group'; groupPath: string; label: string }
  | { kind: 'bundle'; bundle: BundleSummary };

export type LibraryContextMenuState = {
  x: number;
  y: number;
  target: LibraryContextTarget;
} | null;

type LibraryContextMenuProps = {
  state: LibraryContextMenuState;
  menuRef: RefObject<HTMLDivElement | null>;
  onRenameGroup: (groupPath: string, label: string) => void;
  onSetTags: (bundle: BundleSummary) => void;
  onMoveToFolder: (bundle: BundleSummary) => void;
};

export function LibraryContextMenu({
  state,
  menuRef,
  onRenameGroup,
  onSetTags,
  onMoveToFolder,
}: LibraryContextMenuProps) {
  if (!state) return null;

  return (
    <div
      ref={menuRef}
      className="library-context-menu"
      style={{ left: `${state.x}px`, top: `${state.y}px` }}
    >
      {state.target.kind === 'group' ? (
        <button
          type="button"
          className="library-context-item"
          onClick={() => onRenameGroup(state.target.groupPath, state.target.label)}
        >
          {UI.renameFolder}
        </button>
      ) : (
        <>
          <button
            type="button"
            className="library-context-item"
            onClick={() => onSetTags(state.target.bundle)}
          >
            {UI.setTags}
          </button>
          <button
            type="button"
            className="library-context-item"
            onClick={() => onMoveToFolder(state.target.bundle)}
          >
            {UI.moveToFolder}
          </button>
        </>
      )}
    </div>
  );
}
