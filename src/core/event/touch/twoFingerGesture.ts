export type TwoFingerGestureMode = 'pending' | 'pinch' | 'drag'

export const PINCH_SCALE_THRESHOLD = 0.08
export const DRAG_PAN_THRESHOLD_PX = 10

/**
 * Lock two-finger input to pinch (distance change) or drag (midpoint travel).
 * Once either threshold is met, pick the more dominant signal; callers should
 * keep the result for the rest of the gesture.
 */
export const classifyTwoFingerGesture = (
  scaleDelta: number,
  panDeltaPx: number,
  thresholds: {
    pinchScale?: number
    dragPanPx?: number
  } = {}
): TwoFingerGestureMode => {
  const pinchScale = thresholds.pinchScale ?? PINCH_SCALE_THRESHOLD
  const dragPanPx = thresholds.dragPanPx ?? DRAG_PAN_THRESHOLD_PX

  const pinchReady = scaleDelta >= pinchScale
  const dragReady = panDeltaPx >= dragPanPx

  if (!pinchReady && !dragReady) {
    return 'pending'
  }
  if (pinchReady && !dragReady) {
    return 'pinch'
  }
  if (dragReady && !pinchReady) {
    return 'drag'
  }

  const pinchScore = scaleDelta / pinchScale
  const dragScore = panDeltaPx / dragPanPx
  return pinchScore >= dragScore ? 'pinch' : 'drag'
}
