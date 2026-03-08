// ============================================================================
// Per-key async lock for serializing read-modify-write operations
// ============================================================================
//
// Prevents race conditions when multiple async operations try to
// read-modify-write the same AsyncStorage key concurrently.
//
// Usage:
//   const result = await withKeyLock('some-key', async () => {
//     const data = await safeGetItem(key, []);
//     data.push(newItem);
//     await safeSetItem(key, data);
//     return data;
//   });
//
// ============================================================================

const locks = new Map<string, Promise<any>>();

/**
 * Execute an async operation while holding an exclusive lock on a key.
 * If another operation is already holding the lock for the same key,
 * this call waits for it to complete before starting.
 */
export async function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  // Wait for any existing lock on this key
  const existing = locks.get(key);

  const execute = async () => {
    if (existing) {
      // Wait for the previous operation to finish (ignore its result/error)
      await existing.catch(() => {});
    }
    return fn();
  };

  const promise = execute();
  locks.set(key, promise);

  try {
    return await promise;
  } finally {
    // Only clean up if we're still the latest lock holder
    if (locks.get(key) === promise) {
      locks.delete(key);
    }
  }
}
