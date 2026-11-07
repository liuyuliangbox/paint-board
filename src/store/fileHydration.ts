let fileHydrationFailed = false
let filePersistFailed = false

const failureListeners = new Set<() => void>()
const persistListeners = new Set<() => void>()

/** sessionStorage flag: next load skips IndexedDB board read and starts blank. */
export const FORCE_FRESH_BOARDS_KEY = 'PAINT-BOARD-FORCE-FRESH-BOARDS'

export const markForceFreshBoards = () => {
  try {
    sessionStorage.setItem(FORCE_FRESH_BOARDS_KEY, '1')
  } catch {
    // Private mode / blocked storage — caller still best-effort clears IDB.
  }
}

/** True once; removes the flag so later reloads hydrate normally. */
export const consumeForceFreshBoards = () => {
  try {
    if (sessionStorage.getItem(FORCE_FRESH_BOARDS_KEY) === '1') {
      sessionStorage.removeItem(FORCE_FRESH_BOARDS_KEY)
      return true
    }
  } catch {
    // ignore
  }
  return false
}

export const markFileHydrationFailed = () => {
  fileHydrationFailed = true
  const pending = [...failureListeners]
  failureListeners.clear()
  pending.forEach((listener) => listener())
}

export const hasFileHydrationFailed = () => fileHydrationFailed

export const shouldPersistFiles = () =>
  !fileHydrationFailed && !filePersistFailed

export const markFilePersistFailed = () => {
  if (filePersistFailed) {
    return
  }
  filePersistFailed = true
  persistListeners.forEach((listener) => listener())
}

export const hasFilePersistFailed = () => filePersistFailed

/** After clearing corrupt IndexedDB data so a reload can persist again. */
export const clearFileHydrationState = () => {
  fileHydrationFailed = false
  filePersistFailed = false
}

export const subscribeFilePersistFailed = (listener: () => void) => {
  persistListeners.add(listener)
  return () => {
    persistListeners.delete(listener)
  }
}

const subscribeFileHydrationFailed = (listener: () => void) => {
  failureListeners.add(listener)
  return () => {
    failureListeners.delete(listener)
  }
}

/**
 * Zustand 4.4 persist does not set hasHydrated or emit onFinishHydration when
 * storage rejects. Callers still need the wait to end so the UI can show the
 * failure and keep the in-memory files from being written back.
 */
export const waitForHydration = (persist: {
  hasHydrated: () => boolean
  onFinishHydration: (listener: () => void) => () => void
}) => {
  if (persist.hasHydrated() || fileHydrationFailed) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve) => {
    const subscriptions = {
      hydrated: () => {},
      failed: () => {}
    }
    let settled = false
    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      subscriptions.hydrated()
      subscriptions.failed()
      resolve()
    }

    const unsubscribeHydrated = persist.onFinishHydration(finish)
    subscriptions.hydrated = unsubscribeHydrated
    if (settled) {
      unsubscribeHydrated()
      return
    }

    const unsubscribeFailed = subscribeFileHydrationFailed(finish)
    subscriptions.failed = unsubscribeFailed
    if (persist.hasHydrated() || fileHydrationFailed) {
      finish()
    }
  })
}
