/** idb-keyval default database — shared by boards, widgets, thumbs. */
export const IDB_KEYVAL_DB = 'keyval-store'

/**
 * Chromium often surfaces a dead/corrupt IDB as:
 *   DOMException / Error  name=UnknownError  message=Internal error.
 * Retries alone rarely help; deleting the DB and letting idb-keyval recreate it does.
 */
export const isIdbInternalError = (error: unknown) => {
  if (!error) {
    return false
  }
  const name =
    error instanceof Error
      ? error.name
      : typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          typeof (error as { name: unknown }).name === 'string'
        ? (error as { name: string }).name
        : ''
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : String(error)
  return (
    name === 'UnknownError' ||
    /internal error/i.test(message) ||
    /IndexedDatabase/i.test(message)
  )
}

export const waitMs = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

/** Best-effort delete of keyval-store. Resolves even if blocked/errors. */
export const deleteKeyvalDatabase = () =>
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
      request.onblocked = () => finish()
    } catch {
      finish()
    }
  })

/**
 * Drop the broken DB, wait briefly so Chromium finishes teardown, then
 * discard idb-keyval's cached connection so the next get/set opens fresh.
 */
export const rebuildKeyvalDatabase = async () => {
  await deleteKeyvalDatabase()
  await waitMs(120)
  const { resetIdbStore } = await import('./idbKeyvalStore')
  resetIdbStore()
}
