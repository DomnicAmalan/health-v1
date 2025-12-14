/**
 * Pre-configured Translation Providers for each app
 * Apps can import and use these directly without creating their own
 */

import type { ReactNode } from "react";
import { TranslationProvider } from "./TranslationProvider";
import { adminTranslations, vaultTranslations, clientTranslations } from "./translations";

export interface AppTranslationProviderProps {
  children: ReactNode;
  defaultLocale?: string;
}

/**
 * Translation Provider for Admin App
 */
export function AdminTranslationProvider({ 
  children, 
  defaultLocale = "en" 
}: AppTranslationProviderProps) {
  return (
    <TranslationProvider translations={adminTranslations} defaultLocale={defaultLocale}>
      {children}
    </TranslationProvider>
  );
}

/**
 * Translation Provider for Lazarus Life Vault
 */
export function VaultTranslationProvider({ 
  children, 
  defaultLocale = "en" 
}: AppTranslationProviderProps) {
  return (
    <TranslationProvider translations={vaultTranslations} defaultLocale={defaultLocale}>
      {children}
    </TranslationProvider>
  );
}

/**
 * Translation Provider for Client App
 */
export function ClientTranslationProvider({ 
  children, 
  defaultLocale = "en" 
}: AppTranslationProviderProps) {
  return (
    <TranslationProvider translations={clientTranslations} defaultLocale={defaultLocale}>
      {children}
    </TranslationProvider>
  );
}
