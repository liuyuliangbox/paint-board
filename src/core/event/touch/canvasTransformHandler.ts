import { fabric } from 'fabric'
import debounce from 'lodash-es/debounce'
import { paintBoard } from '@/core/paintBoard'

import { MAX_ZOOM, MIN_ZOOM } from '../zoomEvent'
import useBoardStore from '@/store/board'
import useFileStore from '@/store/files'
import { beginCanvasPan, endCanvasPan } from '../canvasPan'
import { syncRoughShapePadding } from '@/core/element/shape/utils/roughGroup'
import { isObjectLocked } from '@/core/utils/object'
import { ActionMode } from '@/constants'
import {
  classifyTwoFingerGesture,
  TwoFingerGestureMode
} from './twoFingerGesture'

type TargetKind = 'canvas' | 'selection'

type FabricCanvasInternal = fabric.Canvas & {
  _currentTransform?: unknown | null
}

const MIN_OBJECT_SCALE = 0.05

/**
 * Two-finger canvas gestures:
 * - pinch on selection → scale selection
 * - pinch on empty → zoom canvas
 * - drag on selection → move selection
 * - drag on empty → pan canvas
 */
export class CanvasTransformHandler {
  isDragging = false
  startDistance = 1
  startX = 0
  startY = 0
  startScale = 1
  lastPan?: fabric.Point
  private hitTestBypass = false
  private gestureMode: TwoFingerGestureMode = 'pending'
  private targetKind: TargetKind | null = null
  private selectionHitAtStart = false
  private selectionChanged = false
  private lastMidScreen?: fabric.Point
  private selectionStartScaleX = 1
  private selectionStartScaleY = 1

  reset() {
    this.endHitTestBypass()
    this.isDragging = false
    this.startDistance = 1
    this.startX = 0
    this.startY = 0
    this.startScale = 1
    this.lastPan = undefined
    this.gestureMode = 'pending'
    this.targetKind = null
    this.selectionHitAtStart = false
    this.selectionChanged = false
    this.lastMidScreen = undefined
    this.selectionStartScaleX = 1
    this.selectionStartScaleY = 1
  }

  private beginHitTestBypass() {
    if (this.hitTestBypass) {
      return
    }
    this.hitTestBypass = true
    beginCanvasPan(paintBoard.canvas)
  }

  private endHitTestBypass() {
    if (!this.hitTestBypass) {
      return
    }
    this.hitTestBypass = false
    endCanvasPan(paintBoard.canvas)
  }

  private abortFabricObjectDrag(canvas: fabric.Canvas) {
    const internal = canvas as FabricCanvasInternal
    if (internal._currentTransform) {
      internal._currentTransform = null
    }
  }

  private isSelectMode() {
    const { mode } = useBoardStore.getState()
    return mode === ActionMode.SELECT || mode === ActionMode.Board
  }

  private pointHitsActiveSelection(
    canvas: fabric.Canvas,
    clientX: number,
    clientY: number
  ) {
    if (!this.isSelectMode() || useBoardStore.getState().isPanMode) {
      return false
    }
    if (paintBoard.textElement.isTextEditing) {
      return false
    }

    const active = canvas.getActiveObject()
    if (!active || isObjectLocked(active)) {
      return false
    }

    const pointer = canvas.getPointer(
      { clientX, clientY } as unknown as MouseEvent,
      false
    )
    const point = new fabric.Point(pointer.x, pointer.y)
    active.setCoords()
    return Boolean(active.containsPoint?.(point, null, true))
  }

  /** True if midpoint or either finger is on the current selection. */
  private touchesHitActiveSelection(canvas: fabric.Canvas, touches: TouchList) {
    const touch1 = touches[0]
    const touch2 = touches[1]
    const midX = (touch1.clientX + touch2.clientX) / 2
    const midY = (touch1.clientY + touch2.clientY) / 2
    return (
      this.pointHitsActiveSelection(canvas, midX, midY) ||
      this.pointHitsActiveSelection(canvas, touch1.clientX, touch1.clientY) ||
      this.pointHitsActiveSelection(canvas, touch2.clientX, touch2.clientY)
    )
  }

  private captureSelectionScale(canvas: fabric.Canvas) {
    const active = canvas.getActiveObject()
    if (!active || isObjectLocked(active)) {
      this.targetKind = 'canvas'
      return
    }
    this.selectionStartScaleX = active.scaleX ?? 1
    this.selectionStartScaleY = active.scaleY ?? 1
  }

  transformStart(touches: TouchList) {
    const canvas = paintBoard.canvas
    if (!canvas || touches.length !== 2) {
      return
    }

    const touch1 = touches[0]
    const touch2 = touches[1]
    this.startDistance = Math.max(
      1,
      Math.hypot(touch2.pageX - touch1.pageX, touch2.pageY - touch1.pageY)
    )

    this.startX = (touch1.pageX + touch2.pageX) / 2
    this.startY = (touch1.pageY + touch2.pageY) / 2
    this.startScale = canvas.getZoom()
    this.gestureMode = 'pending'
    this.targetKind = null
    this.isDragging = false
    this.lastPan = undefined
    this.lastMidScreen = new fabric.Point(this.startX, this.startY)
    this.selectionChanged = false
    this.selectionHitAtStart = this.touchesHitActiveSelection(canvas, touches)

    // Second finger: stop any single-finger object drag / scale Fabric started.
    this.abortFabricObjectDrag(canvas)
  }

  transformMove(touches: TouchList) {
    const canvas = paintBoard.canvas
    if (!canvas || touches.length !== 2) {
      return
    }

    const touch1 = touches[0]
    const touch2 = touches[1]

    const currentDistance = Math.hypot(
      touch2.pageX - touch1.pageX,
      touch2.pageY - touch1.pageY
    )
    const x = (touch1.pageX + touch2.pageX) / 2
    const y = (touch1.pageY + touch2.pageY) / 2

    const scaleDelta = Math.abs(currentDistance / this.startDistance - 1)
    const panDelta = Math.hypot(x - this.startX, y - this.startY)

    if (this.gestureMode === 'pending') {
      const next = classifyTwoFingerGesture(scaleDelta, panDelta)
      if (next === 'pending') {
        return
      }
      this.gestureMode = next
      this.isDragging = true
      this.lastMidScreen = new fabric.Point(x, y)
      this.lastPan = new fabric.Point(x - this.startX, y - this.startY)
      this.targetKind = this.selectionHitAtStart ? 'selection' : 'canvas'
      this.beginHitTestBypass()
      this.abortFabricObjectDrag(canvas)
      if (next === 'pinch' && this.targetKind === 'selection') {
        this.captureSelectionScale(canvas)
      }
    }

    if (this.gestureMode === 'pinch') {
      if (this.targetKind === 'selection') {
        this.applySelectionPinch(canvas, currentDistance)
      } else {
        this.applyCanvasZoom(canvas, currentDistance)
      }
      return
    }

    if (this.gestureMode === 'drag' && this.targetKind === 'selection') {
      this.applySelectionMove(canvas, x, y)
      return
    }

    if (this.gestureMode === 'drag') {
      this.applyCanvasPan(canvas, x, y)
    }
  }

  private applyCanvasZoom(canvas: fabric.Canvas, currentDistance: number) {
    let zoom = this.startScale * (currentDistance / this.startDistance)
    zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
    if (!useBoardStore.getState().isObjectCaching) {
      fabric.Object.prototype.set({
        objectCaching: true
      })
    }
    syncRoughShapePadding(canvas.getObjects(), zoom)
    canvas.zoomToPoint(new fabric.Point(this.startX, this.startY), zoom)
    paintBoard.evnet?.zoomEvent.scheduleZoomWrite(zoom)

    const fileId = paintBoard.canvasFileId
    const transform = canvas.viewportTransform
    if (fileId && transform) {
      this.saveTransform(fileId, [...transform])
    }
  }

  private applySelectionPinch(canvas: fabric.Canvas, currentDistance: number) {
    const active = canvas.getActiveObject()
    if (!active || isObjectLocked(active)) {
      this.targetKind = 'canvas'
      this.applyCanvasZoom(canvas, currentDistance)
      return
    }

    const ratio = currentDistance / this.startDistance
    const scaleX = Math.max(MIN_OBJECT_SCALE, this.selectionStartScaleX * ratio)
    const scaleY = Math.max(MIN_OBJECT_SCALE, this.selectionStartScaleY * ratio)
    const center = active.getCenterPoint()
    active.set({ scaleX, scaleY })
    active.setPositionByOrigin(center, 'center', 'center')
    active.setCoords()
    this.selectionChanged = true
    canvas.requestRenderAll()
  }

  private applyCanvasPan(canvas: fabric.Canvas, x: number, y: number) {
    const currentPan = new fabric.Point(x - this.startX, y - this.startY)
    if (!this.lastPan) {
      this.lastPan = currentPan
      return
    }
    if (!useBoardStore.getState().isObjectCaching) {
      fabric.Object.prototype.set({
        objectCaching: true
      })
    }
    canvas.relativePan(
      new fabric.Point(
        currentPan.x - this.lastPan.x,
        currentPan.y - this.lastPan.y
      )
    )
    this.lastPan = currentPan
    const fileId = paintBoard.canvasFileId
    const transform = canvas.viewportTransform
    if (fileId && transform) {
      this.saveTransform(fileId, [...transform])
    }
  }

  private applySelectionMove(canvas: fabric.Canvas, x: number, y: number) {
    const active = canvas.getActiveObject()
    if (!active || isObjectLocked(active)) {
      this.targetKind = 'canvas'
      this.applyCanvasPan(canvas, x, y)
      return
    }

    if (!this.lastMidScreen) {
      this.lastMidScreen = new fabric.Point(x, y)
      return
    }

    const zoom = canvas.getZoom() || 1
    const dx = (x - this.lastMidScreen.x) / zoom
    const dy = (y - this.lastMidScreen.y) / zoom
    this.lastMidScreen = new fabric.Point(x, y)

    if (dx === 0 && dy === 0) {
      return
    }

    active.set({
      left: (active.left ?? 0) + dx,
      top: (active.top ?? 0) + dy
    })
    active.setCoords()
    this.selectionChanged = true
    canvas.requestRenderAll()
  }

  transformEnd() {
    const canvas = paintBoard.canvas
    if (
      canvas &&
      this.targetKind === 'selection' &&
      this.selectionChanged &&
      (this.gestureMode === 'drag' || this.gestureMode === 'pinch')
    ) {
      const active = canvas.getActiveObject()
      if (active) {
        canvas.fire('object:modified', {
          target: active,
          action: this.gestureMode === 'pinch' ? 'scale' : 'drag'
        })
      }
    }

    this.endHitTestBypass()
    this.isDragging = false
    this.gestureMode = 'pending'
    this.targetKind = null
    this.selectionHitAtStart = false
    this.selectionChanged = false
    this.lastMidScreen = undefined
    this.lastPan = undefined
  }

  cancelPending() {
    this.saveTransform.cancel()
  }

  private saveTransform = debounce((fileId: string, transform: number[]) => {
    if (paintBoard.canvasFileId !== fileId) {
      return
    }
    useFileStore.getState().updateTransform(transform, fileId)
    if (!useBoardStore.getState().isObjectCaching) {
      fabric.Object.prototype.set({
        objectCaching: false
      })
    }
    paintBoard.canvas?.requestRenderAll()
  }, 500)
}
