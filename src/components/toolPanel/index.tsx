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
import LanguageSwitch from '@/components/languageSwitch'
import ZoomInfo from '@/components/zoomInfo'
import CameraConfig from '@/components/cameraConfig'
import InfoIcon from '@/components/icons/info.svg?react'
import ChromeActions from '@/components/boardOperation/operationChrome/ChromeActions'
import useOperationChromeBridge from '@/store/operationChromeBridge'

const ToolPanel: FC = () => {
  const { t } = useTranslation()
  const { mode, updateMode } = useBoardStore()
  const { landscape } = useLandscapeLayout()
  const narrowPortrait = useNarrowPortrait()
  const showLabel = useUiLegendStore((s) => s.legendOpen)
  const overlayActive = useUiOverlayStore((s) => s.active)
  const setWidgetPanelOpen = useWidgetStore((s) => s.setPanelOpen)
  const chromeBridge = useOperationChromeBridge((s) => s.bridge)
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

  // Entering landscape: collapse so the short canvas is usable; user can reopen.
  useEffect(() => {
    if (landscape && !wasLandscape.current) {
      setToolsOpen(false)
    }
    wasLandscape.current = landscape
  }, [landscape])

  // Portrait mutex: another overlay claimed → close tools.
  useEffect(() => {
    if (!shouldMutexOverlays()) {
      return
    }
    if (overlayActive !== 'tools' && overlayActive !== 'none' && showPanel) {
      setShowPanel(false)
    }
  }, [overlayActive, showPanel])

  // Close when interacting with the canvas (blank / draw), same as widget panel.
  useEffect(() => {
    if (!showPanel) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const root = panelRef.current
      if (root?.contains(event.target as Node)) {
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

  const toolsToggle = (
    <div
      className={`flex items-center gap-1 ${
        showPanel && !landscape && !narrowPortrait
          ? 'absolute -left-3 -top-3 z-10'
          : 'relative'
      } ${narrowPortrait ? 'flex-col' : ''}`}
    >
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
      {showLabel && !narrowPortrait && (
        <span className="rounded-full bg-[#eef1ff]/95 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
          {toolsLabel}
        </span>
      )}
      {showLabel && narrowPortrait && (
        <span className="max-w-[2.75rem] text-center text-[9px] font-medium leading-tight text-slate-700">
          {toolsLabel}
        </span>
      )}
    </div>
  )

  const panelCard = showPanel && (
    <div
      className={`pb-panel-shell pb-panel-open flex flex-col overflow-hidden bg-[#eef1ff] p-3 card shadow-xl ${
        narrowPortrait
          ? 'absolute left-full top-0 z-[10] ml-1 w-[var(--pb-panel-max-w-from-left)] max-w-[var(--pb-panel-max-w-from-left)] p-2'
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

  // Narrow portrait: left long-edge rail — chrome + tools + help cluster.
  if (narrowPortrait) {
    return (
      <div
        ref={panelRef}
        className="pointer-events-none fixed left-1.5 top-1/2 z-[13] flex max-h-[min(78vh,36rem)] -translate-y-1/2 flex-col"
      >
        <div className="pointer-events-auto relative flex max-h-full flex-col items-center gap-0.5 overflow-y-auto noScrollbar rounded-2xl border border-slate-200/80 bg-[#eef1ff]/95 px-1 py-1.5 shadow-md backdrop-blur">
          {chromeBridge && (
            <>
              <ChromeActions bridge={chromeBridge} layout="col" />
              <div className="my-0.5 h-px w-6 shrink-0 bg-slate-200/80" />
            </>
          )}
          {toolsToggle}
          <div className="my-0.5 h-px w-6 shrink-0 bg-slate-200/80" />
          <LanguageSwitch rail />
          <button
            type="button"
            className="flex w-full flex-col items-center gap-0.5 rounded-full bg-white px-0.5 py-1 hover:opacity-70"
            title={showLabel ? undefined : String(t('operate.help'))}
            aria-label={String(t('operate.help'))}
            onClick={() => {
              ;(
                document.getElementById('help-modal') as HTMLDialogElement
              ).showModal()
            }}
          >
            <InfoIcon className="h-7 w-7 shrink-0 rounded-full" />
            <span className="max-w-[2.75rem] truncate text-center text-[9px] font-medium leading-tight text-slate-700">
              {t('operate.help')}
            </span>
          </button>
          <ZoomInfo showLabel={showLabel} rail />
          <CameraConfig showLabel={showLabel} rail />
          {panelCard}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      className="fixed left-7 top-7 z-[3] landscape:left-3 landscape:top-3"
    >
      <div className={showPanel && !landscape ? '' : 'mb-1'}>{toolsToggle}</div>
      {panelCard}
    </div>
  )
}

export default ToolPanel
