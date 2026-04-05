import type { MouseEvent, ReactNode } from 'react';
import type { BundleSummary } from '../../../shared/contracts';
import type { TreeNode } from '../../../shared/lib/libraryTree';
import { bundleLabel } from '../../reader/model/blocks';

type LibraryTreeProps = {
  tree: TreeNode;
  activePath: string | null;
  expandedGroups: Set<string>;
  onToggleGroup: (groupPath: string) => void;
  onOpenBundle: (bundle: BundleSummary) => void;
  onGroupContextMenu: (event: MouseEvent, groupPath: string, label: string) => void;
  onBundleContextMenu: (event: MouseEvent, bundle: BundleSummary) => void;
  parentPath?: string;
};

export function LibraryTree({
  tree,
  activePath,
  expandedGroups,
  onToggleGroup,
  onOpenBundle,
  onGroupContextMenu,
  onBundleContextMenu,
  parentPath = '',
}: LibraryTreeProps): ReactNode {
  return (
    <>
      {[...tree.groups.entries()].map(([key, value]) => {
        const groupPath = parentPath ? `${parentPath}/${key}` : key;
        const isExpanded = expandedGroups.has(groupPath);
        return (
          <div key={groupPath} className="tree-group">
            <button
              type="button"
              className={isExpanded ? 'tree-folder is-open' : 'tree-folder'}
              onClick={() => onToggleGroup(groupPath)}
              onContextMenu={event => onGroupContextMenu(event, groupPath, key)}
              data-group-path={groupPath}
              aria-expanded={isExpanded}
            >
              <span className="tree-folder-icon" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
              <span className="tree-folder-name">{key}</span>
            </button>
            {isExpanded ? (
              <div className="tree-children">
                <LibraryTree
                  tree={value}
                  activePath={activePath}
                  expandedGroups={expandedGroups}
                  onToggleGroup={onToggleGroup}
                  onOpenBundle={onOpenBundle}
                  onGroupContextMenu={onGroupContextMenu}
                  onBundleContextMenu={onBundleContextMenu}
                  parentPath={groupPath}
                />
              </div>
            ) : null}
          </div>
        );
      })}
      {tree.bundles.map(bundle => (
        <button
          key={bundle.path}
          type="button"
          className={bundle.path === activePath ? 'tree-bundle active' : 'tree-bundle'}
          onClick={() => onOpenBundle(bundle)}
          onContextMenu={event => onBundleContextMenu(event, bundle)}
        >
          {bundleLabel(bundle)}
          {bundle.tags && bundle.tags.length > 0 ? <span className="tree-tags">{bundle.tags.join(' · ')}</span> : null}
        </button>
      ))}
    </>
  );
}
