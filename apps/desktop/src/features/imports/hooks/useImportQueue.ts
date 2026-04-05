import { useWorkspaceSession } from '../../../app/providers/WorkspaceSessionProvider';

export function useImportQueue() {
  return useWorkspaceSession();
}
