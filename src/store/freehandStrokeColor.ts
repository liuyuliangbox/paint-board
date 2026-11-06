import { DEFAULT_DRAW_COLORS } from './drawColors'

export const FREEHAND_STROKE_COLOR_LIMIT = 6

export const DEFAULT_FREEHAND_STROKE_COLORS = [...DEFAULT_DRAW_COLORS]

export const DEFAULT_FREEHAND_STROKE_COLOR_INDEX = 2

export const currentFreehandStrokeColor = (colors: string[], index: number) =>
  colors[index] || colors[0] || DEFAULT_FREEHAND_STROKE_COLORS[2]
