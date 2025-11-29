/**
 * UI Store
 * Non-PHI UI state (sidebar, tabs, filters, etc.)
 * Safe to persist to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
  activeTabId: string | null;
  theme: 'light' | 'dark' | 'system';
  preferences: {
    showMaskedFields: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
  };
}

interface UIActions {
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTabId: (tabId: string | null) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  updatePreferences: (preferences: Partial<UIState['preferences']>) => void;
  resetPreferences: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  sidebarCollapsed: false,
  activeTabId: null,
  theme: 'system',
  preferences: {
    showMaskedFields: true,
    autoRefresh: false,
    refreshInterval: 30000, // 30 seconds
  },
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      setActiveTabId: (tabId: string | null) => {
        set({ activeTabId: tabId });
      },

      setTheme: (theme: 'light' | 'dark' | 'system') => {
        set({ theme });
      },

      updatePreferences: (newPreferences: Partial<UIState['preferences']>) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...newPreferences,
          },
        }));
      },

      resetPreferences: () => {
        set({ preferences: initialState.preferences });
      },
    }),
    {
      name: 'ui-storage', // localStorage key
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        preferences: state.preferences,
        // Don't persist activeTabId
      }),
    }
  )
);

// Selectors
export const useSidebarCollapsed = () => useUIStore((state) => state.sidebarCollapsed);
export const useSetSidebarCollapsed = () => useUIStore((state) => state.setSidebarCollapsed);
export const useTheme = () => useUIStore((state) => state.theme);
export const useSetTheme = () => useUIStore((state) => state.setTheme);
export const useUIPreferences = () => useUIStore((state) => state.preferences);
export const useUpdatePreferences = () => useUIStore((state) => state.updatePreferences);

