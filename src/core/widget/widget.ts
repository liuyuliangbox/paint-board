import { fabric } from 'fabric'
import { v4 as uuidv4 } from 'uuid'
import { paintBoard } from '@/core/paintBoard'
import { CANVAS_CUSTOM_PROPERTIES } from '@/core/utils/canvasProperties'
import { getObjectScenePosition } from '@/core/utils/object'
import { initObjectControls } from '@/core/utils/loadCanvas'
import { ActionMode } from '@/constants'
import useBoardStore from '@/store/board'

const cloneObjectJson = (object: fabric.Object) => {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const { left, top } = getObjectScenePosition(object)
    object.clone((cloned: fabric.Object) => {
      if (!cloned) {
        reject(new Error('clone failed'))
        return
      }
      cloned.set({
        left,
        top,
        evented: true
      })
      const json = cloned.toDatalessObject(
        CANVAS_CUSTOM_PROPERTIES
      ) as Record<string, unknown>
      resolve(json)
    }, CANVAS_CUSTOM_PROPERTIES)
  })
}

const reassignIds = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(reassignIds)
  }
  if (!value || typeof value !== 'object') {
    return value
  }
  const next: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    next[key] = key === 'id' && typeof child === 'string' ? uuidv4() : reassignIds(child)
  }
  return next
}

/**
 * Serialize the current selection into standalone Fabric object JSON.
 */
export const captureSelectionObjects = async () => {
  const canvas = paintBoard.canvas
  if (!canvas || paintBoard.textElement.isTextEditing) {
    return [] as Record<string, unknown>[]
  }
  const objects = canvas.getActiveObjects()
  if (!objects.length) {
    return []
  }
  return Promise.all(objects.map((object) => cloneObjectJson(object)))
}

const objectBounds = (objects: fabric.Object[]) => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  objects.forEach((object) => {
    const rect = object.getBoundingRect(true, true)
    minX = Math.min(minX, rect.left)
    minY = Math.min(minY, rect.top)
    maxX = Math.max(maxX, rect.left + rect.width)
    maxY = Math.max(maxY, rect.top + rect.height)
  })
  if (!Number.isFinite(minX)) {
    return null
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

const enlivenWidgetObjects = (objects: unknown[]) => {
  return new Promise<fabric.Object[]>((resolve, reject) => {
    try {
      fabric.util.enlivenObjects(
        reassignIds(objects) as fabric.Object[],
        (enlivened: fabric.Object[]) => {
          resolve(enlivened || [])
        },
        'fabric'
      )
    } catch (error) {
      reject(error)
    }
  })
}

export type InsertWidgetPoint = { x: number; y: number }

/**
 * Insert widget objects onto the live canvas.
 * If `point` is omitted, place near the viewport center with a small stagger.
 */
export const insertWidgetObjects = async (
  objects: unknown[],
  point?: InsertWidgetPoint
) => {
  const canvas = paintBoard.canvas
  if (!canvas || !objects.length) {
    return false
  }

  const enlivened = await enlivenWidgetObjects(objects)
  if (!enlivened.length) {
    return false
  }

  useBoardStore.getState().updateMode(ActionMode.SELECT)
  canvas.discardActiveObject()

  enlivened.forEach((object) => {
    object.set({
      evented: true,
      selectable: true,
      perPixelTargetFind: true
    })
    canvas.add(object)
    initObjectControls(object)
    object.setCoords()
  })

  const bounds = objectBounds(enlivened)
  if (bounds) {
    let targetX: number
    let targetY: number
    if (point) {
      targetX = point.x
      targetY = point.y
    } else {
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0]
      const zoom = canvas.getZoom() || 1
      targetX = (canvas.getWidth() / 2 - vpt[4]) / zoom
      targetY = (canvas.getHeight() / 2 - vpt[5]) / zoom
    }
    const offsetX = targetX - (bounds.minX + bounds.width / 2)
    const offsetY = targetY - (bounds.minY + bounds.height / 2)
    enlivened.forEach((object) => {
      object.set({
        left: (object.left ?? 0) + offsetX,
        top: (object.top ?? 0) + offsetY
      })
      object.setCoords()
    })
  }

  if (enlivened.length === 1) {
    canvas.setActiveObject(enlivened[0])
  } else {
    canvas.setActiveObject(
      new fabric.ActiveSelection(enlivened, {
        canvas
      })
    )
  }

  paintBoard.render()
  paintBoard.triggerHook()
  return true
}
