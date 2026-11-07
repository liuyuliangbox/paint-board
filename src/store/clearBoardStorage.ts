import { clearPersistedBoardKeys } from './fileRecord'
import { markForceFreshBoards } from './fileHydration'
import { rebuildKeyvalDatabase } from './idbKeyvalRecovery'
import { idbDelItem, idbListKeys } from './idbKeyvalStore'

/**
 * Recover from unreadable board storage for ordinary users.
 * Always marks the next load as a blank-board start, then best-effort wipes
 * board keys and rebuilds keyval-store (including discarding stale connections).
 * Never throws — UI can always reload.
 */
export const clearCorruptedBoardStorage = async () => {
  markForceFreshBoards()
  try {
    await clearPersistedBoardKeys(
      () => idbListKeys(),
      (key) => idbDelItem(key)
    )
  } catch (error) {
    console.warn('[paint-board] clearPersistedBoardKeys soft-failed', error)
  }
  try {
    await rebuildKeyvalDatabase()
  } catch (error) {
    console.warn('[paint-board] rebuildKeyvalDatabase soft-failed', error)
  }
}
