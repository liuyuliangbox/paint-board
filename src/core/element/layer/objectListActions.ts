import { fabric } from 'fabric'
import { ActionMode, ELEMENT_CUSTOM_TYPE } from '@/constants'
import { paintBoard } from '@/core/paintBoard'
import useBoardStore from '@/store/board'
import {
  objectAtListIndex,
  selectableAfterVisibilityChange,
  stackAfterListMove
} from './objectList'
import {
  collectLinkedObjects,
  createPaintLinkId,
  getPaintLinkId,
  setPaintLinkId
} from './paintLink'

const selectionEnabled = () => {
  const mode = useBoardStore.getState().mode
  return mode === ActionMode.SELECT || mode === ActionMode.Board
}

const applySelectable = (object: fabric.Object, visible: boolean) => {
  const selectable = selectableAfterVisibilityChange(
    object._customType,
    visible,
    selectionEnabled()
  )
  if (selectable === undefined) {
    delete object.selectable
    return
  }
  object.selectable = selectable
}

const setCanvasSelection = (objects: fabric.Object[]) => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return
  }
  useBoardStore.getState().updateMode(ActionMode.SELECT)
  const visible = objects.filter((object) => object.visible !== false)
  if (!visible.length) {
    canvas.discardActiveObject()
  } else if (visible.length === 1) {
    canvas.setActiveObject(visible[0])
  } else {
    canvas.setActiveObject(
      new fabric.ActiveSelection(visible, {
        canvas
      })
    )
  }
  canvas.requestRenderAll()
  paintBoard.triggerHook()
}

export const toggleObjectVisible = (object: fabric.Object) => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return
  }
  const visible = object.visible === false
  object.set({
    visible,
    evented: visible
  })
  applySelectable(object, visible)
  if (!visible && canvas.getActiveObjects().includes(object)) {
    canvas.discardActiveObject()
  }
  paintBoard.render()
  paintBoard.triggerHook()
}

export type ListSelectMode = 'replace' | 'toggle' | 'range'

export const selectObjectFromList = (
  object: fabric.Object,
  options?: {
    mode?: ListSelectMode
    listIndex?: number
    anchorIndex?: number
    expandLinks?: boolean
  }
) => {
  const canvas = paintBoard.canvas
  if (!canvas || object.visible === false) {
    return
  }

  const mode = options?.mode || 'replace'
  const expandLinks = options?.expandLinks !== false
  let next: fabric.Object[] = []

  if (mode === 'replace') {
    next = [object]
  } else if (mode === 'toggle') {
    const current = canvas.getActiveObjects()
    if (current.includes(object)) {
      next = current.filter((item) => item !== object)
    } else {
      next = [...current, object]
    }
  } else if (mode === 'range') {
    const objects = canvas.getObjects()
    const listIndex = options?.listIndex
    const anchorIndex = options?.anchorIndex ?? options?.listIndex ?? listIndex
    if (
      listIndex === undefined ||
      anchorIndex === undefined ||
      !Number.isInteger(listIndex) ||
      !Number.isInteger(anchorIndex)
    ) {
      next = [object]
    } else {
      const from = Math.min(anchorIndex, listIndex)
      const to = Math.max(anchorIndex, listIndex)
      next = []
      for (let i = from; i <= to; i++) {
        const item = objectAtListIndex(objects, i)
        if (item && item.visible !== false) {
          next.push(item)
        }
      }
    }
  }

  if (expandLinks && next.length) {
    next = collectLinkedObjects(canvas, next)
  }

  setCanvasSelection(next)
}

export const updateObjectTextFromList = (
  object: fabric.Object,
  text: string
) => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return
  }
  if (
    object.type !== 'i-text' &&
    object.type !== 'text' &&
    object.type !== 'textbox' &&
    object._customType !== ELEMENT_CUSTOM_TYPE.I_TEXT
  ) {
    return
  }
  const next = text
  const current = (object as fabric.IText).text || ''
  if (current === next) {
    return
  }
  ;(object as fabric.IText).set({ text: next })
  object.setCoords()
  paintBoard.render()
  paintBoard.triggerHook()
}

/**
 * Move selected objects one step toward the front, keeping relative order.
 * List is front-first; canvas stack is bottom-to-top.
 */
export const bringSelectedForwardInList = () => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return
  }
  const selected = new Set(canvas.getActiveObjects())
  if (!selected.size) {
    return
  }
  const stack = [...canvas.getObjects()]
  // Process from front to back (high index to low) so relative order stays.
  for (let i = stack.length - 1; i >= 0; i--) {
    const object = stack[i]
    if (!selected.has(object)) {
      continue
    }
    if (i >= stack.length - 1) {
      continue
    }
    const above = stack[i + 1]
    if (selected.has(above)) {
      continue
    }
    canvas.moveTo(object, i + 1)
    stack.splice(i, 1)
    stack.splice(i + 1, 0, object)
  }
  paintBoard.render()
  paintBoard.triggerHook()
}

export const sendSelectedBackwardInList = () => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return
  }
  const selected = new Set(canvas.getActiveObjects())
  if (!selected.size) {
    return
  }
  const stack = [...canvas.getObjects()]
  // Process from back to front (low index to high).
  for (let i = 0; i < stack.length; i++) {
    const object = stack[i]
    if (!selected.has(object)) {
      continue
    }
    if (i <= 0) {
      continue
    }
    const below = stack[i - 1]
    if (selected.has(below)) {
      continue
    }
    canvas.moveTo(object, i - 1)
    stack.splice(i, 1)
    stack.splice(i - 1, 0, object)
  }
  paintBoard.render()
  paintBoard.triggerHook()
}

export const moveObjectInList = (
  fromListIndex: number,
  toListIndex: number
) => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return
  }
  const next = stackAfterListMove(
    canvas.getObjects(),
    fromListIndex,
    toListIndex
  )
  if (!next) {
    return
  }
  next.forEach((object, index) => {
    canvas.moveTo(object, index)
  })
  paintBoard.render()
  paintBoard.triggerHook()
}

export const objectFromList = (listIndex: number) => {
  const objects = paintBoard.canvas?.getObjects()
  if (!objects) {
    return undefined
  }
  return objectAtListIndex(objects, listIndex)
}

export const linkActiveObjects = () => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return false
  }
  const active = canvas.getActiveObjects()
  if (active.length < 2) {
    return false
  }
  const linkId = createPaintLinkId()
  active.forEach((object) => setPaintLinkId(object, linkId))
  paintBoard.render()
  paintBoard.triggerHook()
  return true
}

export const unlinkActiveObjects = () => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return false
  }
  const active = canvas.getActiveObjects()
  if (!active.length) {
    return false
  }
  const linked = collectLinkedObjects(canvas, active, { includeHidden: true })
  linked.forEach((object) => setPaintLinkId(object, null))
  paintBoard.render()
  paintBoard.triggerHook()
  return true
}

export const activeHasLink = () => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return false
  }
  return canvas.getActiveObjects().some((object) => getPaintLinkId(object))
}

export const isObjectListDrawerOpen = () => {
  if (typeof document === 'undefined') {
    return false
  }
  const toggle = document.getElementById(
    'object-list-drawer'
  ) as HTMLInputElement | null
  return Boolean(toggle?.checked)
}
