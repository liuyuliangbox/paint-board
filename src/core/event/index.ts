import { fabric } from 'fabric'
import { EraserCursor } from '@/core/element/eraser/cursor'
import { CanvasMouseEvent } from './mouseEvent'
import { ImageDrop } from './imageDrop'
import { ObjectEvent } from './objectEvent'
import { DragInteraction } from './dragInteraction'
import { RightClickSelect } from './rightClickSelect'
import { LongPressSelect } from './longPressSelect'
import { WidgetDrop } from './widgetDrop'
import { CanvasTouchEvent } from './touchEvent'
import { CanvasZoomEvent } from './zoomEvent'
import { WindowEvent } from './windowEvent'

export class EventModule {
  eraserCursor: EraserCursor
  imageDrop: ImageDrop
  widgetDrop: WidgetDrop
  mouseEvent: CanvasMouseEvent
  zoomEvent: CanvasZoomEvent
  objectEvent: ObjectEvent
  dragInteraction: DragInteraction
  rightClickSelect: RightClickSelect
  longPressSelect: LongPressSelect
  windowEvent: WindowEvent
  touchEvent: CanvasTouchEvent

  constructor(canvas: fabric.Canvas | null) {
    this.eraserCursor = new EraserCursor()
    this.imageDrop = new ImageDrop()
    this.widgetDrop = new WidgetDrop()
    if (canvas) {
      this.eraserCursor.attach(canvas)
      this.imageDrop.attach(canvas)
      this.widgetDrop.attach(canvas)
    }
    const mouseEvent = new CanvasMouseEvent(this.eraserCursor)
    this.mouseEvent = mouseEvent

    const zoomEvent = new CanvasZoomEvent()
    this.zoomEvent = zoomEvent

    const objectEvent = new ObjectEvent()
    this.objectEvent = objectEvent

    const dragInteraction = new DragInteraction()
    this.dragInteraction = dragInteraction

    const rightClickSelect = new RightClickSelect()
    this.rightClickSelect = rightClickSelect

    const longPressSelect = new LongPressSelect()
    this.longPressSelect = longPressSelect

    const windowEvent = new WindowEvent()
    this.windowEvent = windowEvent

    const touchEvent = new CanvasTouchEvent()
    this.touchEvent = touchEvent
  }

  removeEvent() {
    this.eraserCursor.detach()
    this.imageDrop.detach()
    this.widgetDrop.detach()
    this.longPressSelect.removeEvents()
    this.windowEvent.removeWindowEvents()
    this.touchEvent.removeTouchEvents()
  }
}
