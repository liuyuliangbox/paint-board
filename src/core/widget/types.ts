export const MAX_WIDGET_COUNT = 50
export const WIDGET_LIST_STORAGE_KEY = 'PAINT-BOARD-WIDGETS'
export const WIDGET_BLOB_PREFIX = 'paint-board-widget:'

export type WidgetObjectJSON = Record<string, unknown>

export interface WidgetPayload {
  objects: WidgetObjectJSON[]
  /** Normalized content width (scene units) */
  width: number
  /** Normalized content height (scene units) */
  height: number
}

export interface WidgetMeta {
  id: string
  title: string
  thumbnail: string
  createdAt: number
  updatedAt: number
}

export interface WidgetRecord extends WidgetMeta {
  payload: WidgetPayload
}

export const widgetBlobKey = (id: string) => `${WIDGET_BLOB_PREFIX}${id}`
