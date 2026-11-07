import { del, keys } from 'idb-keyval'
import { clearPersistedBoardKeys } from './fileRecord'
import { markForceFreshBoards } from './fileHydration'

/** idb-keyval default database name. */
const IDB_KEYVAL_DB = 'keyval-store'

const deleteKeyvalDatabase = () =>
  new Promise<void>((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve()
      return
    }
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      resolve()
    }
    try {
      const request = indexedDB.deleteDatabase(IDB_KEYVAL_DB)
      request.onsuccess = () => finish()
      request.onerror = () => finish()
      // Other tabs holding the DB open — still continue; force-fresh skips read.
      request.onblocked = () => finish()
    } catch {
      finish()
    }
  })

/**
 * Recover from unreadable board storage for ordinary users.
 * Always marks the next load as a blank-board start, then best-effort wipes
 * board keys and the idb-keyval database. Never throws — UI can always reload.
 */
export const clearCorruptedBoardStorage = async () => {
  markForceFreshBoards()
  try {
    await clearPersistedBoardKeys(
      () => keys(),
      (key) => del(key)
    )
  } catch (error) {
    console.warn('[paint-board] clearPersistedBoardKeys soft-failed', error)
  }
  try {
    await deleteKeyvalDatabase()
  } catch (error) {
    console.warn('[paint-board] deleteDatabase soft-failed', error)
  }
}
