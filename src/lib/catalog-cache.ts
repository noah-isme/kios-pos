"use client";

type CachedProduct = {
  id: string;
  name: string;
  sku?: string | null;
  barcode: string;
  price: number;
};

const DB_NAME = "kios-pos";
const STORE_NAME = "catalog";
const DB_VERSION = 1;

const isBrowser = typeof window !== "undefined" && typeof indexedDB !== "undefined";

async function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser) return null;

  return await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "barcode" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runTransaction<T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore) => Promise<T>,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;

  try {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const result = await handler(store);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

export async function cacheProducts(products: CachedProduct[]): Promise<void> {
  if (!products.length) return;
  await runTransaction("readwrite", async (store) => {
    for (const product of products) {
      if (!product.barcode) continue;
      store.put(product);
    }
  });
}

export async function getCachedProductByBarcode(barcode: string): Promise<CachedProduct | null> {
  return await runTransaction("readonly", async (store) => {
    return await new Promise<CachedProduct | null>((resolve, reject) => {
      const request = store.get(barcode);
      request.onsuccess = () => resolve((request.result as CachedProduct | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  });
}

