/** Bump key when default behavior changes so old collapsed cache does not stick. */
const LEGEND_KEY = 'PAINT-BOARD-DOCK-LEGEND-V2'

/** Default: legend open (show labels). Persist user choice in localStorage. */
export const readDockLegendOpen = () => {
  try {
    const raw = localStorage.getItem(LEGEND_KEY)
    if (raw === null) {
      localStorage.setItem(LEGEND_KEY, '1')
      return true
    }
    return raw !== '0'
  } catch {
    return true
  }
}

export const writeDockLegendOpen = (open: boolean) => {
  try {
    localStorage.setItem(LEGEND_KEY, open ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}
