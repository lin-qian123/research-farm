import { UI } from '../../../app/uiCopy';
import type { BundleSummary } from '../../../shared/contracts';
import type { TreeNode } from '../../../shared/lib/libraryTree';

export type LibraryDialogState =
  | { kind: 'rename-group'; groupPath: string; value: string }
  | { kind: 'set-tags'; bundle: BundleSummary; value: string }
  | { kind: 'move-bundle'; bundle: BundleSummary; value: string }
  | null;

function GroupPicker({
  tree,
  selectedPath,
  onSelect,
  parentPath = '',
}: {
  tree: TreeNode;
  selectedPath: string;
  onSelect: (groupPath: string) => void;
  parentPath?: string;
}) {
  const groups = [...tree.groups.entries()];
  if (groups.length === 0 && !parentPath) {
    return (
      <div className="group-picker-empty">
        <span>{UI.rootFolder}</span>
      </div>
    );
  }

  return (
    <>
      {!parentPath ? (
        <button
          type="button"
          className={selectedPath === '' ? 'group-picker-item active' : 'group-picker-item'}
          onClick={() => onSelect('')}
        >
          {UI.rootFolder}
        </button>
      ) : null}
      {groups.map(([key, value]) => {
        const groupPath = parentPath ? `${parentPath}/${key}` : key;
        return (
          <div key={groupPath} className="group-picker-node">
            <button
              type="button"
              className={selectedPath === groupPath ? 'group-picker-item active' : 'group-picker-item'}
              onClick={() => onSelect(groupPath)}
            >
              {key}
            </button>
            {value.groups.size > 0 ? (
              <div className="group-picker-children">
                <GroupPicker tree={value} selectedPath={selectedPath} onSelect={onSelect} parentPath={groupPath} />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

type LibraryDialogProps = {
  state: LibraryDialogState;
  tree: TreeNode;
  onClose: () => void;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
};

export function LibraryDialog({ state, tree, onClose, onChange, onSubmit }: LibraryDialogProps) {
  if (!state) return null;

  return (
    <div className="library-dialog-backdrop" onClick={onClose}>
      <div className="library-dialog" onClick={event => event.stopPropagation()}>
        <div className="panel-header">
          <p>
            {state.kind === 'rename-group'
              ? UI.renameFolder
              : state.kind === 'set-tags'
                ? UI.setTags
                : UI.moveToFolder}
          </p>
        </div>
        <input
          className="library-dialog-input"
          value={state.value}
          onChange={event => onChange(event.target.value)}
          placeholder={state.kind === 'set-tags' ? '例如 physics, QED, review' : ''}
          autoFocus
        />
        {state.kind === 'move-bundle' ? (
          <div className="group-picker-shell">
            <p className="group-picker-hint">{UI.moveFolderHint}</p>
            <div className="group-picker-tree">
              <GroupPicker tree={tree} selectedPath={state.value} onSelect={onChange} />
            </div>
          </div>
        ) : null}
        <div className="library-dialog-actions">
          <button type="button" className="reader-button ghost" onClick={onClose}>
            {UI.actionCancel}
          </button>
          <button type="button" className="reader-button primary" onClick={onSubmit}>
            {UI.actionSave}
          </button>
        </div>
      </div>
    </div>
  );
}
