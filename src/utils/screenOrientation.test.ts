import { describe, expect, it } from 'vitest'
import { isViewportLandscape } from './screenOrientation'

describe('isViewportLandscape', () => {
  it('is true when width exceeds height', () => {
    expect(isViewportLandscape(844, 390)).toBe(true)
    expect(isViewportLandscape(390, 844)).toBe(false)
    expect(isViewportLandscape(800, 800)).toBe(false)
  })
})
