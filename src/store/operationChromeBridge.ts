import { create } from 'zustand'

/** Handlers + state for chrome buttons (shared by landscape bar / portrait left rail). */
export type OperationChromeBridge = {
  isFullscreen: boolean
  /** Viewport geometry — CSS / chrome placement. */
  isLandscapeLayout: boolean
  /** App landscape session — 横版/竖版 toggle label & active. */
  isLandscapeSession: boolean
  onToggleObjectList: () => void
  onOpenFiles: () => void
  onToggleFullscreen: () => void
  onToggleLandscapeLayout: () => void
}

interface BridgeState {
  bridge: OperationChromeBridge | null
  setBridge: (bridge: OperationChromeBridge | null) => void
}

const useOperationChromeBridge = create<BridgeState>((set) => ({
  bridge: null,
  setBridge: (bridge) => set({ bridge })
}))

export default useOperationChromeBridge
