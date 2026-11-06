import { fabric } from 'fabric'
import { paintBoard } from '@/core/paintBoard'
import { filterUnlockedObjects, isObjectLocked } from '@/core/utils/object'

type ClientPoint = { clientX: number; clientY: number }

export const getScenePointFromClient = (e: ClientPoint) => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return null
  }
  const pointer = canvas.getPointer(e as MouseEvent, false)
  return new fabric.Point(pointer.x, pointer.y)
}

export const findUnlockedTargetAtClient = (e: ClientPoint & Event) => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return null
  }

  let target: fabric.Object | undefined
  try {
    target = canvas.findTarget(e as MouseEvent, false) as
      | fabric.Object
      | undefined
  } catch {
    target = undefined
  }

  if (!target) {
    const pointer = getScenePointFromClient(e)
    if (pointer) {
      const point = new fabric.Point(pointer.x, pointer.y)
      target = [...canvas.getObjects()].reverse().find((obj) => {
        if (obj.excludeFromExport || obj.evented === false || !obj.visible) {
          return false
        }
        return Boolean(obj.containsPoint?.(point))
      })
    }
  }

  if (!target) {
    return null
  }
  if (target.type !== 'activeSelection' && isObjectLocked(target)) {
    return null
  }
  return target
}

export const objectsInSceneRect = (
  canvas: fabric.Canvas,
  a: fabric.Point,
  b: fabric.Point
) => {
  const left = Math.min(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const right = Math.max(a.x, b.x)
  const bottom = Math.max(a.y, b.y)

  const probe = new fabric.Rect({
    left,
    top,
    width: Math.max(right - left, 1),
    height: Math.max(bottom - top, 1),
    absolutePositioned: true
  })
  probe.setCoords()
  const sel = probe.getBoundingRect(true, true)

  return canvas.getObjects().filter((obj) => {
    if (obj.excludeFromExport || obj.evented === false || !obj.visible) {
      return false
    }
    if (isObjectLocked(obj)) {
      return false
    }
    obj.setCoords()
    const box = obj.getBoundingRect(true, true)
    return !(
      sel.left > box.left + box.width ||
      sel.left + sel.width < box.left ||
      sel.top > box.top + box.height ||
      sel.top + sel.height < box.top
    )
  })
}

export const applyCanvasSelection = (
  canvas: fabric.Canvas,
  objects: fabric.Object[]
) => {
  const unlocked = filterUnlockedObjects(objects)
  canvas.discardActiveObject()
  if (!unlocked.length) {
    canvas.requestRenderAll()
    paintBoard.triggerHook()
    return
  }
  if (unlocked.length === 1) {
    canvas.setActiveObject(unlocked[0])
  } else {
    canvas.setActiveObject(
      new fabric.ActiveSelection(unlocked, {
        canvas
      })
    )
  }
  canvas.requestRenderAll()
  paintBoard.triggerHook()
}
