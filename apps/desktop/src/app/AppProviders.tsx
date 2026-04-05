import type { PropsWithChildren } from 'react';
import { AppServicesProvider } from './providers/AppServicesProvider';
import { ReaderThemeProvider } from './providers/ThemeProvider';
import { WorkspaceSessionProvider } from './providers/WorkspaceSessionProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppServicesProvider>
      <ReaderThemeProvider>
        <WorkspaceSessionProvider>{children}</WorkspaceSessionProvider>
      </ReaderThemeProvider>
    </AppServicesProvider>
  );
}
