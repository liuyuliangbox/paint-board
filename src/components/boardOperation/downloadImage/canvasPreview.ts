import { Crop } from 'react-image-crop'

const TO_RADIANS = Math.PI / 180

const paintCrop = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  crop: Crop,
  scaleX: number,
  scaleY: number,
  scale: number,
  rotate: number
) => {
  const cropX = crop.x * scaleX
  const cropY = crop.y * scaleY
  const rotateRads = rotate * TO_RADIANS
  const centerX = image.naturalWidth / 2
  const centerY = image.naturalHeight / 2

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.save()
  ctx.translate(-cropX, -cropY)
  ctx.translate(centerX, centerY)
  ctx.rotate(rotateRads)
  ctx.scale(scale, scale)
  ctx.translate(-centerX, -centerY)
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight
  )
  ctx.restore()
}

/** Sharp on-screen preview (extra DPR for the modal). */
export async function canvasPreview(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  crop: Crop,
  scale = 1,
  rotate = 0
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No 2d context')
  }

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const pixelRatio = window.devicePixelRatio ?? 1

  canvas.width = Math.floor(crop.width * scaleX * pixelRatio)
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio)
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  paintCrop(ctx, image, crop, scaleX, scaleY, scale, rotate)
}

/**
 * Encode the crop at `outputScale`× natural resolution for download.
 * Avoids resampling through the DPR preview canvas (which looked soft).
 */
export const renderExportCrop = (
  image: HTMLImageElement,
  crop: Crop,
  scale = 1,
  rotate = 0,
  outputScale = 1
) => {
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const width = Math.max(1, Math.round(crop.width * scaleX * outputScale))
  const height = Math.max(1, Math.round(crop.height * scaleY * outputScale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Pixel-perfect path when not rotating/scaling the crop view.
  if (rotate === 0 && scale === 1) {
    ctx.imageSmoothingEnabled = outputScale !== 1
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      width,
      height
    )
    return canvas
  }

  ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0)
  paintCrop(ctx, image, crop, scaleX, scaleY, scale, rotate)
  return canvas
}
