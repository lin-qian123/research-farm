import { useWorkspaceSession } from '../../../app/providers/WorkspaceSessionProvider';

export function useReader() {
  return useWorkspaceSession();
}
