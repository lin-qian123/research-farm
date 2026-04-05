import { useWorkspaceSession } from '../../../app/providers/WorkspaceSessionProvider';

export function useBlockActions() {
  return useWorkspaceSession();
}
