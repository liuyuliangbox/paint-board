import { create } from 'zustand'
import {
  readDockLegendOpen,
  writeDockLegendOpen
} from '@/components/boardOperation/operationDock/dockStorage'

interface UiLegendState {
  /** Show text labels beside chrome / dock / help icons. */
  legendOpen: boolean
  setLegendOpen: (open: boolean) => void
  toggleLegend: () => void
}

/**
 * Global “show labels” preference. Same localStorage key as the old dock
 * legend so existing user choice carries over.
 */
const useUiLegendStore = create<UiLegendState>((set, get) => ({
  legendOpen: readDockLegendOpen(),
  setLegendOpen: (open) => {
    writeDockLegendOpen(open)
    set({ legendOpen: open })
  },
  toggleLegend: () => {
    const next = !get().legendOpen
    writeDockLegendOpen(next)
    set({ legendOpen: next })
  }
}))

export default useUiLegendStore
