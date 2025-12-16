 import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarCollapsed: boolean;
}

interface UIActions {
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
  sidebarCollapsed: false,
};

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      ...initialState,

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },
    }),
    {
      name: 'rustyvault-ui-state',
    }
  )
);
