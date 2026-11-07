import { fabric } from 'fabric'
import { paintBoard } from '@/core/paintBoard'
import useBoardStore from '@/store/board'
import { ActionMode } from '@/constants'
import { isObjectLocked } from '@/core/utils/object'
import {
  applyCanvasSelection,
  findUnlockedTargetAtClient
} from './selectionHelpers'

/**
 * Touch sticky multi-select: when enabled in SELECT mode, tap toggles
 * objects in/out of the active selection (desktop Shift equivalent).
 */
export class TouchMultiSelect {
  constructor() {
    this.bindEvents()
  }

  private bindEvents() {
    const el = paintBoard.canvas?.upperCanvasEl
    if (!el) {
      return
    }
    el.addEventListener('pointerdown', this.onPointerDown, true)
  }

  removeEvents() {
    const el = paintBoard.canvas?.upperCanvasEl
    el?.removeEventListener('pointerdown', this.onPointerDown, true)
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || e.pointerType === 'mouse') {
      return
    }
    const state = useBoardStore.getState()
    if (
      !state.isTouchMultiSelect ||
      state.mode !== ActionMode.SELECT ||
      state.isPanMode
    ) {
      return
    }
    if (paintBoard.textElement.isTextEditing) {
      return
    }
    if ((paintBoard.evnet?.touchEvent?.touches ?? 0) >= 2) {
      return
    }

    const canvas = paintBoard.canvas
    if (!canvas) {
      return
    }

    let target = findUnlockedTargetAtClient(e)
    // findTarget often returns the ActiveSelection itself — resolve to the
    // topmost unlocked child under the finger so taps can toggle members.
    if (target?.type === 'activeSelection') {
      const pointer = canvas.getPointer(e as unknown as MouseEvent, false)
      const point = new fabric.Point(pointer.x, pointer.y)
      const hit = [...canvas.getActiveObjects()].reverse().find((obj) => {
        if (isObjectLocked(obj) || obj.visible === false) {
          return false
        }
        obj.setCoords()
        return Boolean(obj.containsPoint?.(point, null, true))
      })
      target = hit || null
      if (!target) {
        return
      }
    }
    if (!target) {
      // Empty canvas: let fabric clear selection.
      return
    }
    if (isObjectLocked(target)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    e.stopImmediatePropagation()

    const current = canvas.getActiveObjects()
    const already = current.includes(target)
    const next = already
      ? current.filter((obj) => obj !== target)
      : [...current, target]
    applyCanvasSelection(canvas, next)
  }
}
