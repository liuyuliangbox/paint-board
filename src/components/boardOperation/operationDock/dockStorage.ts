const LEGEND_KEY = 'PAINT-BOARD-DOCK-LEGEND'

export const readDockLegendOpen = () => {
  try {
    return localStorage.getItem(LEGEND_KEY) === '1'
  } catch {
    return false
  }
}

export const writeDockLegendOpen = (open: boolean) => {
  try {
    localStorage.setItem(LEGEND_KEY, open ? '1' : '0')
  } catch {
    // ignore quota / private mode
  }
}
