/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Listener = EventListenerOrEventListenerObject

const createEmitter = () => {
  const map = new Map<string, Set<Listener>>()
  return {
    addEventListener(type: string, listener: Listener) {
      if (!map.has(type)) {
        map.set(type, new Set())
      }
      map.get(type)!.add(listener)
    },
    removeEventListener(type: string, listener: Listener) {
      map.get(type)?.delete(listener)
    },
    dispatchEvent(event: { type: string }) {
      map.get(event.type)?.forEach((listener) => {
        if (typeof listener === 'function') {
          listener(event as Event)
        } else {
          listener.handleEvent(event as Event)
        }
      })
      return true
    }
  }
}

const installDom = () => {
  const windowEmitter = createEmitter()
  const documentEmitter = createEmitter()
  let innerWidth = 390
  let innerHeight = 844
  let fullscreenElement: unknown = null

  const orientation = {
    lock: vi.fn(async () => undefined),
    unlock: vi.fn(),
    ...createEmitter()
  }

  const documentElement = {
    requestFullscreen: vi.fn(async () => {
      fullscreenElement = documentElement
      documentEmitter.dispatchEvent({ type: 'fullscreenchange' })
    })
  }

  const documentMock = {
    ...documentEmitter,
    get fullscreenElement() {
      return fullscreenElement
    },
    set fullscreenElement(value: unknown) {
      fullscreenElement = value
    },
    documentElement,
    exitFullscreen: vi.fn(async () => {
      fullscreenElement = null
      documentEmitter.dispatchEvent({ type: 'fullscreenchange' })
    })
  }

  const windowMock = {
    ...windowEmitter,
    get innerWidth() {
      return innerWidth
    },
    get innerHeight() {
      return innerHeight
    },
    setInnerSize(width: number, height: number) {
      innerWidth = width
      innerHeight = height
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    screen: { orientation }
  }

  vi.stubGlobal('window', windowMock)
  vi.stubGlobal('document', documentMock)
  vi.stubGlobal('screen', windowMock.screen)

  return { windowMock, documentMock, orientation, documentElement }
}

describe('landscapeSession', () => {
  let applyCanvas: ReturnType<typeof vi.fn>
  let windowMock: ReturnType<typeof installDom>['windowMock']
  let documentMock: ReturnType<typeof installDom>['documentMock']
  let orientation: ReturnType<typeof installDom>['orientation']
  let startLandscapeSession: typeof import('./landscapeSession').startLandscapeSession
  let endLandscapeSession: typeof import('./landscapeSession').endLandscapeSession
  let getLandscapeSession: typeof import('./landscapeSession').getLandscapeSession
  let configureLandscapeSession: typeof import('./landscapeSession').configureLandscapeSession
  let resetLandscapeSession: typeof import('./landscapeSession').resetLandscapeSession

  beforeEach(async () => {
    vi.resetModules()
    vi.useFakeTimers()
    ;({ windowMock, documentMock, orientation } = installDom())
    applyCanvas = vi.fn()
    const mod = await import('./landscapeSession')
    startLandscapeSession = mod.startLandscapeSession
    endLandscapeSession = mod.endLandscapeSession
    getLandscapeSession = mod.getLandscapeSession
    configureLandscapeSession = mod.configureLandscapeSession
    resetLandscapeSession = mod.resetLandscapeSession
    resetLandscapeSession()
    configureLandscapeSession({ applyCanvas })
  })

  afterEach(() => {
    resetLandscapeSession()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('starts a session and applies landscape canvas after lock', async () => {
    orientation.lock.mockImplementation(async () => {
      windowMock.setInnerSize(844, 390)
    })

    const resultPromise = startLandscapeSession()
    await vi.runAllTimersAsync()
    const result = await resultPromise

    expect(result.ok).toBe(true)
    expect(getLandscapeSession().mode).toBe('active')
    expect(applyCanvas).toHaveBeenCalledWith(true, 844, 390)
  })

  it('applies portrait canvas only after viewport is portrait on end', async () => {
    orientation.lock.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === 'landscape') {
        windowMock.setInnerSize(844, 390)
      }
    })
    const startPromise = startLandscapeSession()
    await vi.runAllTimersAsync()
    await startPromise
    applyCanvas.mockClear()

    const endPromise = endLandscapeSession()
    await vi.advanceTimersByTimeAsync(200)
    expect(applyCanvas.mock.calls.some((call) => call[0] === false)).toBe(false)

    windowMock.setInnerSize(390, 844)
    windowMock.dispatchEvent({ type: 'resize' })
    await vi.runAllTimersAsync()
    await endPromise

    expect(applyCanvas).toHaveBeenCalledWith(false, 390, 844)
    expect(getLandscapeSession().mode).toBe('idle')
  })

  it('recovers on OS fullscreen exit while session is active', async () => {
    orientation.lock
      .mockRejectedValueOnce(new Error('need fs'))
      .mockImplementation(async (...args: unknown[]) => {
        if (args[0] === 'landscape') {
          windowMock.setInnerSize(844, 390)
        }
        if (args[0] === 'portrait') {
          windowMock.setInnerSize(390, 844)
        }
      })

    const startPromise = startLandscapeSession()
    await vi.runAllTimersAsync()
    await startPromise
    expect(getLandscapeSession().mode).toBe('active')
    expect(getLandscapeSession().ownsFullscreen).toBe(true)
    applyCanvas.mockClear()

    documentMock.fullscreenElement = null
    documentMock.dispatchEvent({ type: 'fullscreenchange' })
    await vi.advanceTimersByTimeAsync(100)
    windowMock.setInnerSize(390, 844)
    windowMock.dispatchEvent({ type: 'resize' })
    await vi.runAllTimersAsync()

    expect(getLandscapeSession().mode).toBe('idle')
    expect(getLandscapeSession().ownsFullscreen).toBe(false)
    expect(applyCanvas).toHaveBeenCalledWith(false, 390, 844)
    expect(
      documentMock.documentElement.requestFullscreen
    ).toHaveBeenCalledTimes(1)
  })

  it('fails enter with hint when lock and rotate are unavailable', async () => {
    orientation.lock.mockRejectedValue(new Error('denied'))
    documentMock.documentElement.requestFullscreen.mockRejectedValue(
      new Error('denied')
    )
    windowMock.setInnerSize(390, 844)

    const result = await startLandscapeSession()
    expect(result.ok).toBe(false)
    expect(result.hintKey).toBe('operate.landscapeHint')
    expect(getLandscapeSession().mode).toBe('idle')
    expect(getLandscapeSession().hintKey).toBe('operate.landscapeHint')
  })
})
