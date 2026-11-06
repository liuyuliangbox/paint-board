import { fabric } from 'fabric'
import { paintBoard } from '@/core/paintBoard'
import useBoardStore from '@/store/board'
import { ActionMode } from '@/constants'
import { filterUnlockedObjects, isObjectLocked } from '@/core/utils/object'
import useWidgetMenuStore from '@/store/widgetMenu'

const DRAG_THRESHOLD = 4

type ClientPoint = { clientX: number; clientY: number }

/**
 * Right-click select / marquee from any mode.
 *
 * The marquee is a DOM overlay (not a Fabric object): right-button drags often
 * fail to paint on the Fabric canvas, and DOM move events are more reliable
 * when listeners are attached up front on document.
 */
export class RightClickSelect {
  private pressing = false
  private moved = false
  private startClient: ClientPoint | null = null
  private startScene: fabric.Point | null = null
  private overlay: HTMLDivElement | null = null
  private resumeDrawingMode = false
  private canvasEl: HTMLElement | null = null

  private onContextMenu = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 2) {
      return
    }
    // Do not preventDefault here: some Chromium builds then suppress move
    // events for non-primary buttons. contextmenu is blocked separately.
    this.beginGesture(e)
  }

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 2 || this.pressing) {
      return
    }
    this.beginGesture(e)
  }

  private onDocMove = (e: Event) => {
    if (!this.pressing || !this.isClientPoint(e)) {
      return
    }
    this.updateGesture(e)
  }

  private onDocUp = (e: Event) => {
    if (!this.pressing) {
      return
    }
    if ('button' in e && (e as MouseEvent).button !== 2) {
      return
    }
    if (!this.isClientPoint(e)) {
      this.cancelGesture()
      return
    }
    this.finishGesture(e)
  }

  private onWindowBlur = () => {
    if (this.pressing) {
      this.cancelGesture()
    }
  }

  private isClientPoint(e: Event): e is Event & ClientPoint {
    return (
      'clientX' in e &&
      'clientY' in e &&
      typeof (e as ClientPoint).clientX === 'number' &&
      typeof (e as ClientPoint).clientY === 'number'
    )
  }

  constructor() {
    this.bindEvents()
  }

  private bindEvents() {
    const canvas = paintBoard.canvas
    if (!canvas) {
      return
    }

    const el = canvas.upperCanvasEl ?? null
    this.canvasEl = el
    if (!el) {
      return
    }

    el.addEventListener('contextmenu', this.onContextMenu, true)
    el.addEventListener('auxclick', this.onContextMenu, true)
    el.addEventListener('pointerdown', this.onPointerDown, true)
    el.addEventListener('mousedown', this.onMouseDown, true)

    // Attach move/up listeners immediately — waiting until pointerdown can
    // miss the first moves, and RMB drag is flaky if listeners come late.
    document.addEventListener('pointermove', this.onDocMove, true)
    document.addEventListener('mousemove', this.onDocMove, true)
    document.addEventListener('pointerup', this.onDocUp, true)
    document.addEventListener('mouseup', this.onDocUp, true)
    window.addEventListener('blur', this.onWindowBlur)
  }

  private getScenePoint(e: ClientPoint) {
    const canvas = paintBoard.canvas
    if (!canvas) {
      return null
    }
    const pointer = canvas.getPointer(e as MouseEvent, false)
    return new fabric.Point(pointer.x, pointer.y)
  }

  private ensureOverlay() {
    if (this.overlay) {
      return this.overlay
    }
    const node = document.createElement('div')
    node.setAttribute('data-paint-board-marquee', 'true')
    Object.assign(node.style, {
      position: 'fixed',
      left: '0px',
      top: '0px',
      width: '0px',
      height: '0px',
      pointerEvents: 'none',
      zIndex: '2147483646',
      boxSizing: 'border-box',
      border: '1px solid rgba(64, 169, 106, 0.95)',
      background: 'rgba(101, 204, 138, 0.28)',
      display: 'none'
    } as CSSStyleDeclaration)
    document.body.appendChild(node)
    this.overlay = node
    return node
  }

  private hideOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'none'
    }
  }

  private removeOverlay() {
    this.overlay?.remove()
    this.overlay = null
  }

  private beginGesture(e: ClientPoint) {
    if (this.pressing) {
      return
    }
    if (paintBoard.textElement.isTextEditing) {
      return
    }
    if (paintBoard.evnet?.mouseEvent.isSpaceKeyDown) {
      return
    }

    const canvas = paintBoard.canvas
    const point = this.getScenePoint(e)
    if (!canvas || !point) {
      return
    }

    this.pressing = true
    this.moved = false
    this.startClient = { clientX: e.clientX, clientY: e.clientY }
    this.startScene = new fabric.Point(point.x, point.y)
    this.hideOverlay()

    if (canvas.isDrawingMode) {
      this.resumeDrawingMode = true
      canvas.isDrawingMode = false
      ;(
        canvas as fabric.Canvas & { _isCurrentlyDrawing?: boolean }
      )._isCurrentlyDrawing = false
    } else {
      this.resumeDrawingMode = false
    }
  }

  private updateGesture(e: ClientPoint) {
    if (!this.pressing || !this.startClient) {
      return
    }

    const dx = e.clientX - this.startClient.clientX
    const dy = e.clientY - this.startClient.clientY
    if (
      Math.abs(dx) < DRAG_THRESHOLD &&
      Math.abs(dy) < DRAG_THRESHOLD &&
      !this.moved
    ) {
      return
    }

    this.moved = true
    const left = Math.min(this.startClient.clientX, e.clientX)
    const top = Math.min(this.startClient.clientY, e.clientY)
    const width = Math.abs(dx)
    const height = Math.abs(dy)

    const overlay = this.ensureOverlay()
    overlay.style.display = 'block'
    overlay.style.left = `${left}px`
    overlay.style.top = `${top}px`
    overlay.style.width = `${width}px`
    overlay.style.height = `${height}px`
  }

  private finishGesture(e: ClientPoint & Event) {
    const canvas = paintBoard.canvas
    const startScene = this.startScene
    const startClient = this.startClient
    const moved = this.moved

    this.pressing = false
    this.startScene = null
    this.startClient = null
    this.moved = false
    this.hideOverlay()

    if (!canvas || !startScene || !startClient) {
      this.restoreDrawingMode()
      return
    }

    // Right-click (no drag) on the current selection → widget context menu.
    if (!moved) {
      const active = canvas.getActiveObject()
      const activeObjects = canvas.getActiveObjects()
      const target = this.findTargetAtEvent(e)
      if (
        active &&
        activeObjects.length > 0 &&
        target &&
        this.isTargetInSelection(active, activeObjects, target)
      ) {
        this.resumeDrawingMode = false
        useBoardStore.getState().updateMode(ActionMode.SELECT)
        useWidgetMenuStore.getState().openMenu(e.clientX, e.clientY)
        canvas.requestRenderAll()
        return
      }
    }

    let selected: fabric.Object[] = []

    if (moved) {
      const endScene = this.getScenePoint(e)
      if (endScene) {
        selected = this.objectsInSceneRect(canvas, startScene, endScene)
      }
    } else {
      const target = this.findTargetAtEvent(e)
      if (target && target.type !== 'activeSelection') {
        selected = [target]
      }
    }

    selected = filterUnlockedObjects(selected)

    if (!selected.length) {
      this.restoreDrawingMode()
      canvas.requestRenderAll()
      return
    }

    this.resumeDrawingMode = false
    useBoardStore.getState().updateMode(ActionMode.SELECT)
    this.applySelection(canvas, selected)
  }

  private isTargetInSelection(
    active: fabric.Object,
    activeObjects: fabric.Object[],
    target: fabric.Object
  ) {
    if (target === active || activeObjects.includes(target)) {
      return true
    }
    if (active.type === 'activeSelection') {
      return (active as fabric.ActiveSelection).getObjects().includes(target)
    }
    return false
  }

  private cancelGesture() {
    this.pressing = false
    this.startScene = null
    this.startClient = null
    this.moved = false
    this.hideOverlay()
    this.restoreDrawingMode()
  }

  private findTargetAtEvent(e: ClientPoint & Event) {
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
      const pointer = this.getScenePoint(e)
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
    // ActiveSelection is a valid hit when multi-selecting (widget menu, etc.).
    if (target.type !== 'activeSelection' && isObjectLocked(target)) {
      return null
    }
    return target
  }

  private objectsInSceneRect(
    canvas: fabric.Canvas,
    a: fabric.Point,
    b: fabric.Point
  ) {
    const left = Math.min(a.x, b.x)
    const top = Math.min(a.y, b.y)
    const right = Math.max(a.x, b.x)
    const bottom = Math.max(a.y, b.y)

    // Build a temporary rect in the same space as object bounding boxes.
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

  private applySelection(canvas: fabric.Canvas, objects: fabric.Object[]) {
    canvas.discardActiveObject()
    if (objects.length === 1) {
      canvas.setActiveObject(objects[0])
    } else {
      canvas.setActiveObject(
        new fabric.ActiveSelection(objects, {
          canvas
        })
      )
    }
    canvas.requestRenderAll()
    paintBoard.triggerHook()
  }

  private restoreDrawingMode() {
    if (!this.resumeDrawingMode) {
      this.resumeDrawingMode = false
      return
    }
    this.resumeDrawingMode = false
    paintBoard.handleMode()
  }
}
