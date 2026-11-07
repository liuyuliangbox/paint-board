import { ChangeEvent, FC, ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookText,
  BrushCleaning,
  Copy,
  Ellipsis,
  Expand,
  Group,
  Hand,
  ImageUp,
  Layers,
  LayoutTemplate,
  Link2,
  RectangleHorizontal,
  RectangleVertical,
  Redo2,
  Shrink,
  Trash2,
  Type,
  Undo2
} from 'lucide-react'
import { isMobile as isMobileFn } from '@/utils'
import ExportImageMenu from '../exportImageMenu'
import { ExportScope } from '@/core/export/exportCanvasImage'
import useUiLegendStore from '@/store/uiLegend'
import useUiOverlayStore from '@/store/uiOverlay'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'
import { useTouchUi } from '@/hooks/useTouchUi'
import DockButton from './DockButton'

const isMobile = isMobileFn()
const SWIPE_PX = 40

export interface OperationDockProps {
  hasSelection: boolean
  canGroup: boolean
  canLink: boolean
  isFullscreen: boolean
  isPanMode: boolean
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onDelete: () => void
  onGroup: () => void
  onLink: () => void
  onAddWidget: () => void
  onText: () => void
  onUploadImage: (e: ChangeEvent<HTMLInputElement>) => void
  onExport: (scope: ExportScope) => void
  onExportBoard: () => void
  onToggleObjectList: () => void
  onOpenFiles: () => void
  onToggleFullscreen: () => void
  onTogglePanMode: () => void
  /** Viewport currently landscape (after rotate / orientation.lock). */
  isLandscapeLayout: boolean
  onToggleLandscapeLayout: () => void
}

const Section: FC<{
  tone?: 'default' | 'selection'
  children: ReactNode
  title?: string
  /** Portrait long-edge rail (not width-only xs). */
  rail?: boolean
}> = ({ tone = 'default', children, title, rail = false }) => {
  if (!children) {
    return null
  }
  return (
    <div
      className={`flex items-center ${rail ? 'w-full flex-col' : ''} ${
        tone === 'selection'
          ? 'gap-0.5 rounded-xl bg-white/70 px-1 py-0.5 ring-1 ring-[#66CC8A]/35'
          : 'gap-0.5'
      }`}
      aria-label={title}
    >
      {children}
    </div>
  )
}

const OperationDock: FC<OperationDockProps> = ({
  hasSelection,
  canGroup,
  canLink,
  isFullscreen,
  isPanMode,
  onUndo,
  onRedo,
  onCopy,
  onDelete,
  onGroup,
  onLink,
  onAddWidget,
  onText,
  onUploadImage,
  onExport,
  onExportBoard,
  onToggleObjectList,
  onOpenFiles,
  onToggleFullscreen,
  onTogglePanMode,
  isLandscapeLayout,
  onToggleLandscapeLayout
}) => {
  const { t } = useTranslation()
  const labelOf = (key: string) => String(t(key))
  // Left vertical rail only in narrow portrait; ≤750 landscape stays a bottom bar.
  const railLayout = useNarrowPortrait()
  const narrowPortrait = railLayout
  const overlayActive = useUiOverlayStore((s) => s.active)
  const layout = railLayout ? 'rail' : 'bar'
  const legendOpen = useUiLegendStore((s) => s.legendOpen)
  const setLegendOpen = useUiLegendStore((s) => s.setLegendOpen)
  const chromeHidden = useUiLegendStore((s) => s.chromeHidden)
  const { coarse } = useTouchUi()
  const [moreOpen, setMoreOpen] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const showLabel = legendOpen
  // Touch only: sticky single-finger pan. Desktop: space / Ctrl-drag / keys.
  const showPanButton = coarse || isMobile

  useEffect(() => {
    const el = dockRef.current
    if (!el) {
      return
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return
      }
      swipeStart.current = { x: event.clientX, y: event.clientY }
    }

    const onPointerUp = (event: PointerEvent) => {
      const start = swipeStart.current
      swipeStart.current = null
      if (!start) {
        return
      }
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.hypot(dx, dy) < SWIPE_PX) {
        return
      }

      if (railLayout) {
        // Phone vertical rail: swipe left = open legend, right = collapse.
        if (Math.abs(dx) < Math.abs(dy)) {
          return
        }
        if (dx < -SWIPE_PX) {
          setLegendOpen(true)
        } else if (dx > SWIPE_PX) {
          setLegendOpen(false)
        }
        return
      }

      // Bottom bar (desktop / phone landscape): swipe up = open, down = collapse.
      if (Math.abs(dy) < Math.abs(dx)) {
        return
      }
      if (dy < -SWIPE_PX) {
        setLegendOpen(true)
      } else if (dy > SWIPE_PX) {
        setLegendOpen(false)
      }
    }

    const onPointerCancel = () => {
      swipeStart.current = null
    }
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [railLayout, setLegendOpen])

  useEffect(() => {
    if (!moreOpen) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const root = dockRef.current
      if (root?.contains(event.target as Node)) {
        return
      }
      setMoreOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [moreOpen])

  const iconStroke = 2
  const showSelection = hasSelection
  // Landscape bar or phone portrait rail: chrome lives top-right — dock is draw-only.
  const chromeOutsideDock = isLandscapeLayout || railLayout
  // Keep the dock visible when a panel is open, but drop under the focused dim.
  const underPanelDim = narrowPortrait && overlayActive !== 'none'

  if (chromeHidden) {
    return null
  }

  return (
    <div
      className={`pointer-events-none fixed ${
        underPanelDim ? 'z-[5]' : 'z-[var(--pb-z-dock)]'
      } ${
        railLayout
          ? 'left-1.5 top-1/2 max-w-none -translate-y-1/2 translate-x-0'
          : 'bottom-3 left-1/2 w-auto max-w-[min(96vw,44rem)] -translate-x-1/2 landscape:max-w-[min(calc(96vw-7.5rem),44rem)]'
      }`}
    >
      <div
        ref={dockRef}
        className={`pointer-events-auto relative flex max-w-full items-stretch overflow-hidden rounded-2xl border border-slate-200/80 bg-[#eef1ff]/95 shadow-md backdrop-blur ${
          railLayout
            ? `max-h-[85vh] w-auto flex-col ${
                legendOpen
                  ? 'w-16 gap-0.5 px-0.5 py-1'
                  : 'w-11 gap-0.5 px-0.5 py-0.5'
              }`
            : `max-h-[30vh] w-auto ${
                legendOpen ? 'gap-1 px-1 py-1' : 'gap-0.5 px-0.5 py-0.5'
              }`
        }`}
      >
        {/* Desktop cannot orientation.lock — phone/tablet only. */}
        {!chromeOutsideDock && isMobile && (
          <div
            className={`flex shrink-0 items-center gap-0.5 ${
              railLayout
                ? `flex-col border-b border-slate-200/80 px-0.5 ${
                    legendOpen ? 'pb-1' : 'pb-0.5'
                  }`
                : `border-r border-slate-200/80 ${
                    legendOpen ? 'pr-1' : 'pr-0.5'
                  }`
            }`}
          >
            <DockButton
              label={
                isLandscapeLayout
                  ? labelOf('operate.dock.portrait')
                  : labelOf('operate.dock.landscape')
              }
              showLabel={showLabel}
              layout={layout}
              active={isLandscapeLayout}
              onClick={onToggleLandscapeLayout}
            >
              {isLandscapeLayout ? (
                <RectangleVertical strokeWidth={iconStroke} />
              ) : (
                <RectangleHorizontal strokeWidth={iconStroke} />
              )}
            </DockButton>
          </div>
        )}

        <div
          className={`flex min-h-0 min-w-0 items-center gap-0.5 noScrollbar ${
            railLayout
              ? 'w-full flex-1 flex-col overflow-x-hidden overflow-y-auto'
              : 'w-auto overflow-x-auto'
          }`}
        >
          {showPanButton && (
            <Section
              rail={railLayout}
              tone="default"
              title={labelOf('operate.dock.pan')}
            >
              <DockButton
                label={labelOf('operate.dock.pan')}
                showLabel={showLabel}
                layout={layout}
                active={isPanMode}
                onClick={onTogglePanMode}
              >
                <Hand strokeWidth={iconStroke} />
              </DockButton>
            </Section>
          )}

          <Section rail={railLayout} tone="default">
            <DockButton
              label={labelOf('operate.dock.undo')}
              showLabel={showLabel}
              layout={layout}
              onClick={onUndo}
            >
              <Undo2 strokeWidth={iconStroke} />
            </DockButton>
            <DockButton
              label={labelOf('operate.dock.redo')}
              showLabel={showLabel}
              layout={layout}
              onClick={onRedo}
            >
              <Redo2 strokeWidth={iconStroke} />
            </DockButton>
          </Section>

          {showSelection && (
            <Section
              rail={railLayout}
              tone="selection"
              title={labelOf('operate.selectionActions')}
            >
              <DockButton
                label={labelOf('operate.dock.copy')}
                showLabel={showLabel}
                layout={layout}
                onClick={onCopy}
              >
                <Copy strokeWidth={iconStroke} />
              </DockButton>
              {canGroup && (
                <DockButton
                  label={labelOf('operate.dock.group')}
                  showLabel={showLabel}
                  layout={layout}
                  onClick={onGroup}
                >
                  <Group strokeWidth={iconStroke} />
                </DockButton>
              )}
              {canLink && (
                <DockButton
                  label={labelOf('operate.dock.link')}
                  showLabel={showLabel}
                  layout={layout}
                  onClick={onLink}
                >
                  <Link2 strokeWidth={iconStroke} />
                </DockButton>
              )}
              <DockButton
                label={labelOf('operate.dock.widget')}
                showLabel={showLabel}
                layout={layout}
                onClick={onAddWidget}
              >
                <LayoutTemplate strokeWidth={iconStroke} />
              </DockButton>
              <DockButton
                label={labelOf('operate.dock.delete')}
                showLabel={showLabel}
                layout={layout}
                onClick={onDelete}
              >
                <Trash2 strokeWidth={iconStroke} />
              </DockButton>
            </Section>
          )}

          <Section rail={railLayout} tone="default">
            <DockButton
              label={labelOf('operate.dock.text')}
              showLabel={showLabel}
              layout={layout}
              onClick={onText}
            >
              <Type strokeWidth={iconStroke} />
            </DockButton>
            <DockButton
              label={labelOf('operate.dock.image')}
              showLabel={showLabel}
              layout={layout}
              as="label"
              htmlFor="image-upload-dock"
            >
              <ImageUp strokeWidth={iconStroke} />
            </DockButton>
            <input
              type="file"
              id="image-upload-dock"
              accept=".jpeg, .jpg, .png"
              className="hidden"
              onChange={onUploadImage}
            />
            <DockButton
              label={labelOf('operate.dock.clean')}
              showLabel={showLabel}
              layout={layout}
              as="label"
              htmlFor="clean-modal"
            >
              <BrushCleaning strokeWidth={iconStroke} />
            </DockButton>
            <ExportImageMenu
              hasSelection={hasSelection}
              onExport={onExport}
              onExportBoard={onExportBoard}
              showLabel={showLabel}
              layout={layout}
              label={labelOf('operate.dock.save')}
            />
            {!chromeOutsideDock && (
              <>
                <DockButton
                  label={labelOf('operate.dock.layers')}
                  showLabel={showLabel}
                  layout={layout}
                  onClick={onToggleObjectList}
                >
                  <Layers strokeWidth={iconStroke} />
                </DockButton>
                <DockButton
                  label={labelOf('operate.dock.boards')}
                  showLabel={showLabel}
                  layout={layout}
                  onClick={onOpenFiles}
                >
                  <BookText strokeWidth={iconStroke} />
                </DockButton>
              </>
            )}
          </Section>

          {!isMobile && !chromeOutsideDock && (
            <div className={`relative ${railLayout ? 'w-full' : ''}`}>
              <DockButton
                label={labelOf('operate.dock.more')}
                showLabel={showLabel}
                layout={layout}
                active={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <Ellipsis strokeWidth={iconStroke} />
              </DockButton>
              {moreOpen && (
                <div
                  className={
                    layout === 'rail'
                      ? 'absolute right-full top-0 z-20 mr-2 min-w-[8rem] rounded-xl border border-slate-200 bg-[#eef1ff] p-1 shadow-lg'
                      : 'absolute bottom-full left-1/2 z-20 mb-2 min-w-[8rem] -translate-x-1/2 rounded-xl border border-slate-200 bg-[#eef1ff] p-1 shadow-lg'
                  }
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-200"
                    onClick={() => {
                      setMoreOpen(false)
                      onToggleFullscreen()
                    }}
                  >
                    {isFullscreen ? (
                      <Shrink size={16} className="text-[#66CC8A]" />
                    ) : (
                      <Expand size={16} className="text-[#66CC8A]" />
                    )}
                    {t(
                      isFullscreen
                        ? 'operate.exitFullscreen'
                        : 'operate.fullscreen'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OperationDock
