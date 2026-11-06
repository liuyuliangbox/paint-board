import { fabric } from 'fabric'
import debounce from 'lodash-es/debounce'
import { paintBoard } from '@/core/paintBoard'

import { MAX_ZOOM, MIN_ZOOM } from '../zoomEvent'
import useBoardStore from '@/store/board'
import useFileStore from '@/store/files'
import { beginCanvasPan, endCanvasPan } from '../canvasPan'
import { syncRoughShapePadding } from '@/core/element/shape/utils/roughGroup'
import {
  cloneObjectsInPlace,
  isObjectLocked,
  snapshotActiveObjectsForDuplicate
} from '@/core/utils/object'
import { ActionMode } from '@/constants'
import {
  classifyTwoFingerGesture,
  TwoFingerGestureMode
} from './twoFingerGesture'

type DragKind = 'canvas' | 'selection'

type FabricCanvasInternal = fabric.Canvas & {
  _currentTransform?: unknown | null
}

/**
 * Two-finger canvas gestures:
 * - pinch (distance change) → zoom only
 * - drag on blank → pan only
 * - drag on current selection → duplicate once, then move selection
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
  private dragKind: DragKind | null = null
  private selectionHitAtStart = false
  private selectionMoved = false
  private selectionDupStarted = false
  private lastMidScreen?: fabric.Point

  reset() {
    this.endHitTestBypass()
    this.isDragging = false
    this.startDistance = 1
    this.startX = 0
    this.startY = 0
    this.startScale = 1
    this.lastPan = undefined
    this.gestureMode = 'pending'
    this.dragKind = null
    this.selectionHitAtStart = false
    this.selectionMoved = false
    this.selectionDupStarted = false
    this.lastMidScreen = undefined
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

  private midHitsActiveSelection(
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
    this.dragKind = null
    this.isDragging = false
    this.lastPan = undefined
    this.lastMidScreen = new fabric.Point(this.startX, this.startY)
    this.selectionMoved = false
    this.selectionDupStarted = false

    const midClientX = (touch1.clientX + touch2.clientX) / 2
    const midClientY = (touch1.clientY + touch2.clientY) / 2
    this.selectionHitAtStart = this.midHitsActiveSelection(
      canvas,
      midClientX,
      midClientY
    )

    // Second finger: stop any single-finger object drag Fabric started.
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

      if (next === 'pinch') {
        this.dragKind = null
        this.beginHitTestBypass()
      } else {
        this.dragKind = this.selectionHitAtStart ? 'selection' : 'canvas'
        this.beginHitTestBypass()
        this.abortFabricObjectDrag(canvas)
        if (this.dragKind === 'selection') {
          void this.ensureSelectionDuplicated(canvas)
        }
      }
    }

    if (this.gestureMode === 'pinch') {
      this.applyPinchZoom(canvas, currentDistance)
      return
    }

    if (this.gestureMode === 'drag' && this.dragKind === 'canvas') {
      this.applyCanvasPan(canvas, x, y)
      return
    }

    if (this.gestureMode === 'drag' && this.dragKind === 'selection') {
      this.applySelectionDrag(canvas, x, y)
    }
  }

  private applyPinchZoom(canvas: fabric.Canvas, currentDistance: number) {
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

  private async ensureSelectionDuplicated(canvas: fabric.Canvas) {
    if (this.selectionDupStarted) {
      return
    }
    this.selectionDupStarted = true
    const snapshot = snapshotActiveObjectsForDuplicate(canvas)
    if (!snapshot.length) {
      this.dragKind = 'canvas'
      return
    }
    await cloneObjectsInPlace(snapshot)
  }

  private applySelectionDrag(canvas: fabric.Canvas, x: number, y: number) {
    const active = canvas.getActiveObject()
    if (!active || isObjectLocked(active)) {
      this.dragKind = 'canvas'
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
    this.selectionMoved = true
    canvas.requestRenderAll()
  }

  transformEnd() {
    const canvas = paintBoard.canvas
    if (
      canvas &&
      this.gestureMode === 'drag' &&
      this.dragKind === 'selection' &&
      this.selectionMoved
    ) {
      const active = canvas.getActiveObject()
      if (active) {
        canvas.fire('object:modified', { target: active, action: 'drag' })
      }
    }

    this.endHitTestBypass()
    this.isDragging = false
    this.gestureMode = 'pending'
    this.dragKind = null
    this.selectionHitAtStart = false
    this.selectionMoved = false
    this.selectionDupStarted = false
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
