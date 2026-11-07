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
  MousePointer2,
  RectangleHorizontal,
  RectangleVertical,
  Redo2,
  Shrink,
  Trash2,
  Type,
  Undo2
} from 'lucide-react'
import { isMobile as isMobileFn } from '@/utils'
import { ActionMode } from '@/constants'
import ExportImageMenu from '../exportImageMenu'
import { ExportScope } from '@/core/export/exportCanvasImage'
import useUiLegendStore from '@/store/uiLegend'
import useUiOverlayStore from '@/store/uiOverlay'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'
import DockButton from './DockButton'

const isMobile = isMobileFn()
const SWIPE_PX = 40
const SIDE_MQ = '(max-width: 750px)'

export interface OperationDockProps {
  hasSelection: boolean
  canGroup: boolean
  canLink: boolean
  isFullscreen: boolean
  isPanMode: boolean
  /** Current tool mode (draw / select / …). */
  mode: string
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
  onSelectMode: () => void
  /** Viewport currently landscape (after rotate / orientation.lock). */
  isLandscapeLayout: boolean
  onToggleLandscapeLayout: () => void
}

const Section: FC<{
  tone?: 'default' | 'selection' | 'toggle'
  children: ReactNode
  title?: string
}> = ({ tone = 'default', children, title }) => {
  if (!children) {
    return null
  }
  return (
    <div
      role={tone === 'toggle' ? 'group' : undefined}
      className={`flex items-center xs:w-full xs:flex-col ${
        tone === 'selection'
          ? 'gap-0.5 rounded-xl bg-white/70 px-1 py-0.5 ring-1 ring-[#66CC8A]/35'
          : tone === 'toggle'
          ? // Segmented pan/select: shared shell, tight gap so they read as one control.
            'gap-0 overflow-hidden rounded-xl bg-slate-200/70 p-0.5 ring-1 ring-slate-300/80'
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
  mode,
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
  onSelectMode,
  isLandscapeLayout,
  onToggleLandscapeLayout
}) => {
  const { t } = useTranslation()
  const labelOf = (key: string) => String(t(key))
  const narrowPortrait = useNarrowPortrait()
  const overlayActive = useUiOverlayStore((s) => s.active)
  // Match Tailwind `xs` (max 750px) so rail layout tracks the vertical dock.
  const [railLayout, setRailLayout] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(SIDE_MQ).matches
  )
  const layout = railLayout ? 'rail' : 'bar'
  const legendOpen = useUiLegendStore((s) => s.legendOpen)
  const setLegendOpen = useUiLegendStore((s) => s.setLegendOpen)
  const [moreOpen, setMoreOpen] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const showLabel = legendOpen

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return
    }
    const mq = window.matchMedia(SIDE_MQ)
    const sync = () => setRailLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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
      const sideLayout =
        typeof window.matchMedia === 'function' &&
        window.matchMedia(SIDE_MQ).matches

      if (sideLayout) {
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

      // Desktop bottom bar: swipe up = open, down = collapse.
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
  }, [setLegendOpen])

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

  return (
    <div
      className={`pointer-events-none fixed ${
        underPanelDim ? 'z-[5]' : 'z-[var(--pb-z-dock)]'
      } ${
        // Phone portrait: left ops rail. Landscape / desktop: bottom bar.
        'bottom-3 left-1/2 w-auto max-w-[min(96vw,44rem)] -translate-x-1/2 landscape:max-w-[min(calc(96vw-7.5rem),44rem)] xs:bottom-auto xs:left-1.5 xs:right-auto xs:top-1/2 xs:max-w-none xs:translate-x-0 xs:-translate-y-1/2'
      }`}
    >
      <div
        ref={dockRef}
        className={`pointer-events-auto relative flex w-auto max-w-full items-stretch overflow-hidden rounded-2xl border border-slate-200/80 bg-[#eef1ff]/95 shadow-md backdrop-blur max-h-[30vh] xs:max-h-[85vh] xs:flex-col ${
          legendOpen
            ? 'gap-1 px-1 py-1 xs:w-16 xs:gap-0.5 xs:px-0.5'
            : 'gap-0.5 px-0.5 py-0.5 xs:w-11 xs:gap-0.5 xs:px-0.5'
        }`}
      >
        {/* Desktop cannot orientation.lock — phone/tablet only. */}
        {!chromeOutsideDock && isMobile && (
          <div
            className={`flex shrink-0 items-center gap-0.5 border-r border-slate-200/80 xs:flex-col xs:border-r-0 xs:border-b xs:px-0.5 xs:pr-0 ${
              legendOpen ? 'pr-1 xs:pb-1' : 'pr-0.5 xs:pb-0.5'
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

        <div className="flex min-h-0 w-auto min-w-0 items-center gap-0.5 overflow-x-auto noScrollbar xs:w-full xs:flex-1 xs:flex-col xs:overflow-x-hidden xs:overflow-y-auto">
          {/* Pan / Select as one segmented switch, left of undo/redo. */}
          <Section tone="toggle" title={labelOf('operate.dock.pointerTools')}>
            <DockButton
              label={labelOf('operate.dock.pan')}
              showLabel={showLabel}
              layout={layout}
              active={isPanMode}
              onClick={onTogglePanMode}
              className={
                layout === 'rail' ? 'rounded-md' : 'rounded-md rounded-r-none'
              }
            >
              <Hand strokeWidth={iconStroke} />
            </DockButton>
            <DockButton
              label={labelOf('operate.dock.select')}
              showLabel={showLabel}
              layout={layout}
              active={mode === ActionMode.SELECT && !isPanMode}
              onClick={onSelectMode}
              className={
                layout === 'rail'
                  ? 'rounded-md border-t border-slate-300/70'
                  : 'rounded-md rounded-l-none border-l border-slate-300/70'
              }
            >
              <MousePointer2 strokeWidth={iconStroke} />
            </DockButton>
          </Section>

          <Section tone="default">
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

          <Section tone="default">
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
            <div className="relative xs:w-full">
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
