import { create } from 'zustand'

/** Handlers + state for chrome buttons (shared by landscape bar / portrait left rail). */
export type OperationChromeBridge = {
  isFullscreen: boolean
  isLandscapeLayout: boolean
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
