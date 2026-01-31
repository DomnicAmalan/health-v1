/**
 * Persistence Middleware for Zustand
 * Persists state to sessionStorage or localStorage
 */

import type { StateCreator } from "zustand";

/**
 * Storage type
 */
export type StorageType = "session" | "local";

/**
 * Configuration for persistence middleware
 */
export interface PersistenceMiddlewareConfig<T> {
  /** Storage key */
  key: string;
  /** Storage type (session or local) */
  storage?: StorageType;
  /** Fields to persist (if not specified, persists entire state) */
  fields?: Array<keyof T>;
  /** Fields to exclude from persistence */
  excludeFields?: Array<keyof T>;
  /** Callback when state is restored */
  onRestore?: (state: Partial<T>) => void;
  /** Whether to enable persistence (default: true) */
  enabled?: boolean;
}

/**
 * Get storage object based on type
 */
function getStorage(type: StorageType): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  return type === "session" ? sessionStorage : localStorage;
}

/**
 * Load state from storage
 */
function loadFromStorage<T>(
  key: string,
  storage: Storage | null
): Partial<T> | null {
  if (!storage) {
    return null;
  }

  try {
    const stored = storage.getItem(key);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as Partial<T>;
  } catch (error) {
    console.error(`[PersistenceMiddleware] Failed to load state from ${key}:`, error);
    return null;
  }
}

/**
 * Save state to storage
 */
function saveToStorage<T>(
  key: string,
  state: Partial<T>,
  storage: Storage | null
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error(`[PersistenceMiddleware] Failed to save state to ${key}:`, error);
  }
}

/**
 * Filter state based on fields configuration
 */
function filterState<T extends Record<string, unknown>>(
  state: T,
  fields?: Array<keyof T>,
  excludeFields?: Array<keyof T>
): Partial<T> {
  const result: Partial<T> = {};

  // If fields specified, only include those
  if (fields && fields.length > 0) {
    for (const field of fields) {
      if (field in state) {
        result[field] = state[field];
      }
    }
    return result;
  }

  // Otherwise, include all except excluded
  for (const [key, value] of Object.entries(state)) {
    const typedKey = key as keyof T;
    if (!excludeFields || !excludeFields.includes(typedKey)) {
      result[typedKey] = value as T[keyof T];
    }
  }

  return result;
}

/**
 * Create persistence middleware for Zustand stores
 *
 * @example
 * ```typescript
 * import { create } from 'zustand';
 * import { createPersistenceMiddleware } from '@lazarus-life/shared/middleware';
 *
 * interface AuthState {
 *   user: User | null;
 *   token: string | null;
 *   isAuthenticated: boolean;
 * }
 *
 * const persistenceMiddleware = createPersistenceMiddleware<AuthState>({
 *   key: 'auth_state',
 *   storage: 'session',
 *   fields: ['user', 'token', 'isAuthenticated'],
 * });
 *
 * const useAuthStore = create(
 *   persistenceMiddleware(
 *     (set) => ({
 *       user: null,
 *       token: null,
 *       isAuthenticated: false,
 *       login: (user, token) => set({ user, token, isAuthenticated: true }),
 *     })
 *   )
 * );
 * ```
 */
export function createPersistenceMiddleware<T>(
  config: PersistenceMiddlewareConfig<T>
) {
  const {
    key,
    storage: storageType = "session",
    fields,
    excludeFields,
    onRestore,
    enabled = true,
  } = config;

  return function persistenceMiddleware(
    stateCreator: StateCreator<T>
  ): StateCreator<T> {
    return (set, get, api) => {
      if (!enabled) {
        return stateCreator(set, get, api);
      }

      const storage = getStorage(storageType);

      // Restore state from storage on initialization
      const restoredState = loadFromStorage<T>(key, storage);
      if (restoredState) {
        // Merge restored state with initial state
        try {
          if (onRestore) {
            onRestore(restoredState);
          }
        } catch (error) {
          console.error("[PersistenceMiddleware] Error in onRestore callback:", error);
        }
      }

      // Wrap the set function to persist after each update
      const wrappedSet: typeof set = (partial, replace) => {
        // Call original set with proper typing
        // @ts-expect-error - Zustand's set typing is complex, this is safe
        set(partial, replace);

        // Save to storage after state update
        const currentState = get();
        const stateToPersist = filterState(
          currentState as T & Record<string, unknown>,
          fields,
          excludeFields
        );
        saveToStorage(key, stateToPersist, storage);
      };

      // Create the store with wrapped set
      const store = stateCreator(wrappedSet, get, api);

      // If we have restored state, merge it into the initial state
      if (restoredState) {
        // Merge partial state from storage (type-safe with partial)
        wrappedSet(restoredState as Partial<T>);
      }

      return store;
    };
  };
}

/**
 * Clear persisted state from storage
 */
export function clearPersistedState(key: string, storage: StorageType = "session"): void {
  const storageObj = getStorage(storage);
  if (storageObj) {
    storageObj.removeItem(key);
  }
}
