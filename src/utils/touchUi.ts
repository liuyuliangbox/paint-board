const NARROW_MAX_WIDTH = 768

export const isCoarsePointer = () => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }
  return window.matchMedia('(pointer: coarse)').matches
}

export const isNarrowViewport = (maxWidth = NARROW_MAX_WIDTH) => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }
  return window.matchMedia(`(max-width: ${maxWidth - 1}px)`).matches
}

/** Touch-oriented UI: coarse pointer and/or phone-sized viewport. */
export const shouldUseTouchUi = () => isCoarsePointer() || isNarrowViewport()
