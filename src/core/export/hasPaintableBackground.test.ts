import { describe, expect, it } from 'vitest'
import {
  hasPaintableBackground,
  PAGE_EXPORT_FILL,
  type ExportBackground
} from './exportBackground'

const empty: ExportBackground = {
  sort: ['camera', 'image', 'color'],
  color: null,
  imageUrl: '',
  imageOpacity: 1,
  cameraFrame: null,
  cameraOpacity: 1
}

describe('hasPaintableBackground', () => {
  it('is false when no board background is active', () => {
    expect(hasPaintableBackground(empty)).toBe(false)
  })

  it('is true for an active color, image, or camera frame', () => {
    expect(
      hasPaintableBackground({ ...empty, color: 'rgba(255,255,255,1)' })
    ).toBe(true)
    expect(
      hasPaintableBackground({
        ...empty,
        imageUrl: 'data:image/png;base64,xx'
      })
    ).toBe(true)
    expect(
      hasPaintableBackground({
        ...empty,
        cameraFrame: 'data:image/png;base64,xx'
      })
    ).toBe(true)
  })

  it('uses slate-100 for the optional page grey fill', () => {
    expect(PAGE_EXPORT_FILL).toBe('#f1f5f9')
  })
})
