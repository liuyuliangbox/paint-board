import { describe, expect, it } from 'vitest'
import {
  canvasSizeForOrientation,
  isCanvasLandscape
} from './canvasOrientation'

describe('canvasOrientation', () => {
  it('detects landscape vs portrait from pixel size', () => {
    // Portrait phone 390x844, full board → portrait
    expect(isCanvasLandscape(1, 1, 390, 844)).toBe(false)
    // Wide board on same phone
    expect(isCanvasLandscape(1, 0.35, 390, 844)).toBe(true)
  })

  it('fits landscape using full width', () => {
    const size = canvasSizeForOrientation(true, 390, 844)
    expect(size.width).toBe(1)
    expect(size.height).toBeGreaterThan(0.1)
    expect(size.height).toBeLessThanOrEqual(1)
    expect(isCanvasLandscape(size.width, size.height, 390, 844)).toBe(true)
  })

  it('fits portrait using full height', () => {
    const size = canvasSizeForOrientation(false, 390, 844)
    expect(size.height).toBe(1)
    expect(size.width).toBeGreaterThan(0.1)
    expect(size.width).toBeLessThanOrEqual(1)
    expect(isCanvasLandscape(size.width, size.height, 390, 844)).toBe(false)
  })
})
