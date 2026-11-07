import { useState, useEffect, useRef, FC } from 'react'
import { useTranslation } from 'react-i18next'
import useBoardStore from '@/store/board'
import useUiOverlayStore, { shouldMutexOverlays } from '@/store/uiOverlay'
import useWidgetStore from '@/store/widgets'
import { ActionMode } from '@/constants'
import { paintBoard } from '@/core/paintBoard'
import { useLandscapeLayout } from '@/hooks/useLandscapeLayout'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'
import { isViewportLandscape } from '@/utils/screenOrientation'
import useUiLegendStore from '@/store/uiLegend'
import { modeSwitch } from './constant'

import { X, Menu } from 'lucide-react'
import DrawConfig from './drawConfig'
import EraserConfig from './eraserConfig'
import SelectConfig from './selectConfig'
import BoardConfig from './boardConfig'

/**
 * Top-left draw toggle (same control every viewport) + config card.
 * Narrow portrait: tools open from the left (ops dock side), clear the right
 * chrome rail; dim masks rails. Icon + mode tabs share one row.
 */
const ToolPanel: FC = () => {
  const { t } = useTranslation()
  const { mode, updateMode } = useBoardStore()
  const { landscape } = useLandscapeLayout()
  const narrowPortrait = useNarrowPortrait()
  const overlayActive = useUiOverlayStore((s) => s.active)
  const showLabel = useUiLegendStore((s) => s.legendOpen)
  const setWidgetPanelOpen = useWidgetStore((s) => s.setPanelOpen)
  const [showPanel, setShowPanel] = useState(() => !isViewportLandscape())
  const panelRef = useRef<HTMLDivElement>(null)
  const wasLandscape = useRef(landscape)
  const drawLabel = String(t('operate.tools'))

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

  // Keep overlay store in sync when the panel starts open (portrait default).
  useEffect(() => {
    if (!isViewportLandscape()) {
      useUiOverlayStore.getState().open('tools')
    }
  }, [])

  useEffect(() => {
    if (!shouldMutexOverlays()) {
      return
    }
    if (overlayActive !== 'tools' && overlayActive !== 'none' && showPanel) {
      setShowPanel(false)
    }
  }, [overlayActive, showPanel])

  useEffect(() => {
    if (!showPanel || narrowPortrait) {
      // Portrait uses the explicit dim strip for close.
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const root = panelRef.current
      if (root?.contains(event.target as Node)) {
        return
      }
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
  }, [showPanel, narrowPortrait])

  const toggle = (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <label
        className="btn btn-neutral btn-circle swap swap-rotate h-7 w-7 min-h-0"
        title={showLabel ? undefined : drawLabel}
        aria-label={drawLabel}
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
        <span className="max-w-[2.75rem] text-center text-[10px] font-medium leading-tight text-slate-700">
          {drawLabel}
        </span>
      )}
    </div>
  )

  const modeTabs = (
    <div className="tabs tabs-sm tabs-boxed min-w-0 flex-1 bg-[#333C4D]">
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
  )

  const panelBody = (
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
  )

  // Narrow portrait: focused tools panel is topmost. Closed draw toggle only
  // shows when nothing else is focused, so it never covers widgets/layers/boards.
  if (narrowPortrait) {
    return (
      <>
        {!showPanel && overlayActive === 'none' && (
          <div className="pointer-events-auto fixed left-3 top-3 z-[var(--pb-z-chrome)]">
            {toggle}
          </div>
        )}
        {showPanel && (
          <div className="pointer-events-none fixed inset-0 z-[var(--pb-z-focus)]">
            <button
              type="button"
              aria-label="Close"
              className="pointer-events-auto absolute inset-0 z-0 bg-black/40"
              onClick={() => setToolsOpen(false)}
            />
            <div
              className="pointer-events-auto absolute inset-y-0 left-0 z-[1]"
              style={{ width: 'var(--pb-panel-max-w-clear-right)' }}
            >
              <div
                ref={panelRef}
                className="pb-panel-shell pb-panel-open flex h-full max-h-full w-full flex-col overflow-hidden rounded-none rounded-r-2xl bg-[#eef1ff] px-2 pb-2 pt-2 card shadow-xl"
              >
                <div className="flex shrink-0 items-center gap-2">
                  {toggle}
                  {modeTabs}
                </div>
                {panelBody}
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Desktop / landscape: no full dim (canvas stays drawable). Open panel uses
  // focus z so it sits above dock/chrome; click canvas still closes.
  return (
    <>
      {!showPanel && (
        <div className="pointer-events-auto fixed left-7 top-7 z-[var(--pb-z-chrome)] landscape:left-3 landscape:top-3">
          {toggle}
        </div>
      )}
      {showPanel && (
        <div className="pointer-events-none fixed inset-0 z-[var(--pb-z-focus)]">
          <div className="pointer-events-auto absolute left-7 top-7 landscape:left-3 landscape:top-3">
            <div
              className={
                !landscape ? 'absolute -left-3 -top-3 z-10' : 'relative mb-1'
              }
            >
              {toggle}
            </div>
            <div
              ref={panelRef}
              className="pb-panel-shell pb-panel-open flex flex-col overflow-hidden bg-[#eef1ff] p-3 card shadow-xl max-w-[min(85%,calc(100vw-5.5rem))] landscape:max-w-[min(78vw,38rem)] landscape:p-2"
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
              {panelBody}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ToolPanel
