import { fabric } from 'fabric'
import { contentBounds, type MeasurableObject } from '@/core/export/bounds'
import { canvasToPngBlob } from '@/core/utils/canvasBlob'
import { prepareBoardFonts } from '@/core/font/googleFont'

const SIZE = 96

/**
 * Render a small PNG data URL for a widget's object list.
 */
export const renderWidgetThumbnail = async (
  objects: unknown[]
): Promise<string> => {
  if (typeof document === 'undefined' || !objects.length) {
    return ''
  }

  const element = document.createElement('canvas')
  element.setAttribute('aria-hidden', 'true')
  element.style.position = 'fixed'
  element.style.left = '-10000px'
  document.body.appendChild(element)

  const staticCanvas = new fabric.StaticCanvas(element, {
    enableRetinaScaling: false,
    renderOnAddRemove: false,
    backgroundColor: '#ffffff'
  })

  try {
    try {
      await prepareBoardFonts({ objects })
    } catch {
      // Fonts are best-effort for thumbnails.
    }

    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(
        () => reject(new Error('widget thumbnail timeout')),
        10000
      )
      staticCanvas.loadFromJSON({ objects }, () => {
        window.clearTimeout(timer)
        resolve()
      })
    })

    let frame: ReturnType<typeof contentBounds> | null = null
    try {
      frame = contentBounds(
        staticCanvas.getObjects() as MeasurableObject[],
        1,
        [1, 0, 0, 1, 0, 0]
      )
    } catch {
      frame = null
    }
    if (!frame) {
      return ''
    }

    const scale = Math.min(SIZE / frame.width, SIZE / frame.height, 1)
    staticCanvas.setWidth(SIZE)
    staticCanvas.setHeight(SIZE)
    staticCanvas.setViewportTransform([
      scale,
      0,
      0,
      scale,
      -frame.left * scale + (SIZE - frame.width * scale) / 2,
      -frame.top * scale + (SIZE - frame.height * scale) / 2
    ])
    staticCanvas.renderAll()

    const elementCanvas = staticCanvas.getElement()
    const blob = await canvasToPngBlob(
      elementCanvas,
      elementCanvas.width,
      elementCanvas.height,
      SIZE,
      SIZE
    )
    if (!blob) {
      return ''
    }
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result)
          return
        }
        reject(new Error('empty thumbnail'))
      }
      reader.onerror = () => reject(reader.error ?? new Error('read failed'))
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Failed to render widget thumbnail', error)
    return ''
  } finally {
    staticCanvas.dispose()
    element.remove()
  }
}
