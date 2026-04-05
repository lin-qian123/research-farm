import { useWorkspaceSession } from '../../../app/providers/WorkspaceSessionProvider';
import { buildBundleTree } from '../../../shared/lib/libraryTree';

export function useLibrary() {
  const session = useWorkspaceSession();
  const tree = buildBundleTree(session.bundles);

  return {
    ...session,
    tree,
  };
}
