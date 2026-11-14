const DB_NAME = 'history-map-cache'
const DB_VERSION = 1
const STORE_NAME = 'entities'
const TTL_DAYS = 7

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
  })
}

interface CachedEntity<T> {
  key: string
  value: T
  cachedAt: number
}

/** Default TTL for entity cache (days). Timeline can override with ttlMs. */
export const TTL_MS_ENTITY = TTL_DAYS * 24 * 60 * 60 * 1000
/** 24h TTL for timeline query cache (events by year, on this day) */
export const TTL_MS_TIMELINE = 24 * 60 * 60 * 1000

export async function getCached<T>(
  key: string,
  options?: { ttlMs?: number }
): Promise<T | null> {
  const ttlMs = options?.ttlMs ?? TTL_MS_ENTITY
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const cached = req.result as CachedEntity<T> | undefined
      if (!cached) {
        resolve(null)
        return
      }
      const age = Date.now() - cached.cachedAt
      if (age > ttlMs) {
        resolve(null)
        return
      }
      resolve(cached.value)
    }
  })
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put({ key, value, cachedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
