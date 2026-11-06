import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DRAW_COLORS,
  LEGACY_DEFAULT_DRAW_COLORS,
  sameColorList
} from './drawColors'
import { DEFAULT_FREEHAND_STROKE_COLORS } from './freehandStrokeColor'

describe('draw default colors', () => {
  it('ships six brush swatches including white and yellow', () => {
    expect(DEFAULT_DRAW_COLORS).toEqual([
      '#000000',
      '#65CC8A',
      '#FF6363',
      '#3A59D1',
      '#FFFFFF',
      '#F5C518'
    ])
    expect(DEFAULT_FREEHAND_STROKE_COLORS).toEqual(DEFAULT_DRAW_COLORS)
  })

  it('detects the legacy four-color default for persist migration', () => {
    expect(
      sameColorList(LEGACY_DEFAULT_DRAW_COLORS, LEGACY_DEFAULT_DRAW_COLORS)
    ).toBe(true)
    expect(sameColorList(DEFAULT_DRAW_COLORS, LEGACY_DEFAULT_DRAW_COLORS)).toBe(
      false
    )
  })
})
