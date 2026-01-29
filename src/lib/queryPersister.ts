import { openDB, deleteDB } from "idb";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const DB_NAME = "thundderrdex-cache";
const STORE_NAME = "query-cache";
const CACHE_KEY = "tanstack-query";

/**
 * Clear all cached data from IndexedDB
 * Returns true if successful, false if there was an error
 */
export async function clearAllCache(): Promise<boolean> {
  try {
    // Delete the entire IndexedDB database
    await deleteDB(DB_NAME);
    return true;
  } catch (error) {
    console.error("Failed to clear cache:", error);
    return false;
  }
}

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        const db = await openDB(DB_NAME, 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          },
        });
        await db.put(STORE_NAME, client, CACHE_KEY);
      } catch (error) {
        console.error("Failed to persist query cache:", error);
      }
    },
    restoreClient: async () => {
      try {
        const db = await openDB(DB_NAME, 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          },
        });
        return await db.get(STORE_NAME, CACHE_KEY);
      } catch (error) {
        console.error("Failed to restore query cache:", error);
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        const db = await openDB(DB_NAME, 1);
        await db.delete(STORE_NAME, CACHE_KEY);
      } catch (error) {
        console.error("Failed to remove query cache:", error);
      }
    },
  };
}
