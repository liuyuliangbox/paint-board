import { FC, useEffect, useRef } from 'react'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'
import useOperationChromeBridge from '@/store/operationChromeBridge'
import useUiLegendStore from '@/store/uiLegend'
import ChromeActions from './ChromeActions'

/**
 * Landscape: top-right horizontal chrome (long top edge).
 * Narrow portrait: chrome lives on the right long-edge rail via
 * operationChromeBridge (ops dock is on the left).
 */
export interface OperationChromeProps {
  isFullscreen: boolean
  isLandscapeLayout: boolean
  isLandscapeSession: boolean
  onToggleObjectList: () => void
  onOpenFiles: () => void
  onToggleFullscreen: () => void
  onToggleLandscapeLayout: () => void
}

const OperationChrome: FC<OperationChromeProps> = ({
  isFullscreen,
  isLandscapeLayout,
  isLandscapeSession,
  onToggleObjectList,
  onOpenFiles,
  onToggleFullscreen,
  onToggleLandscapeLayout
}) => {
  const narrowPortrait = useNarrowPortrait()
  const chromeHidden = useUiLegendStore((s) => s.chromeHidden)
  const setBridge = useOperationChromeBridge((s) => s.setBridge)
  const actionsRef = useRef({
    onToggleObjectList,
    onOpenFiles,
    onToggleFullscreen,
    onToggleLandscapeLayout
  })
  actionsRef.current = {
    onToggleObjectList,
    onOpenFiles,
    onToggleFullscreen,
    onToggleLandscapeLayout
  }

  useEffect(() => {
    setBridge({
      isFullscreen,
      isLandscapeLayout,
      isLandscapeSession,
      onToggleObjectList: () => actionsRef.current.onToggleObjectList(),
      onOpenFiles: () => actionsRef.current.onOpenFiles(),
      onToggleFullscreen: () => actionsRef.current.onToggleFullscreen(),
      onToggleLandscapeLayout: () =>
        actionsRef.current.onToggleLandscapeLayout()
    })
    return () => setBridge(null)
  }, [isFullscreen, isLandscapeLayout, isLandscapeSession, setBridge])

  // Portrait phone: right chrome rail owns these actions.
  if (narrowPortrait || chromeHidden) {
    return null
  }

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[12] hidden landscape:block">
      <div className="pointer-events-auto flex max-w-[min(92vw,28rem)] flex-wrap items-center justify-end gap-0.5 rounded-2xl border border-slate-200/80 bg-[#eef1ff]/95 p-0.5 shadow-md backdrop-blur">
        <ChromeActions
          bridge={{
            isFullscreen,
            isLandscapeLayout,
            isLandscapeSession,
            onToggleObjectList,
            onOpenFiles,
            onToggleFullscreen,
            onToggleLandscapeLayout
          }}
          layout="row"
        />
      </div>
    </div>
  )
}

export default OperationChrome
