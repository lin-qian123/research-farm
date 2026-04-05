import type { MouseEvent } from 'react';
import { UI } from '../../../app/uiCopy';
import type { BundleSummary } from '../../../shared/contracts';
import type { TreeNode } from '../../../shared/lib/libraryTree';
import { OutlinePanel } from '../../reader/components/OutlinePanel';
import { LibraryTree } from './LibraryTree';

export type LeftRailPanel = 'library' | 'outline';

type LibraryPanelProps = {
  activePanel: LeftRailPanel;
  bundles: BundleSummary[];
  tree: TreeNode;
  activeBundlePath: string | null;
  expandedGroups: Set<string>;
  tocEntries: { blockId: string; label: string }[];
  selectedBlockId: string | null;
  onToggleGroup: (groupPath: string) => void;
  onOpenBundle: (bundle: BundleSummary) => void;
  onNavigateToBlock: (blockId: string) => void;
  onGroupContextMenu: (event: MouseEvent, groupPath: string, label: string) => void;
  onBundleContextMenu: (event: MouseEvent, bundle: BundleSummary) => void;
};

export function LibraryPanel({
  activePanel,
  bundles,
  tree,
  activeBundlePath,
  expandedGroups,
  tocEntries,
  selectedBlockId,
  onToggleGroup,
  onOpenBundle,
  onNavigateToBlock,
  onGroupContextMenu,
  onBundleContextMenu,
}: LibraryPanelProps) {
  return (
    <aside className="left-rail">
      <section className="rail-panel">
        <div className="panel-header">
          <p>{activePanel === 'library' ? UI.library : UI.outline}</p>
        </div>
        {activePanel === 'library' ? (
          bundles.length > 0 ? (
            <div className="tree-root">
              <LibraryTree
                tree={tree}
                activePath={activeBundlePath}
                expandedGroups={expandedGroups}
                onToggleGroup={onToggleGroup}
                onOpenBundle={onOpenBundle}
                onGroupContextMenu={onGroupContextMenu}
                onBundleContextMenu={onBundleContextMenu}
              />
            </div>
          ) : (
            <div className="empty-state">
              <strong>{UI.noBundles}</strong>
              <span>{UI.noBundlesHint}</span>
            </div>
          )
        ) : (
          <OutlinePanel
            tocEntries={tocEntries}
            selectedBlockId={selectedBlockId}
            onNavigateToBlock={onNavigateToBlock}
          />
        )}
      </section>
    </aside>
  );
}
