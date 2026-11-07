import { create } from 'zustand'

export type UiOverlayId = 'none' | 'tools' | 'layers' | 'boards' | 'widgets'

const PORTRAIT_XS = '(max-width: 750px) and (orientation: portrait)'

/** Narrow phone portrait: only one primary overlay at a time. */
export const shouldMutexOverlays = () => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false
  }
  return window.matchMedia(PORTRAIT_XS).matches
}

interface UiOverlayState {
  active: UiOverlayId
  /** Claim this overlay; under mutex, peers should close when active !== them. */
  open: (id: Exclude<UiOverlayId, 'none'>) => void
  /** Clear only if this overlay is still the active one. */
  close: (id: Exclude<UiOverlayId, 'none'>) => void
}

const useUiOverlayStore = create<UiOverlayState>((set, get) => ({
  active: 'none',
  open(id) {
    set({ active: id })
  },
  close(id) {
    if (get().active === id) {
      set({ active: 'none' })
    }
  }
}))

export default useUiOverlayStore
