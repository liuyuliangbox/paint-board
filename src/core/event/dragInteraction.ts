import { fabric } from 'fabric'
import { paintBoard } from '@/core/paintBoard'
import useBoardStore from '@/store/board'
import { ActionMode } from '@/constants'
import {
  cloneObjectsInPlace,
  filterUnlockedObjects,
  getObjectScenePosition,
  isObjectLocked
} from '@/core/utils/object'

type ObjectStart = {
  object: fabric.Object
  left: number
  top: number
}

/**
 * Selection drag helpers:
 * - Ctrl/Cmd + drag: leave a copy behind, keep moving the selection
 * - Shift + drag: constrain movement to one axis
 */
export class DragInteraction {
  private pendingDuplicate: ObjectStart[] | null = null
  private duplicated = false
  private moveOrigin: { left: number; top: number } | null = null
  private axisLock: 'x' | 'y' | null = null

  constructor() {
    this.bindEvents()
  }

  private bindEvents() {
    const canvas = paintBoard.canvas
    if (!canvas) {
      return
    }

    canvas.on('mouse:down', (opt) => {
      this.resetDragState()
      this.prepareDrag(opt)
    })

    canvas.on('object:moving', (opt) => {
      void this.handleMoving(opt)
    })

    canvas.on('mouse:up', () => {
      this.resetDragState()
    })
  }

  private resetDragState() {
    this.pendingDuplicate = null
    this.duplicated = false
    this.moveOrigin = null
    this.axisLock = null
  }

  private isSelectMode() {
    const { mode } = useBoardStore.getState()
    return mode === ActionMode.SELECT || mode === ActionMode.Board
  }

  private prepareDrag(opt: fabric.IEvent<Event>) {
    const canvas = paintBoard.canvas
    const e = opt.e as MouseEvent | TouchEvent | undefined
    if (!canvas || !e || !this.isSelectMode()) {
      return
    }
    if (paintBoard.textElement.isTextEditing) {
      return
    }
    if (paintBoard.evnet?.mouseEvent.isSpaceKeyDown) {
      return
    }

    const active = canvas.getActiveObject()
    if (!active || isObjectLocked(active)) {
      return
    }

    const target = opt.target
    if (!target) {
      return
    }

    // Scaling / rotating handles should keep their normal behavior.
    if ((target as fabric.Object & { __corner?: string }).__corner) {
      return
    }

    const activeObjects = filterUnlockedObjects(canvas.getActiveObjects())
    if (!activeObjects.length) {
      return
    }

    const selectionObjects =
      active.type === 'activeSelection'
        ? (active as fabric.ActiveSelection).getObjects()
        : [active]
    const isInSelection =
      target === active ||
      activeObjects.includes(target) ||
      selectionObjects.includes(target)

    if (!isInSelection) {
      return
    }

    this.moveOrigin = {
      left: active.left ?? 0,
      top: active.top ?? 0
    }

    const mouseEvent = e as MouseEvent
    if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
      // ActiveSelection children use group-relative left/top — convert to
      // canvas space so the copy stays under the original, not far away.
      this.pendingDuplicate = activeObjects.map((object) => {
        const { left, top } = getObjectScenePosition(object)
        return { object, left, top }
      })
    }
  }

  private async handleMoving(opt: fabric.IEvent<Event>) {
    const canvas = paintBoard.canvas
    const target = opt.target
    if (!canvas || !target) {
      return
    }

    if (this.pendingDuplicate && !this.duplicated) {
      this.duplicated = true
      const snapshot = this.pendingDuplicate
      this.pendingDuplicate = null
      await cloneObjectsInPlace(
        snapshot.map(({ object, left, top }) => ({ object, left, top }))
      )
    }

    const e = opt.e as MouseEvent | undefined
    if (!e?.shiftKey || !this.moveOrigin) {
      this.axisLock = null
      return
    }

    const left = target.left ?? 0
    const top = target.top ?? 0
    const dx = Math.abs(left - this.moveOrigin.left)
    const dy = Math.abs(top - this.moveOrigin.top)

    if (!this.axisLock) {
      // Wait until the pointer moves enough to pick a stable axis.
      if (dx < 2 && dy < 2) {
        return
      }
      this.axisLock = dx >= dy ? 'x' : 'y'
    }

    if (this.axisLock === 'x') {
      target.set({ top: this.moveOrigin.top })
    } else {
      target.set({ left: this.moveOrigin.left })
    }
    target.setCoords()
  }
}
