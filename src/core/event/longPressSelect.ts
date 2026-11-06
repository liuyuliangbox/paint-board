import { fabric } from 'fabric'
import { paintBoard } from '@/core/paintBoard'
import useBoardStore from '@/store/board'
import { ActionMode } from '@/constants'
import { filterUnlockedObjects } from '@/core/utils/object'
import {
  applyCanvasSelection,
  findUnlockedTargetAtClient,
  getScenePointFromClient,
  objectsInSceneRect
} from './selectionHelpers'

const LONG_PRESS_MS = 500
const MOVE_CANCEL_PX = 8
const MARQUEE_THRESHOLD = 4

type ClientPoint = { clientX: number; clientY: number }

/**
 * Touch long-press: select object / marquee (desktop right-click equivalent).
 * Disabled while hand-pan mode is on.
 */
export class LongPressSelect {
  private timer: number | undefined
  private pressing = false
  private armed = false
  private moved = false
  private startClient: ClientPoint | null = null
  private startScene: fabric.Point | null = null
  private overlay: HTMLDivElement | null = null
  private resumeDrawingMode = false
  private pointerId: number | null = null

  constructor() {
    this.bindEvents()
  }

  private bindEvents() {
    const el = paintBoard.canvas?.upperCanvasEl
    if (!el) {
      return
    }
    el.addEventListener('pointerdown', this.onPointerDown, true)
    document.addEventListener('pointermove', this.onPointerMove, true)
    document.addEventListener('pointerup', this.onPointerUp, true)
    document.addEventListener('pointercancel', this.onPointerCancel, true)
  }

  removeEvents() {
    const el = paintBoard.canvas?.upperCanvasEl
    el?.removeEventListener('pointerdown', this.onPointerDown, true)
    document.removeEventListener('pointermove', this.onPointerMove, true)
    document.removeEventListener('pointerup', this.onPointerUp, true)
    document.removeEventListener('pointercancel', this.onPointerCancel, true)
    this.clearTimer()
    this.hideOverlay()
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) {
      return
    }
    // Mouse right-click path stays on RightClickSelect; long-press is for touch.
    if (e.pointerType === 'mouse') {
      return
    }
    if (useBoardStore.getState().isPanMode) {
      return
    }
    if (paintBoard.textElement.isTextEditing) {
      return
    }
    if ((paintBoard.evnet?.touchEvent?.touches ?? 0) >= 2) {
      return
    }

    this.clearTimer()
    this.pressing = true
    this.armed = false
    this.moved = false
    this.pointerId = e.pointerId
    this.startClient = { clientX: e.clientX, clientY: e.clientY }
    this.startScene = getScenePointFromClient(e)
    this.hideOverlay()

    this.timer = window.setTimeout(() => {
      if (!this.pressing || !this.startClient) {
        return
      }
      this.armed = true
      const canvas = paintBoard.canvas
      if (canvas?.isDrawingMode) {
        this.resumeDrawingMode = true
        canvas.isDrawingMode = false
        ;(
          canvas as fabric.Canvas & { _isCurrentlyDrawing?: boolean }
        )._isCurrentlyDrawing = false
      } else {
        this.resumeDrawingMode = false
      }
    }, LONG_PRESS_MS)
  }

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pressing || e.pointerId !== this.pointerId || !this.startClient) {
      return
    }
    if ((paintBoard.evnet?.touchEvent?.touches ?? 0) >= 2) {
      this.cancelGesture()
      return
    }

    const dx = e.clientX - this.startClient.clientX
    const dy = e.clientY - this.startClient.clientY
    const dist = Math.hypot(dx, dy)

    if (!this.armed) {
      if (dist > MOVE_CANCEL_PX) {
        this.cancelGesture()
      }
      return
    }

    if (
      Math.abs(dx) < MARQUEE_THRESHOLD &&
      Math.abs(dy) < MARQUEE_THRESHOLD &&
      !this.moved
    ) {
      return
    }

    this.moved = true
    const left = Math.min(this.startClient.clientX, e.clientX)
    const top = Math.min(this.startClient.clientY, e.clientY)
    const overlay = this.ensureOverlay()
    overlay.style.display = 'block'
    overlay.style.left = `${left}px`
    overlay.style.top = `${top}px`
    overlay.style.width = `${Math.abs(dx)}px`
    overlay.style.height = `${Math.abs(dy)}px`
  }

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pressing || e.pointerId !== this.pointerId) {
      return
    }
    this.finishGesture(e)
  }

  private onPointerCancel = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) {
      return
    }
    this.cancelGesture()
  }

  private finishGesture(e: PointerEvent) {
    const canvas = paintBoard.canvas
    const startScene = this.startScene
    const armed = this.armed
    const moved = this.moved

    this.clearTimer()
    this.pressing = false
    this.armed = false
    this.moved = false
    this.pointerId = null
    this.startClient = null
    this.startScene = null
    this.hideOverlay()

    if (!armed || !canvas || !startScene) {
      this.restoreDrawingMode()
      return
    }

    let selected: fabric.Object[] = []
    if (moved) {
      const endScene = getScenePointFromClient(e)
      if (endScene) {
        selected = objectsInSceneRect(canvas, startScene, endScene)
      }
    } else {
      const target = findUnlockedTargetAtClient(e)
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
    applyCanvasSelection(canvas, selected)
  }

  private cancelGesture() {
    this.clearTimer()
    this.pressing = false
    this.armed = false
    this.moved = false
    this.pointerId = null
    this.startClient = null
    this.startScene = null
    this.hideOverlay()
    this.restoreDrawingMode()
  }

  private clearTimer() {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer)
      this.timer = undefined
    }
  }

  private ensureOverlay() {
    if (this.overlay) {
      return this.overlay
    }
    const node = document.createElement('div')
    node.setAttribute('data-paint-board-longpress-marquee', 'true')
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

  private restoreDrawingMode() {
    if (!this.resumeDrawingMode) {
      return
    }
    this.resumeDrawingMode = false
    paintBoard.handleMode()
  }
}
