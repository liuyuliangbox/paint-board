import { NARROW_PORTRAIT_MQ } from '@/utils/screenOrientation'

/** Bump key when default behavior changes so old collapsed cache does not stick. */
const LEGEND_KEY = 'PAINT-BOARD-DOCK-LEGEND-V3'

const isNarrowPortrait = () => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }
  return window.matchMedia(NARROW_PORTRAIT_MQ).matches
}

/**
 * Persist user choice. First visit: open on desktop/landscape, closed on
 * narrow portrait so the rail stays icon-thin.
 */
export const readDockLegendOpen = () => {
  try {
    const raw = localStorage.getItem(LEGEND_KEY)
    if (raw === null) {
      const open = !isNarrowPortrait()
      localStorage.setItem(LEGEND_KEY, open ? '1' : '0')
      return open
    }
    return raw !== '0'
  } catch {
    return !isNarrowPortrait()
  }
}

export const writeDockLegendOpen = (open: boolean) => {
  try {
    localStorage.setItem(LEGEND_KEY, open ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}

const CHROME_HIDDEN_KEY = 'PAINT-BOARD-CHROME-HIDDEN-V1'

export const readChromeHidden = () => {
  try {
    return localStorage.getItem(CHROME_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

export const writeChromeHidden = (hidden: boolean) => {
  try {
    localStorage.setItem(CHROME_HIDDEN_KEY, hidden ? '1' : '0')
  } catch {
    // ignore
  }
}
