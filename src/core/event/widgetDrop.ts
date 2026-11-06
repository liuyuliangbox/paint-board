import { fabric } from 'fabric'
import useWidgetStore, { WIDGET_DRAG_MIME } from '@/store/widgets'
import { insertWidgetObjects } from '@/core/widget/widget'

const isWidgetDrag = (event: DragEvent) => {
  const types = Array.from(event.dataTransfer?.types ?? [])
  return types.includes(WIDGET_DRAG_MIME) || types.includes('text/plain')
}

/**
 * Drop widgets from the top panel onto the live canvas.
 */
export class WidgetDrop {
  private canvas: fabric.Canvas | null = null
  private target: HTMLElement | null = null

  attach(canvas: fabric.Canvas) {
    const target = canvas.upperCanvasEl
    if (!target) {
      return
    }
    this.detach()
    this.canvas = canvas
    this.target = target
    target.addEventListener('dragover', this.onDragOver)
    target.addEventListener('drop', this.onDrop)
  }

  detach() {
    this.target?.removeEventListener('dragover', this.onDragOver)
    this.target?.removeEventListener('drop', this.onDrop)
    this.canvas = null
    this.target = null
  }

  private onDragOver = (event: DragEvent) => {
    if (!isWidgetDrag(event)) {
      return
    }
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  private onDrop = (event: DragEvent) => {
    if (!isWidgetDrag(event)) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    const id =
      event.dataTransfer?.getData(WIDGET_DRAG_MIME) ||
      event.dataTransfer?.getData('text/plain')
    if (!id || !this.canvas) {
      return
    }
    const pointer = this.canvas.getPointer(event, false)
    void (async () => {
      const objects = await useWidgetStore.getState().getWidgetObjects(id)
      if (!objects?.length) {
        return
      }
      await insertWidgetObjects(objects, { x: pointer.x, y: pointer.y })
    })()
  }
}
