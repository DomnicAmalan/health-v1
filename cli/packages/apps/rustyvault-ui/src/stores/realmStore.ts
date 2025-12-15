import { create } from 'zustand';
import { realmsApi, type Realm } from '@/lib/api/realms';

const REALM_STORAGE_KEY = 'rustyvault_current_realm';

function loadRealmFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REALM_STORAGE_KEY);
}

function saveRealmToStorage(realmId: string | null): void {
  if (typeof window === 'undefined') return;
  if (realmId) {
    localStorage.setItem(REALM_STORAGE_KEY, realmId);
  } else {
    localStorage.removeItem(REALM_STORAGE_KEY);
  }
}

interface RealmState {
  currentRealm: Realm | null;
  realms: Realm[];
  isGlobalMode: boolean;
  isLoading: boolean;
  error: string | null;
}

interface RealmActions {
  fetchRealms: () => Promise<void>;
  setCurrentRealm: (realm: Realm | null) => void;
  setCurrentRealmById: (realmId: string) => Promise<void>;
  clearRealm: () => void;
  setGlobalMode: (enabled: boolean) => void;
  refreshRealms: () => Promise<void>;
}

type RealmStore = RealmState & RealmActions;

const storedRealmId = loadRealmFromStorage();

const initialState: RealmState = {
  currentRealm: null,
  realms: [],
  isGlobalMode: !storedRealmId,
  isLoading: false,
  error: null,
};

export const useRealmStore = create<RealmStore>((set, get) => ({
  ...initialState,

  fetchRealms: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await realmsApi.list();
      const realms = response.realms || [];
      
      set({ realms, isLoading: false });

      // Restore previously selected realm from storage
      const storedId = loadRealmFromStorage();
      if (storedId && !get().currentRealm) {
        const storedRealm = realms.find((r: Realm) => r.id === storedId);
        if (storedRealm) {
          set({ currentRealm: storedRealm, isGlobalMode: false });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch realms';
      set({ error: message, isLoading: false });
    }
  },

  setCurrentRealm: (realm: Realm | null) => {
    saveRealmToStorage(realm?.id || null);
    set({ 
      currentRealm: realm, 
      isGlobalMode: !realm 
    });
  },

  setCurrentRealmById: async (realmId: string) => {
    const { realms, fetchRealms } = get();
    
    // Try to find in existing realms first
    let realm = realms.find((r) => r.id === realmId);
    
    // If not found, fetch fresh list
    if (!realm) {
      await fetchRealms();
      realm = get().realms.find((r) => r.id === realmId);
    }
    
    if (realm) {
      saveRealmToStorage(realmId);
      set({ currentRealm: realm, isGlobalMode: false });
    } else {
      set({ error: `Realm ${realmId} not found` });
    }
  },

  clearRealm: () => {
    saveRealmToStorage(null);
    set({ currentRealm: null, isGlobalMode: true });
  },

  setGlobalMode: (enabled: boolean) => {
    if (enabled) {
      saveRealmToStorage(null);
      set({ currentRealm: null, isGlobalMode: true });
    } else {
      set({ isGlobalMode: false });
    }
  },

  refreshRealms: async () => {
    await get().fetchRealms();
  },
}));

// Hook to get realm-scoped query key suffix
export function useRealmQueryKey(): (string | null)[] {
  const currentRealm = useRealmStore((s) => s.currentRealm);
  return currentRealm ? [currentRealm.id] : ['global'];
}

// Hook to check if we're in a realm context
export function useIsRealmContext(): boolean {
  const currentRealm = useRealmStore((s) => s.currentRealm);
  return !!currentRealm;
}

// Hook to get current realm ID or null for global
export function useCurrentRealmId(): string | null {
  const currentRealm = useRealmStore((s) => s.currentRealm);
  return currentRealm?.id || null;
}

