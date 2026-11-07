import { fabric } from 'fabric'
import { paintBoard } from '@/core/paintBoard'
import useBoardStore from '@/store/board'
import { isCanvasTextObject } from '@/core/element/text/placeholder'
import { EraserCursor } from '@/core/element/eraser/cursor'
import { DrawingHandler } from './draw/drawingHandler'
import { beginCanvasPan, endCanvasPan } from './canvasPan'

const isPrimaryPointer = (event?: Event) => {
  if (!event) {
    return true
  }
  if ('touches' in event || event.type.startsWith('touch')) {
    return true
  }
  if ('button' in event) {
    const button = (event as MouseEvent).button
    // Touch-synthesized mouse events often omit button (undefined).
    return button === 0 || button === undefined
  }
  return true
}

const isRightClick = (event?: Event) =>
  Boolean(event && 'button' in event && (event as MouseEvent).button === 2)

const pointerClient = (event?: Event) => {
  if (!event) {
    return null
  }
  if ('clientX' in event && typeof (event as MouseEvent).clientX === 'number') {
    return {
      x: (event as MouseEvent).clientX,
      y: (event as MouseEvent).clientY
    }
  }
  const touch =
    (event as TouchEvent).touches?.[0] ||
    (event as TouchEvent).changedTouches?.[0]
  if (touch) {
    return { x: touch.clientX, y: touch.clientY }
  }
  return null
}

export class CanvasMouseEvent {
  drawingHandler: DrawingHandler
  isMouseDown = false
  isSpaceKeyDown = false
  /** Ctrl/Cmd + drag on empty canvas pans (does not conflict with Ctrl-drag copy on objects). */
  isCtrlEmptyPan = false
  /** Touch hand-tool pan (isPanMode). */
  isHandPan = false
  private eraserCursor: EraserCursor
  private handPanActive = false
  private handPanLast: { x: number; y: number } | null = null

  constructor(eraserCursor: EraserCursor) {
    this.eraserCursor = eraserCursor
    this.drawingHandler = new DrawingHandler()
    this.initMouseEvents()
  }

  initMouseEvents() {
    const canvas = paintBoard.canvas

    canvas?.on('mouse:down', (e) => {
      // Right-click is reserved for cross-mode select / marquee.
      if (isRightClick(e.e)) {
        return
      }

      this.isMouseDown = true
      this.isCtrlEmptyPan = false
      this.isHandPan = false
      this.handPanLast = null
      if (this.isSpaceKeyDown) {
        return
      }

      // Hand-tool pan (touch): single finger moves the board.
      if (useBoardStore.getState().isPanMode && isPrimaryPointer(e.e)) {
        this.isHandPan = true
        this.handPanLast = pointerClient(e.e)
        this.beginHandPan(canvas)
        return
      }

      // Ctrl/Cmd + drag blank area → pan the board.
      // (Ctrl+drag on an object still means duplicate-while-move.)
      const mouse = e.e as MouseEvent | undefined
      const isCtrl = Boolean(mouse && (mouse.ctrlKey || mouse.metaKey))
      if (isCtrl && !e.target && isPrimaryPointer(e.e)) {
        this.isCtrlEmptyPan = true
        beginCanvasPan(canvas)
        canvas.defaultCursor = 'grabbing'
        canvas.setCursor('grabbing')
        return
      }

      if (e.absolutePointer) {
        this.drawingHandler.drawingStart(e.absolutePointer)
      }
    })

    // Drawing mode returns before `mouse:move`, but `mouse:move:before`
    // still carries the pointer. The eraser ring follows that event.
    canvas?.on('mouse:move:before', (e) => {
      this.eraserCursor.move(e.e)
    })

    canvas?.on('mouse:out', (e) => {
      if (e.e.type === 'mouseout') {
        this.eraserCursor.leave()
      }
    })

    canvas?.on('mouse:move', (e) => {
      if (this.isMouseDown) {
        // Space / Ctrl-empty / hand-tool pan.
        if (this.isSpaceKeyDown || this.isCtrlEmptyPan || this.isHandPan) {
          // Touch often has no usable movementX/Y — delta from client points.
          const client = pointerClient(e.e)
          if (client && this.handPanLast) {
            canvas.relativePan(
              new fabric.Point(
                client.x - this.handPanLast.x,
                client.y - this.handPanLast.y
              )
            )
            this.handPanLast = client
          } else if (
            typeof e.e.movementX === 'number' &&
            typeof e.e.movementY === 'number'
          ) {
            canvas.relativePan(new fabric.Point(e.e.movementX, e.e.movementY))
            if (client) {
              this.handPanLast = client
            }
          } else if (client) {
            this.handPanLast = client
          }
          return
        }

        // two touch disabled drawing on mobile
        const touches = paintBoard.evnet?.touchEvent?.touches
        if (touches && touches >= 2) {
          return
        }

        if (e.absolutePointer) {
          this.drawingHandler.handDrawing(e.absolutePointer)
        }
      }
    })

    canvas?.on('mouse:up', (e) => {
      this.isMouseDown = false
      this.handPanLast = null
      if (this.isCtrlEmptyPan) {
        this.isCtrlEmptyPan = false
        endCanvasPan(canvas)
        paintBoard.syncPanModeCursor()
      }
      if (this.isHandPan) {
        this.isHandPan = false
        this.endHandPan(canvas)
      }

      if (e.absolutePointer) {
        this.drawingHandler.drawingEnd(e.absolutePointer)
      }
    })

    canvas?.on('mouse:dblclick', (e) => {
      if (!isCanvasTextObject(e.target)) {
        return
      }
      paintBoard.textElement?.editText(e.target as fabric.IText)
    })
  }

  setSpaceKeyDownState(isSpaceKeyDown: boolean) {
    this.isSpaceKeyDown = isSpaceKeyDown
  }

  private beginHandPan(canvas: fabric.Canvas | undefined) {
    if (!canvas || this.handPanActive) {
      return
    }
    this.handPanActive = true
    beginCanvasPan(canvas)
    canvas.defaultCursor = 'grabbing'
    canvas.setCursor('grabbing')
  }

  private endHandPan(canvas: fabric.Canvas | undefined) {
    if (!this.handPanActive) {
      paintBoard.syncPanModeCursor()
      return
    }
    this.handPanActive = false
    endCanvasPan(canvas)
    paintBoard.syncPanModeCursor()
  }
}
