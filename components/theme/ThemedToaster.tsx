'use client';

import { Toaster } from 'sonner';
import { useTheme } from './ThemeProvider';

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      position="top-right"
      richColors
      theme={resolvedTheme}
      closeButton
      toastOptions={{
        className: 'font-sans text-xs shadow-xl border border-slate-200 dark:border-slate-800',
      }}
    />
  );
}
