import { create } from 'zustand'

interface WidgetMenuState {
  open: boolean
  x: number
  y: number
}

interface WidgetMenuAction {
  openMenu: (x: number, y: number) => void
  closeMenu: () => void
}

const useWidgetMenuStore = create<WidgetMenuState & WidgetMenuAction>(
  (set) => ({
    open: false,
    x: 0,
    y: 0,
    openMenu(x, y) {
      set({ open: true, x, y })
    },
    closeMenu() {
      set({ open: false })
    }
  })
)

export default useWidgetMenuStore
