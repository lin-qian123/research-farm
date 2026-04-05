import { createContext, useContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { createAppServices } from '../services';
import type { AppServices } from '../services/types';

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({ children }: PropsWithChildren) {
  const services = useMemo(() => createAppServices(), []);
  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}

export function useAppServices() {
  const services = useContext(AppServicesContext);
  if (!services) {
    throw new Error('useAppServices must be used within AppServicesProvider');
  }
  return services;
}
