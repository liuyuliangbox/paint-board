import { v4 as uuidv4 } from 'uuid'
import { paintBoard } from '../paintBoard'
import { fabric } from 'fabric'
import { CANVAS_CUSTOM_PROPERTIES } from './canvasProperties'
import { initObjectControls } from './loadCanvas'

export const initCustomObjectAttr = (obj: fabric.Object, type: string) => {
  const id = uuidv4()
  obj.set({
    id,
    _customType: type
  } as any)
}

type CloneObjectsOptions = {
  offsetX?: number
  offsetY?: number
  /** Keep the current selection instead of selecting the clones. */
  keepSelection?: boolean
  /** Skip history write; useful while a drag is still in progress. */
  skipHistory?: boolean
  /** Insert each clone at the source object's stack index (behind it). */
  insertBehindSource?: boolean
}

const cloneFabricObjects = (
  objects: fabric.Object[],
  resolvePosition: (
    source: fabric.Object,
    cloned: fabric.Object
  ) => { left: number; top: number },
  options: CloneObjectsOptions = {}
) => {
  const canvas = paintBoard.canvas
  if (!canvas || !objects.length) {
    return Promise.resolve([] as fabric.Object[])
  }

  if (!options.keepSelection) {
    canvas.discardActiveObject()
  }

  const copys = objects.map((object) => {
    return new Promise<fabric.Object>((resolve) => {
      object?.clone((cloned: fabric.Object) => {
        const { left, top } = resolvePosition(object, cloned)
        const id = uuidv4()
        cloned.set({
          left,
          top,
          evented: true,
          id,
          perPixelTargetFind: true
        })
        if (options.insertBehindSource) {
          const index = canvas.getObjects().indexOf(object)
          if (index >= 0) {
            canvas.insertAt(cloned, index, false)
          } else {
            canvas.add(cloned)
          }
        } else {
          canvas.add(cloned)
        }
        // Endpoint handlers read the canvas transform, so the object has to be
        // on the canvas before the controls are built and measured.
        initObjectControls(cloned)
        cloned.setCoords()
        resolve(cloned)
      }, CANVAS_CUSTOM_PROPERTIES)
    })
  })

  return Promise.all(copys).then((objs) => {
    if (!objs.length) {
      return objs
    }

    if (!options.keepSelection) {
      // A one-object ActiveSelection draws the default bounding-box handles.
      // Select the copy itself so its own controls, such as line endpoints, show immediately.
      if (objs.length === 1) {
        canvas.setActiveObject(objs[0])
      } else {
        canvas.setActiveObject(
          new fabric.ActiveSelection(objs, {
            canvas
          })
        )
      }
    }

    if (options.skipHistory) {
      canvas.requestRenderAll()
    } else {
      paintBoard.render()
    }
    return objs
  })
}

export const cloneObjects = (objects: fabric.Object[]) => {
  const offsetX = 20
  const offsetY = 20
  return cloneFabricObjects(objects, (_source, cloned) => ({
    left: (cloned.left || 0) + offsetX,
    top: (cloned.top || 0) + offsetY
  }))
}

/**
 * Canvas-space left/top for an object, including when it lives inside an
 * ActiveSelection / group (where object.left/top are only relative).
 */
export const getObjectScenePosition = (obj: fabric.Object) => {
  if (!obj.group) {
    return {
      left: obj.left ?? 0,
      top: obj.top ?? 0
    }
  }

  const point = fabric.util.transformPoint(
    new fabric.Point(obj.left ?? 0, obj.top ?? 0),
    obj.group.calcTransformMatrix()
  )
  return {
    left: point.x,
    top: point.y
  }
}

/**
 * Leave copies at absolute positions while the current selection keeps moving.
 * Used by Ctrl/Cmd + drag duplicate.
 */
export const cloneObjectsInPlace = (
  items: Array<{ object: fabric.Object; left: number; top: number }>
) => {
  return cloneFabricObjects(
    items.map((item) => item.object),
    (source) => {
      const match = items.find((item) => item.object === source)
      return {
        left: match?.left ?? source.left ?? 0,
        top: match?.top ?? source.top ?? 0
      }
    },
    {
      keepSelection: true,
      skipHistory: true,
      insertBehindSource: true
    }
  )
}

/**
 * Check if the object is locked (cannot move, rotate or scale)
 * @param obj fabric object
 * @returns if the object is locked return true, otherwise return false
 */
export const isObjectLocked = (obj: fabric.Object): boolean => {
  // check if any locked properties are set to true
  return !!(
    obj.lockMovementX ||
    obj.lockMovementY ||
    obj.lockRotation ||
    obj.lockScalingX ||
    obj.lockScalingY ||
    obj.lockUniScaling
  )
}

/**
 * Filter out locked objects
 * @param objects objects array
 * @returns filtered objects array (excluding locked objects)
 */
export const filterUnlockedObjects = (
  objects: fabric.Object[]
): fabric.Object[] => {
  return objects.filter((obj) => !isObjectLocked(obj))
}
