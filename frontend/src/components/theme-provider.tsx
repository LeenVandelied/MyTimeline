"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps, ReactNode } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider> & {
  children: ReactNode;
};

/**
 * Wrapper client de next-themes.
 * Cible la classe `.dark` sur <html> (le DS « Graphite » écoute `.dark`
 * ET [data-theme="dark"] ; `attribute="class"` suffit donc).
 * Ordre providers imposé (layout root) : Theme > Auth (S7) > Query (S7).
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
