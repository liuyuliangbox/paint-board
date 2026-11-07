import { canvasSizeForOrientation } from '@/utils/canvasOrientation'
import { isViewportLandscape } from '@/utils/screenOrientation'

export type LandscapeSessionMode =
  | 'idle'
  | 'entering'
  | 'active'
  | 'exiting'
  | 'recovering'

export type LandscapeSessionState = {
  mode: LandscapeSessionMode
  ownsFullscreen: boolean
  hintKey: string | null
}

export type ApplyCanvasFn = (
  landscape: boolean,
  viewportWidth: number,
  viewportHeight: number
) => void

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
  unlock?: () => void
}

type SessionInternal = LandscapeSessionState & {
  applyCanvas: ApplyCanvasFn | null
  cleanups: Set<() => void>
  fsListenerAttached: boolean
  hintClearTimer: number | null
  generation: number
}

const state: SessionInternal = {
  mode: 'idle',
  ownsFullscreen: false,
  hintKey: null,
  applyCanvas: null,
  cleanups: new Set(),
  fsListenerAttached: false,
  hintClearTimer: null,
  generation: 0
}

const listeners = new Set<() => void>()

/** Cached for useSyncExternalStore — must keep referential equality when unchanged. */
let snapshot: LandscapeSessionState = {
  mode: 'idle',
  ownsFullscreen: false,
  hintKey: null
}

const refreshSnapshot = () => {
  if (
    snapshot.mode === state.mode &&
    snapshot.ownsFullscreen === state.ownsFullscreen &&
    snapshot.hintKey === state.hintKey
  ) {
    return
  }
  snapshot = {
    mode: state.mode,
    ownsFullscreen: state.ownsFullscreen,
    hintKey: state.hintKey
  }
}

const notify = () => {
  refreshSnapshot()
  listeners.forEach((listener) => listener())
}

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

const addCleanup = (fn: () => void) => {
  state.cleanups.add(fn)
  return () => {
    state.cleanups.delete(fn)
  }
}

const runCleanups = () => {
  state.cleanups.forEach((fn) => {
    try {
      fn()
    } catch {
      // ignore
    }
  })
  state.cleanups.clear()
}

const clearHintTimer = () => {
  if (state.hintClearTimer !== null) {
    window.clearTimeout(state.hintClearTimer)
    state.hintClearTimer = null
  }
}

const setHint = (hintKey: string | null, clearAfterMs?: number) => {
  clearHintTimer()
  state.hintKey = hintKey
  notify()
  if (hintKey && clearAfterMs && clearAfterMs > 0) {
    state.hintClearTimer = window.setTimeout(() => {
      state.hintClearTimer = null
      if (state.hintKey === hintKey) {
        state.hintKey = null
        notify()
      }
    }, clearAfterMs)
  }
}

const setMode = (mode: LandscapeSessionMode) => {
  state.mode = mode
  notify()
}

const measure = () => ({
  width: window.innerWidth,
  height: window.innerHeight
})

const applyCanvasNow = (landscape: boolean) => {
  const { width, height } = measure()
  const matched = landscape
    ? isViewportLandscape(width, height)
    : !isViewportLandscape(width, height)
  if (!matched) {
    return false
  }
  state.applyCanvas?.(landscape, width, height)
  return true
}

const applyPortraitFallback = () => {
  const { width, height } = measure()
  const vw = Math.min(width, height)
  const vh = Math.max(width, height)
  state.applyCanvas?.(false, vw, vh)
}

/**
 * Wait until viewport matches target orientation, then resolve with size.
 * Soft timeout: resolve with matched=false so callers can hint without hanging.
 */
const waitForViewport = (
  wantLandscape: boolean,
  timeoutMs = 4500
): Promise<{ width: number; height: number; matched: boolean }> =>
  new Promise((resolve) => {
    let settled = false

    const finish = (matched: boolean) => {
      if (settled) {
        return
      }
      settled = true
      remove()
      const { width, height } = measure()
      resolve({ width, height, matched })
    }

    const check = () => {
      const { width, height } = measure()
      const landscape = isViewportLandscape(width, height)
      if (wantLandscape ? landscape : !landscape) {
        finish(true)
      }
    }

    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    const orientation = getOrientation()
    orientation?.addEventListener?.('change', check)
    const timer = window.setTimeout(() => finish(false), timeoutMs)

    const remove = addCleanup(() => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
      orientation?.removeEventListener?.('change', check)
      window.clearTimeout(timer)
    })

    check()
  })

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

const lockOrientation = async (
  target: 'landscape' | 'portrait'
): Promise<boolean> => {
  const orientation = getOrientation()
  if (!orientation?.lock) {
    return false
  }
  try {
    await orientation.lock(target)
    return true
  } catch {
    return false
  }
}

const unlockOrientation = () => {
  try {
    getOrientation()?.unlock?.()
  } catch {
    // ignore
  }
}

const ensureFsListener = () => {
  if (state.fsListenerAttached || typeof document === 'undefined') {
    return
  }
  document.addEventListener('fullscreenchange', onFullscreenChange)
  state.fsListenerAttached = true
}

const onFullscreenChange = () => {
  if (typeof document === 'undefined') {
    return
  }
  // OS back / user left FS while we owned it for landscape → recover.
  if (
    state.ownsFullscreen &&
    !document.fullscreenElement &&
    (state.mode === 'active' || state.mode === 'entering')
  ) {
    void recoverFromFullscreenLoss()
    return
  }
  if (!document.fullscreenElement && state.ownsFullscreen) {
    state.ownsFullscreen = false
    notify()
  }
}

const finishToIdle = () => {
  runCleanups()
  setActiveViewportListening(false)
  state.ownsFullscreen = false
  state.mode = 'idle'
  notify()
}

/**
 * Exit FS we opened only after the viewport is portrait — exiting while still
 * landscape often flips mobile Chrome/Safari to “desktop site”.
 */
const exitOwnedFullscreenWhenPortrait = () => {
  if (!state.ownsFullscreen) {
    return
  }
  if (!document.fullscreenElement) {
    state.ownsFullscreen = false
    return
  }
  const leaveFs = () => {
    if (!state.ownsFullscreen) {
      return
    }
    state.ownsFullscreen = false
    void exitFullscreenQuietly()
  }
  if (!isViewportLandscape()) {
    leaveFs()
    return
  }
  const onResize = () => {
    if (!isViewportLandscape()) {
      leaveFs()
    }
  }
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
  const orientation = getOrientation()
  orientation?.addEventListener?.('change', onResize)
  addCleanup(() => {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('orientationchange', onResize)
    orientation?.removeEventListener?.('change', onResize)
  })
}

/**
 * After OS back: unlock, never re-enter FS, apply canvas for current viewport;
 * if still landscape wait for portrait then apply portrait ratios.
 */
const recoverFromFullscreenLoss = async () => {
  const gen = ++state.generation
  runCleanups()
  setActiveViewportListening(false)
  state.ownsFullscreen = false
  setMode('recovering')
  unlockOrientation()
  await lockOrientation('portrait')
  await waitMs(80)
  if (gen !== state.generation) {
    return
  }

  if (applyCanvasNow(false)) {
    setHint(null)
    finishToIdle()
    return
  }

  applyCanvasNow(true)
  setHint('operate.portraitHint', 3600)
  const wait = await waitForViewport(false)
  if (gen !== state.generation) {
    return
  }
  if (wait.matched) {
    state.applyCanvas?.(false, wait.width, wait.height)
  } else {
    applyPortraitFallback()
  }
  setHint(null)
  finishToIdle()
}

/** While session is active, physical rotate to portrait completes exit. */
const onActiveViewportCheck = () => {
  if (state.mode !== 'active') {
    return
  }
  if (!isViewportLandscape()) {
    void endLandscapeSession({ fromPhysicalRotate: true })
  }
}

let activeViewportListening = false

const setActiveViewportListening = (on: boolean) => {
  if (on === activeViewportListening || typeof window === 'undefined') {
    return
  }
  activeViewportListening = on
  if (on) {
    window.addEventListener('resize', onActiveViewportCheck)
    window.addEventListener('orientationchange', onActiveViewportCheck)
    getOrientation()?.addEventListener?.('change', onActiveViewportCheck)
  } else {
    window.removeEventListener('resize', onActiveViewportCheck)
    window.removeEventListener('orientationchange', onActiveViewportCheck)
    getOrientation()?.removeEventListener?.('change', onActiveViewportCheck)
  }
}

export const configureLandscapeSession = (opts: {
  applyCanvas: ApplyCanvasFn
}) => {
  state.applyCanvas = opts.applyCanvas
  ensureFsListener()
}

export const getLandscapeSession = (): LandscapeSessionState => {
  refreshSnapshot()
  return snapshot
}

/** Session owns landscape chrome toggle (not mere viewport geometry). */
export const isLandscapeSessionActive = () => state.mode !== 'idle'

export const subscribeLandscapeSession = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export type StartLandscapeResult = {
  ok: boolean
  hintKey?: string
}

export const startLandscapeSession =
  async (): Promise<StartLandscapeResult> => {
    if (typeof document === 'undefined') {
      return { ok: false, hintKey: 'operate.landscapeHint' }
    }
    if (state.mode !== 'idle') {
      return { ok: state.mode === 'active' || state.mode === 'entering' }
    }

    ensureFsListener()
    const gen = ++state.generation
    runCleanups()
    setHint(null)
    setMode('entering')

    let locked = await lockOrientation('landscape')

    if (!locked) {
      if (!document.fullscreenElement) {
        try {
          await document.documentElement.requestFullscreen()
          if (gen !== state.generation) {
            return { ok: false }
          }
          state.ownsFullscreen = true
          notify()
        } catch {
          // Some browsers allow lock without fullscreen.
        }
      }
      locked = await lockOrientation('landscape')
    }

    if (gen !== state.generation) {
      return { ok: false }
    }

    const alreadyLandscape = isViewportLandscape()
    if (!locked && !alreadyLandscape) {
      // Clear ownership before exitFullscreen so fullscreenchange does not
      // kick recoverFromFullscreenLoss while we abort enter.
      if (state.ownsFullscreen) {
        state.ownsFullscreen = false
        await exitFullscreenQuietly()
      }
      setMode('idle')
      setHint('operate.landscapeHint', 2800)
      return { ok: false, hintKey: 'operate.landscapeHint' }
    }

    if (!alreadyLandscape) {
      const wait = await waitForViewport(true, 2500)
      if (gen !== state.generation) {
        return { ok: false }
      }
      if (wait.matched) {
        state.applyCanvas?.(true, wait.width, wait.height)
      } else {
        const { width, height } = measure()
        if (isViewportLandscape(width, height)) {
          state.applyCanvas?.(true, width, height)
        } else {
          state.applyCanvas?.(true, height, width)
        }
      }
    } else {
      applyCanvasNow(true)
    }

    if (gen !== state.generation) {
      return { ok: false }
    }

    setMode('active')
    setActiveViewportListening(true)
    return { ok: true }
  }

export type EndLandscapeOptions = {
  fromPhysicalRotate?: boolean
}

export const endLandscapeSession = async (
  options: EndLandscapeOptions = {}
): Promise<void> => {
  if (state.mode === 'idle' || state.mode === 'exiting') {
    return
  }

  const gen = ++state.generation
  setActiveViewportListening(false)
  runCleanups()
  setMode('exiting')

  if (!options.fromPhysicalRotate) {
    // Prefer portrait lock; unlock if lock fails so the device can rotate.
    const locked = await lockOrientation('portrait')
    if (!locked) {
      unlockOrientation()
    }
  } else {
    unlockOrientation()
  }
  await waitMs(120)
  if (gen !== state.generation) {
    return
  }

  exitOwnedFullscreenWhenPortrait()

  if (applyCanvasNow(false)) {
    setHint(null)
    if (state.ownsFullscreen && document.fullscreenElement) {
      state.ownsFullscreen = false
      await exitFullscreenQuietly()
    }
    finishToIdle()
    return
  }

  setHint('operate.portraitHint', 3600)
  const wait = await waitForViewport(false)
  if (gen !== state.generation) {
    return
  }
  if (wait.matched) {
    state.applyCanvas?.(false, wait.width, wait.height)
    if (state.ownsFullscreen && document.fullscreenElement) {
      state.ownsFullscreen = false
      await exitFullscreenQuietly()
    }
  } else {
    applyPortraitFallback()
  }
  setHint(null)
  finishToIdle()
}

/** Test helper — reset module state between tests. */
export const resetLandscapeSession = () => {
  state.generation += 1
  runCleanups()
  clearHintTimer()
  setActiveViewportListening(false)
  state.mode = 'idle'
  state.ownsFullscreen = false
  state.hintKey = null
  state.applyCanvas = null
  if (state.fsListenerAttached && typeof document !== 'undefined') {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    state.fsListenerAttached = false
  }
  snapshot = {
    mode: 'idle',
    ownsFullscreen: false,
    hintKey: null
  }
}

/** Size helper for tests / callers that need ratios without waiting. */
export const canvasSizeForSessionOrientation = (
  landscape: boolean,
  viewportWidth?: number,
  viewportHeight?: number
) => canvasSizeForOrientation(landscape, viewportWidth, viewportHeight)
