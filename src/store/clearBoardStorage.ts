import { del, keys } from 'idb-keyval'
import { clearPersistedBoardKeys } from './fileRecord'

/**
 * Wipe local board IndexedDB keys (list, blobs, thumbs).
 * Keep the hydration-failed lock until reload so in-memory junk cannot be
 * written back between clear and navigation. Fresh load with empty storage
 * hydrates the default board.
 */
export const clearCorruptedBoardStorage = async () => {
  await clearPersistedBoardKeys(
    () => keys(),
    (key) => del(key)
  )
}
