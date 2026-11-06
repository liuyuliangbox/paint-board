import { afterEach, describe, expect, it, vi } from 'vitest'
import { isCoarsePointer, isNarrowViewport, shouldUseTouchUi } from './touchUi'

const setMatchMedia = (map: Record<string, boolean>) => {
  const matchMedia = vi.fn((query: string) => ({
    matches: Boolean(map[query]),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null
  }))
  vi.stubGlobal('window', { matchMedia })
}

describe('touchUi', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('detects coarse pointer and narrow viewport', () => {
    setMatchMedia({
      '(pointer: coarse)': true,
      '(max-width: 767px)': false
    })
    expect(isCoarsePointer()).toBe(true)
    expect(isNarrowViewport()).toBe(false)
    expect(shouldUseTouchUi()).toBe(true)

    setMatchMedia({
      '(pointer: coarse)': false,
      '(max-width: 767px)': true
    })
    expect(isNarrowViewport()).toBe(true)
    expect(shouldUseTouchUi()).toBe(true)
  })
})
