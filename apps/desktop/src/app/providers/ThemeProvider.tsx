import { createContext, useContext, useState } from 'react';
import type { PropsWithChildren } from 'react';

export type ReaderTheme = 'paper' | 'journal' | 'slate';

type ThemeContextValue = {
  theme: ReaderTheme;
  setTheme: (theme: ReaderTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ReaderThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<ReaderTheme>('paper');
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useReaderTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useReaderTheme must be used within ReaderThemeProvider');
  }
  return context;
}
