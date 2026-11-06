export interface ExportBackground {
  sort: string[]
  color: string | null
  imageUrl: string
  imageOpacity: number
  cameraFrame: string | null
  cameraOpacity: number
}

/** Where the full canvas background sits relative to the exported image. */
export interface ExportBackgroundFrame {
  width: number
  height: number
  offsetX: number
  offsetY: number
}

/** True when board config has at least one layer that can be painted. */
export const hasPaintableBackground = (background: ExportBackground) =>
  background.sort.some((type) => {
    if (type === 'color') {
      return Boolean(background.color)
    }
    if (type === 'image') {
      return Boolean(background.imageUrl)
    }
    if (type === 'camera') {
      return Boolean(background.cameraFrame)
    }
    return false
  })
