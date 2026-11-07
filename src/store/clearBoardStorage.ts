import { del, keys } from 'idb-keyval'
import { clearFileHydrationState } from './fileHydration'
import { clearPersistedBoardKeys } from './fileRecord'

/**
 * Wipe local board IndexedDB keys (list, blobs, thumbs) and unlock persist.
 * Caller should reload so zustand rehydrates a clean default board.
 */
export const clearCorruptedBoardStorage = async () => {
  await clearPersistedBoardKeys(
    () => keys(),
    (key) => del(key)
  )
  clearFileHydrationState()
}
