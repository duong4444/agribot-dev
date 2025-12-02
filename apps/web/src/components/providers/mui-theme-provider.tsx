"use client";

import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useTheme } from 'next-themes';
import { useMemo, useEffect, useState } from 'react';

export function MuiThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme: nextTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mounted && nextTheme === 'dark' ? 'dark' : 'light',
        },
      }),
    [nextTheme, mounted]
  );

  if (!mounted) {
    return <>{children}</>;
  }

  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}
