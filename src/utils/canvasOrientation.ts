const MIN_RATIO = 0.1
const MAX_RATIO = 1
/** Landscape / portrait content aspect (width ÷ height). */
const LANDSCAPE_ASPECT = 4 / 3
const PORTRAIT_ASPECT = 3 / 4

const clampRatio = (value: number) =>
  Math.min(MAX_RATIO, Math.max(MIN_RATIO, value))

export const isCanvasLandscape = (
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight
) => {
  const pixelW = viewportWidth * canvasWidth
  const pixelH = viewportHeight * canvasHeight
  return pixelW >= pixelH
}

/**
 * Fit a landscape or portrait board inside the current viewport percentages.
 * Uses full width for landscape and full height for portrait when possible.
 */
export const canvasSizeForOrientation = (
  landscape: boolean,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight
) => {
  const aspect = landscape ? LANDSCAPE_ASPECT : PORTRAIT_ASPECT
  if (landscape) {
    const width = 1
    const height = clampRatio(viewportWidth / (viewportHeight * aspect))
    return { width, height }
  }
  const height = 1
  const width = clampRatio((viewportHeight * aspect) / viewportWidth)
  return { width, height }
}
