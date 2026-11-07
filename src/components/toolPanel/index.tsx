import { useState, useEffect, useRef, FC } from 'react'
import { useTranslation } from 'react-i18next'
import useBoardStore from '@/store/board'
import useUiLegendStore from '@/store/uiLegend'
import useUiOverlayStore, { shouldMutexOverlays } from '@/store/uiOverlay'
import useWidgetStore from '@/store/widgets'
import { ActionMode } from '@/constants'
import { paintBoard } from '@/core/paintBoard'
import { useLandscapeLayout } from '@/hooks/useLandscapeLayout'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'
import { isViewportLandscape } from '@/utils/screenOrientation'
import { modeSwitch } from './constant'

import { X, Menu } from 'lucide-react'
import DrawConfig from './drawConfig'
import EraserConfig from './eraserConfig'
import SelectConfig from './selectConfig'
import BoardConfig from './boardConfig'

/**
 * Every viewport: top-left expand/collapse control.
 * Narrow portrait: open card sits between left chrome rail and right dock
 * so the right dock stays visible and usable.
 */
const ToolPanel: FC = () => {
  const { t } = useTranslation()
  const { mode, updateMode } = useBoardStore()
  const { landscape } = useLandscapeLayout()
  const narrowPortrait = useNarrowPortrait()
  const showLabel = useUiLegendStore((s) => s.legendOpen)
  const overlayActive = useUiOverlayStore((s) => s.active)
  const setWidgetPanelOpen = useWidgetStore((s) => s.setPanelOpen)
  // Landscape starts collapsed so the short canvas opens clear; user can reopen.
  const [showPanel, setShowPanel] = useState(() => !isViewportLandscape())
  const panelRef = useRef<HTMLDivElement>(null)
  const wasLandscape = useRef(landscape)
  const toolsLabel = String(t('operate.tools'))

  const setToolsOpen = (open: boolean) => {
    setShowPanel(open)
    if (open) {
      useUiOverlayStore.getState().open('tools')
      if (shouldMutexOverlays()) {
        setWidgetPanelOpen(false)
      }
    } else {
      useUiOverlayStore.getState().close('tools')
    }
  }

  useEffect(() => {
    if (landscape && !wasLandscape.current) {
      setToolsOpen(false)
    }
    wasLandscape.current = landscape
  }, [landscape])

  useEffect(() => {
    if (!shouldMutexOverlays()) {
      return
    }
    if (overlayActive !== 'tools' && overlayActive !== 'none' && showPanel) {
      setShowPanel(false)
    }
  }, [overlayActive, showPanel])

  useEffect(() => {
    if (!showPanel) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const root = panelRef.current
      if (root?.contains(event.target as Node)) {
        return
      }
      // Ignore the top-left toggle itself.
      if ((event.target as Element | null)?.closest?.('label.swap')) {
        return
      }
      const canvas = paintBoard.canvas
      if (!canvas) {
        return
      }
      const lower = canvas.getElement()
      const upper = (canvas as unknown as { upperCanvasEl?: HTMLElement })
        .upperCanvasEl
      const target = event.target
      if (
        target === lower ||
        target === upper ||
        (lower && lower.contains(target as Node)) ||
        (upper && upper.contains(target as Node))
      ) {
        setToolsOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true)
  }, [showPanel])

  const toggle = (
    <div className="flex items-center gap-1">
      <label
        className="btn btn-neutral btn-circle swap swap-rotate h-7 w-7 min-h-0"
        title={showLabel ? undefined : toolsLabel}
        aria-label={toolsLabel}
      >
        <input
          type="checkbox"
          checked={!showPanel}
          onChange={() => setToolsOpen(!showPanel)}
        />
        <Menu
          strokeWidth={2.5}
          color="#fff"
          size={20}
          className="swap-on fill-current"
        />
        <X
          strokeWidth={2.5}
          color="#fff"
          size={20}
          className="swap-off fill-current"
        />
      </label>
      {showLabel && (
        <span className="rounded-full bg-[#eef1ff]/95 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
          {toolsLabel}
        </span>
      )}
    </div>
  )

  const panelBody = showPanel && (
    <div
      ref={panelRef}
      className={`pb-panel-shell pb-panel-open flex flex-col overflow-hidden bg-[#eef1ff] p-3 card shadow-xl ${
        narrowPortrait
          ? 'w-[var(--pb-panel-max-w-from-left)] max-w-[var(--pb-panel-max-w-from-left)] p-2'
          : 'max-w-[min(85%,calc(100vw-5.5rem))] landscape:max-w-[min(78vw,38rem)] landscape:p-2'
      }`}
    >
      <div className="tabs tabs-sm tabs-boxed shrink-0 bg-[#333C4D]">
        {modeSwitch.map(({ type, text, keyboard }) => (
          <a
            key={type}
            className={`tab flex-grow font-fredokaOne text-white font-medium ${
              mode === type ? 'tab-active' : 'hover:text-base-300'
            }`}
            onClick={() => {
              updateMode(type)
            }}
          >
            {t(text)}
            <span className="ml-1 text-xs leading-none font-normal opacity-70 pt-1 font-sans xs:hidden">
              {keyboard}
            </span>
          </a>
        ))}
      </div>
      <div
        className={`mt-1 min-h-0 flex-1 p-0.5 ${
          landscape
            ? 'pb-panel-flow-cols'
            : 'flex flex-col overflow-y-auto noScrollbar'
        }`}
      >
        {mode === ActionMode.DRAW && <DrawConfig />}
        {mode === ActionMode.ERASE && <EraserConfig />}
        {mode === ActionMode.SELECT && <SelectConfig />}
        {mode === ActionMode.Board && <BoardConfig />}
      </div>
    </div>
  )

  // Narrow portrait: toggle stays true top-left; panel between long-edge rails.
  if (narrowPortrait) {
    return (
      <>
        <div className="pointer-events-auto fixed left-3 top-3 z-[14]">
          {toggle}
        </div>
        {showPanel && (
          <div className="pointer-events-none fixed left-[var(--pb-rail-left)] top-3 z-[3]">
            <div className="pointer-events-auto">{panelBody}</div>
          </div>
        )}
      </>
    )
  }

  return (
    <div
      ref={!showPanel ? panelRef : undefined}
      className="fixed left-7 top-7 z-[3] landscape:left-3 landscape:top-3"
    >
      <div
        className={
          showPanel && !landscape
            ? 'absolute -left-3 -top-3 z-10'
            : 'relative mb-1'
        }
      >
        {toggle}
      </div>
      {panelBody}
    </div>
  )
}

export default ToolPanel
