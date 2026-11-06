import { fabric } from 'fabric'
import { shouldUseTouchUi } from '@/utils/touchUi'

const DESKTOP_CORNER = 10
const TOUCH_CORNER = 26

export const applyTouchTransformChrome = () => {
  const touch = shouldUseTouchUi()
  const size = touch ? TOUCH_CORNER : DESKTOP_CORNER
  fabric.Object.prototype.set({
    cornerSize: size,
    cornerStyle: 'circle',
    transparentCorners: false
  })
  // Fabric runtime supports touchCornerSize; typings omit it.
  ;(
    fabric.Object.prototype as fabric.Object & { touchCornerSize?: number }
  ).touchCornerSize = touch ? size + 4 : DESKTOP_CORNER + 4
}
