import { useState, useEffect, useRef, FC } from 'react'
import { useTranslation } from 'react-i18next'
import useBoardStore from '@/store/board'
import { ActionMode } from '@/constants'
import { paintBoard } from '@/core/paintBoard'
import { useLandscapeLayout } from '@/hooks/useLandscapeLayout'
import { isViewportLandscape } from '@/utils/screenOrientation'
import { modeSwitch } from './constant'

import { X, Menu } from 'lucide-react'
import DrawConfig from './drawConfig'
import EraserConfig from './eraserConfig'
import SelectConfig from './selectConfig'
import BoardConfig from './boardConfig'

const ToolPanel: FC = () => {
  const { t } = useTranslation()
  const { mode, updateMode } = useBoardStore()
  const { landscape } = useLandscapeLayout()
  // Landscape starts collapsed so the short canvas opens clear; user can reopen.
  const [showPanel, setShowPanel] = useState(() => !isViewportLandscape())
  const panelRef = useRef<HTMLDivElement>(null)
  const wasLandscape = useRef(landscape)

  // Entering landscape: collapse so the short canvas is usable; user can reopen.
  useEffect(() => {
    if (landscape && !wasLandscape.current) {
      setShowPanel(false)
    }
    wasLandscape.current = landscape
  }, [landscape])

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
        setShowPanel(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true)
  }, [showPanel])

  return (
    <div
      ref={panelRef}
      className="fixed left-7 top-7 z-[3] landscape:left-3 landscape:top-3"
    >
      {/* Toggle stays outside the open panel so overflow never clips it. */}
      <label
        className={`btn btn-neutral btn-circle swap swap-rotate h-7 w-7 min-h-0 ${
          showPanel ? 'absolute -left-3 -top-3 z-10' : 'relative'
        }`}
      >
        <input
          type="checkbox"
          checked={!showPanel}
          onChange={() => setShowPanel((v) => !v)}
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
      {showPanel && (
        <div
          className={`pb-panel-shell pb-panel-open flex max-w-[85%] flex-col overflow-hidden bg-[#eef1ff] p-3 card shadow-xl landscape:max-w-[min(48vw,22rem)] landscape:p-2`}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto noScrollbar p-0.5">
            {/* switch mode tabs */}
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
            {mode === ActionMode.DRAW && <DrawConfig />}
            {mode === ActionMode.ERASE && <EraserConfig />}
            {mode === ActionMode.SELECT && <SelectConfig />}
            {mode === ActionMode.Board && <BoardConfig />}
          </div>
        </div>
      )}
    </div>
  )
}

export default ToolPanel
