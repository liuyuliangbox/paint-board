import { create } from 'zustand'
import {
  readChromeHidden,
  readDockLegendOpen,
  writeChromeHidden,
  writeDockLegendOpen
} from '@/components/boardOperation/operationDock/dockStorage'

interface UiLegendState {
  /** Show text labels beside chrome / dock / help icons. */
  legendOpen: boolean
  /** Hide all chrome for clean screenshots; one restore control remains. */
  chromeHidden: boolean
  setLegendOpen: (open: boolean) => void
  toggleLegend: () => void
  setChromeHidden: (hidden: boolean) => void
  toggleChromeHidden: () => void
}

/**
 * Global “show labels” + “hide chrome” preferences.
 * Legend uses the same localStorage key as the old dock legend.
 */
const useUiLegendStore = create<UiLegendState>((set, get) => ({
  legendOpen: readDockLegendOpen(),
  chromeHidden: readChromeHidden(),
  setLegendOpen: (open) => {
    writeDockLegendOpen(open)
    set({ legendOpen: open })
  },
  toggleLegend: () => {
    const next = !get().legendOpen
    writeDockLegendOpen(next)
    set({ legendOpen: next })
  },
  setChromeHidden: (hidden) => {
    writeChromeHidden(hidden)
    set({ chromeHidden: hidden })
  },
  toggleChromeHidden: () => {
    const next = !get().chromeHidden
    writeChromeHidden(next)
    set({ chromeHidden: next })
  }
}))

export default useUiLegendStore
