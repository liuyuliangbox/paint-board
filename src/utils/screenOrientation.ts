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

const getOrientation = (): OrientationWithLock | null => {
  if (typeof screen === 'undefined' || !screen.orientation) {
    return null
  }
  return screen.orientation as OrientationWithLock
}

export type LandscapeLayoutResult = {
  ok: boolean
  /** i18n key when the OS could not lock and the viewport is still portrait. */
  hintKey?: string
}

/**
 * Request fullscreen (when needed) and lock landscape orientation.
 * Relies on existing responsive CSS once the viewport becomes wide.
 */
export const enterLandscapeLayout =
  async (): Promise<LandscapeLayoutResult> => {
    if (typeof document === 'undefined') {
      return { ok: false, hintKey: 'operate.landscapeHint' }
    }

    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen()
        enteredFullscreenForLandscape = true
      } catch {
        // Some browsers allow lock without fullscreen; keep going.
      }
    }

    const orientation = getOrientation()
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

/** Unlock orientation; exit fullscreen only if this helper opened it. */
export const exitLandscapeLayout = async (): Promise<void> => {
  const orientation = getOrientation()
  try {
    orientation?.unlock?.()
  } catch {
    // ignore
  }

  if (
    enteredFullscreenForLandscape &&
    typeof document !== 'undefined' &&
    document.fullscreenElement
  ) {
    try {
      await document.exitFullscreen()
    } catch {
      // ignore
    }
  }
  enteredFullscreenForLandscape = false
}

/** Test helper — reset module flags between tests. */
export const resetLandscapeFullscreenFlag = () => {
  enteredFullscreenForLandscape = false
}
