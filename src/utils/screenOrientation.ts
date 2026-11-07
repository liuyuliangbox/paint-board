/** Narrow phone portrait: long-edge left/right rails + overlay mutex. */
export const NARROW_PORTRAIT_MQ =
  '(max-width: 750px) and (orientation: portrait)'

/** True when the viewport is wider than tall (real window after rotate/lock). */
export const isViewportLandscape = (
  width = typeof window !== 'undefined' ? window.innerWidth : 0,
  height = typeof window !== 'undefined' ? window.innerHeight : 0
) => width > height

type OrientationWithLock = ScreenOrientation & {
  lock?: (
    orientation:
      | 'any'
      | 'natural'
      | 'landscape'
      | 'portrait'
      | 'portrait-primary'
      | 'portrait-secondary'
      | 'landscape-primary'
      | 'landscape-secondary'
  ) => Promise<void>
}

let enteredFullscreenForLandscape = false
let pendingFsExitCleanup: (() => void) | null = null

const getOrientation = (): OrientationWithLock | null => {
  if (typeof screen === 'undefined' || !screen.orientation) {
    return null
  }
  return screen.orientation as OrientationWithLock
}

const waitMs = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })

const clearPendingFsExit = () => {
  if (pendingFsExitCleanup) {
    pendingFsExitCleanup()
    pendingFsExitCleanup = null
  }
}

const exitFullscreenQuietly = async () => {
  if (typeof document === 'undefined' || !document.fullscreenElement) {
    return
  }
  try {
    await document.exitFullscreen()
  } catch {
    // ignore
  }
}

/**
 * Exit the fullscreen we opened for landscape lock.
 * Only leave fullscreen after the viewport is portrait — exiting FS while
 * still landscape often makes mobile Chrome/Safari switch to “desktop site”.
 * Do not force-exit on a timer; wait for the user to rotate (or for lock to
 * restore portrait).
 */
const scheduleLandscapeFullscreenExit = () => {
  clearPendingFsExit()
  if (!enteredFullscreenForLandscape) {
    return
  }

  const finish = () => {
    clearPendingFsExit()
    enteredFullscreenForLandscape = false
    void exitFullscreenQuietly()
  }

  if (!isViewportLandscape()) {
    finish()
    return
  }

  const onResize = () => {
    if (!isViewportLandscape()) {
      finish()
    }
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  const orientation = getOrientation()
  orientation?.addEventListener?.('change', onResize)
  pendingFsExitCleanup = () => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
    orientation?.removeEventListener?.('change', onResize)
  }
}

export type LandscapeLayoutResult = {
  ok: boolean
  /** i18n key when the OS could not lock and the viewport is still portrait. */
  hintKey?: string
}

/**
 * Prefer orientation.lock alone; only enter fullscreen when the browser
 * requires it for lock (common on Chromium mobile).
 */
export const enterLandscapeLayout =
  async (): Promise<LandscapeLayoutResult> => {
    if (typeof document === 'undefined') {
      return { ok: false, hintKey: 'operate.landscapeHint' }
    }

    clearPendingFsExit()
    const orientation = getOrientation()

    if (orientation?.lock) {
      try {
        await orientation.lock('landscape')
        return { ok: true }
      } catch {
        // Many mobile browsers require fullscreen before lock.
      }
    }

    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
        enteredFullscreenForLandscape = true
      } catch {
        // Some browsers allow lock without fullscreen; keep going.
      }
    }

    if (orientation?.lock) {
      try {
        await orientation.lock('landscape')
        return { ok: true }
      } catch {
        // Fall through to viewport check / hint.
      }
    }

    if (isViewportLandscape()) {
      return { ok: true }
    }

    return { ok: false, hintKey: 'operate.landscapeHint' }
  }

/** Unlock orientation; defer fullscreen exit if still landscape. */
export const exitLandscapeLayout = async (): Promise<void> => {
  const orientation = getOrientation()
  // Prefer locking back to portrait before leaving fullscreen — unlock alone
  // often leaves the phone landscape, and exiting FS then triggers desktop UI.
  if (orientation?.lock) {
    try {
      await orientation.lock('portrait')
    } catch {
      try {
        orientation.unlock?.()
      } catch {
        // ignore
      }
    }
  } else {
    try {
      orientation?.unlock?.()
    } catch {
      // ignore
    }
  }

  await waitMs(120)
  scheduleLandscapeFullscreenExit()
}

/** Test helper — reset module flags between tests. */
export const resetLandscapeFullscreenFlag = () => {
  clearPendingFsExit()
  enteredFullscreenForLandscape = false
}
