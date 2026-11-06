import { fabric } from 'fabric'
import { prepareCanvasTextForExport } from '@/core/font/applyFont'
import { drawBackground } from '@/components/background/backgroundColor/utils'
import { drawBackgroundImage } from '@/components/background/backgroundImage/utils'
import {
  boundsAroundInk,
  chooseExportMultiplier,
  CONTENT_PADDING,
  contentBounds,
  intersectVisibleCanvas,
  opaqueBounds,
  outputPixelSize,
  withinExportLimit,
  type Bounds,
  type MeasurableObject
} from './bounds'
import { EXPORT_TOO_LARGE_ERROR } from './exportError'
import {
  hasPaintableBackground,
  PAGE_EXPORT_FILL,
  type ExportBackground,
  type ExportBackgroundFrame
} from './exportBackground'

export type ExportScope = 'viewport' | 'content' | 'selection'
export type { ExportBackground, ExportBackgroundFrame }
export { hasPaintableBackground, PAGE_EXPORT_FILL }

export interface ExportImageResult {
  url: string
  background: ExportBackground | null
  backgroundFrame: ExportBackgroundFrame | null
}

const paintBackground = async (
  ctx: CanvasRenderingContext2D,
  background: ExportBackground,
  width: number,
  height: number
) => {
  const layers = [...background.sort].reverse()
  for (let i = 0; i < layers.length; i++) {
    const type = layers[i]
    try {
      if (type === 'image' && background.imageUrl) {
        await drawBackgroundImage(
          ctx,
          background.imageUrl,
          background.imageOpacity,
          width,
          height
        )
      } else if (type === 'color' && background.color) {
        drawBackground(ctx, background.color, width, height)
      } else if (type === 'camera' && background.cameraFrame) {
        await drawBackgroundImage(
          ctx,
          background.cameraFrame,
          background.cameraOpacity,
          width,
          height
        )
      }
    } catch (error) {
      // Skip a failed layer so color/camera can still composite.
      console.error('Failed to paint export background layer', type, error)
    }
  }
}

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load export image'))
    image.src = url
  })

export type ComposeExportOptions = {
  /** Solid fill under everything (e.g. page slate grey). */
  pageFill?: string | null
  board?: {
    background: ExportBackground
    frame: ExportBackgroundFrame
  } | null
}

/**
 * Stack optional page fill → board background → transparent foreground.
 */
export const composeExportLayers = async (
  foregroundUrl: string,
  options: ComposeExportOptions = {}
) => {
  const image = await loadImage(foregroundUrl)
  const outputWidth = image.naturalWidth
  const outputHeight = image.naturalHeight
  const output = document.createElement('canvas')
  output.width = outputWidth
  output.height = outputHeight
  const ctx = output.getContext('2d')
  if (!ctx) {
    throw new Error('No 2d context')
  }

  if (options.pageFill) {
    ctx.fillStyle = options.pageFill
    ctx.fillRect(0, 0, outputWidth, outputHeight)
  }

  if (options.board) {
    const { background, frame } = options.board
    ctx.save()
    ctx.translate(frame.offsetX, frame.offsetY)
    await paintBackground(ctx, background, frame.width, frame.height)
    ctx.restore()
  }

  ctx.drawImage(image, 0, 0, outputWidth, outputHeight)
  return output.toDataURL('image/png')
}

/**
 * Paint the canvas background under an already exported foreground.
 * The foreground itself stays transparent until the modal asks for this.
 */
export const applyExportBackground = async (
  foregroundUrl: string,
  background: ExportBackground,
  frame: ExportBackgroundFrame,
  pageFill?: string | null
) =>
  composeExportLayers(foregroundUrl, {
    pageFill,
    board: { background, frame }
  })

const transparentResult = (image: HTMLCanvasElement): ExportImageResult => ({
  url: image.toDataURL('image/png'),
  background: null,
  backgroundFrame: null
})

/**
 * Paint objects into an offscreen canvas. The live canvas keeps its viewport,
 * selection, and upper context, so guide-line rendering is not disturbed.
 */
const renderObjects = (
  canvas: fabric.Canvas,
  objects: fabric.Object[],
  crop: Bounds,
  multiplier: number
) => {
  const pixelWidth = Math.max(1, Math.ceil(crop.width * multiplier))
  const pixelHeight = Math.max(1, Math.ceil(crop.height * multiplier))
  const element = document.createElement('canvas')
  element.width = pixelWidth
  element.height = pixelHeight
  const ctx = element.getContext('2d')
  if (!ctx) {
    throw new Error('No 2d context')
  }

  const viewport = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
  const previousSkip = canvas.skipOffscreen
  canvas.skipOffscreen = false
  try {
    ctx.setTransform(
      viewport[0] * multiplier,
      viewport[1] * multiplier,
      viewport[2] * multiplier,
      viewport[3] * multiplier,
      (viewport[4] - crop.left) * multiplier,
      (viewport[5] - crop.top) * multiplier
    )
    objects.forEach((obj) => {
      obj.render(ctx)
    })
  } finally {
    canvas.skipOffscreen = previousSkip === undefined ? true : previousSkip
  }
  return element
}

/**
 * Drop transparent margins, then add a small padding around the painted pixels.
 */
const frameInk = (
  rendered: HTMLCanvasElement,
  crop: Bounds,
  multiplier: number
) => {
  const ctx = rendered.getContext('2d')
  if (!ctx) {
    return { image: rendered, crop }
  }
  const pixels = ctx.getImageData(0, 0, rendered.width, rendered.height)
  const ink = opaqueBounds(pixels.data, rendered.width, rendered.height)
  if (!ink) {
    return { image: rendered, crop }
  }

  let padding = CONTENT_PADDING
  let framed = boundsAroundInk(crop, ink, multiplier, padding)
  let size = outputPixelSize(framed.width, framed.height, multiplier)
  while (padding > 0 && !withinExportLimit(size.width, size.height)) {
    padding = Math.floor(padding / 2)
    framed = boundsAroundInk(crop, ink, multiplier, padding)
    size = outputPixelSize(framed.width, framed.height, multiplier)
  }
  if (!withinExportLimit(size.width, size.height)) {
    return { image: rendered, crop }
  }

  const pad = Math.round(padding * multiplier)
  const image = document.createElement('canvas')
  image.width = ink.width + pad * 2
  image.height = ink.height + pad * 2
  const framedCtx = image.getContext('2d')
  if (!framedCtx) {
    return { image: rendered, crop }
  }
  framedCtx.drawImage(
    rendered,
    ink.left,
    ink.top,
    ink.width,
    ink.height,
    pad,
    pad,
    ink.width,
    ink.height
  )
  return {
    image,
    crop: boundsAroundInk(crop, ink, multiplier, pad / multiplier)
  }
}

const exportViewport = (
  canvas: fabric.Canvas,
  background: ExportBackground
): ExportImageResult => {
  const lower = canvas.getElement()
  const cssWidth = canvas.getWidth()
  const cssHeight = canvas.getHeight()
  if (!lower.width || !lower.height || !cssWidth || !cssHeight) {
    throw new Error('Canvas is empty')
  }

  const view = intersectVisibleCanvas(
    cssWidth,
    cssHeight,
    window.innerWidth,
    window.innerHeight
  )
  const ratioX = lower.width / cssWidth
  const ratioY = lower.height / cssHeight
  const outputWidth = Math.max(1, Math.round(view.width * ratioX))
  const outputHeight = Math.max(1, Math.round(view.height * ratioY))
  if (!withinExportLimit(outputWidth, outputHeight)) {
    throw new Error(EXPORT_TOO_LARGE_ERROR)
  }

  const output = document.createElement('canvas')
  output.width = outputWidth
  output.height = outputHeight
  const ctx = output.getContext('2d')
  if (!ctx) {
    throw new Error('No 2d context')
  }
  ctx.drawImage(
    lower,
    view.left * ratioX,
    view.top * ratioY,
    view.width * ratioX,
    view.height * ratioY,
    0,
    0,
    outputWidth,
    outputHeight
  )
  // Fabric's lower canvas is always transparent. Background is a separate
  // board layer (color / image / camera) — not the page slate behind the canvas.
  // Only offer compositing when there is something to paint.
  const canPaint = hasPaintableBackground(background)
  return {
    url: output.toDataURL('image/png'),
    background: canPaint ? background : null,
    backgroundFrame: canPaint
      ? {
          width: lower.width,
          height: lower.height,
          offsetX: -view.left * ratioX,
          offsetY: -view.top * ratioY
        }
      : null
  }
}

const exportObjectRegion = (
  canvas: fabric.Canvas,
  crop: Bounds,
  objects: fabric.Object[],
  background: ExportBackground
): ExportImageResult => {
  const lower = canvas.getElement()
  const cssWidth = canvas.getWidth() || 1
  const cssHeight = canvas.getHeight() || 1
  const retina = lower.width > 0 ? lower.width / cssWidth : 1
  const multiplier = chooseExportMultiplier(crop.width, crop.height, retina)
  if (!multiplier) {
    throw new Error(EXPORT_TOO_LARGE_ERROR)
  }

  const rendered = renderObjects(canvas, objects, crop, multiplier)
  const framed = frameInk(rendered, crop, multiplier)
  const canPaint = hasPaintableBackground(background)
  if (!canPaint) {
    return transparentResult(framed.image)
  }

  // Same board background layers as the viewport export, aligned to the crop.
  return {
    url: framed.image.toDataURL('image/png'),
    background,
    backgroundFrame: {
      width: cssWidth * multiplier,
      height: cssHeight * multiplier,
      offsetX: -framed.crop.left * multiplier,
      offsetY: -framed.crop.top * multiplier
    }
  }
}

export const exportCanvasImage = async (
  canvas: fabric.Canvas,
  scope: ExportScope,
  background: ExportBackground
): Promise<ExportImageResult> => {
  try {
    await prepareCanvasTextForExport(canvas)
  } catch (error) {
    console.error('Failed to prepare fonts for export', error)
  }

  if (scope === 'viewport') {
    return exportViewport(canvas, background)
  }

  if (scope === 'selection') {
    const active = canvas.getActiveObject()
    if (!active) {
      throw new Error('No selection')
    }
    const bounds = contentBounds(
      [active as MeasurableObject],
      canvas.getZoom(),
      canvas.viewportTransform
    )
    if (!bounds) {
      throw new Error('Empty selection')
    }
    return exportObjectRegion(canvas, bounds, [active], background)
  }

  const bounds = contentBounds(
    canvas.getObjects() as MeasurableObject[],
    canvas.getZoom(),
    canvas.viewportTransform
  )
  if (!bounds) {
    return exportViewport(canvas, background)
  }
  return exportObjectRegion(canvas, bounds, canvas.getObjects(), background)
}
