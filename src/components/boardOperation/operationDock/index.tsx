import {
  ChangeEvent,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookText,
  BrushCleaning,
  ChevronDown,
  ChevronUp,
  Copy,
  Ellipsis,
  Expand,
  Group,
  Hand,
  ImageUp,
  Layers,
  LayoutTemplate,
  Redo2,
  Shrink,
  Trash2,
  Type,
  Undo2
} from 'lucide-react'
import { isMobile as isMobileFn } from '@/utils'
import { useTouchUi } from '@/hooks/useTouchUi'
import ExportImageMenu from '../exportImageMenu'
import { ExportScope } from '@/core/export/exportCanvasImage'
import DockButton from './DockButton'
import { readDockLegendOpen, writeDockLegendOpen } from './dockStorage'

const isMobile = isMobileFn()
const SWIPE_PX = 40
const SIDE_MQ = '(max-width: 750px)'

export interface OperationDockProps {
  hasSelection: boolean
  canGroup: boolean
  isFullscreen: boolean
  isPanMode: boolean
  duplicateDragEnabled: boolean
  showTouchTools: boolean
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onDelete: () => void
  onGroup: () => void
  onAddWidget: () => void
  onText: () => void
  onUploadImage: (e: ChangeEvent<HTMLInputElement>) => void
  onExport: (scope: ExportScope) => void
  onExportBoard: () => void
  onToggleObjectList: () => void
  onOpenFiles: () => void
  onToggleFullscreen: () => void
  onTogglePanMode: () => void
  onToggleDuplicateMode: () => void
}

const Section: FC<{
  tone?: 'default' | 'selection'
  children: ReactNode
  showLabel: boolean
  title?: string
}> = ({ tone = 'default', children, showLabel, title }) => {
  if (!children) {
    return null
  }
  return (
    <div
      className={`flex items-center gap-0.5 xs:flex-col ${
        tone === 'selection'
          ? 'rounded-xl bg-white/70 px-1 py-0.5 ring-1 ring-[#66CC8A]/35'
          : ''
      }`}
      aria-label={title}
    >
      {showLabel && tone === 'selection' && title && (
        <span className="hidden px-1 text-[9px] font-medium text-[#2d8f55] xs:block">
          {title}
        </span>
      )}
      {children}
    </div>
  )
}

const OperationDock: FC<OperationDockProps> = ({
  hasSelection,
  canGroup,
  isFullscreen,
  isPanMode,
  duplicateDragEnabled,
  showTouchTools,
  onUndo,
  onRedo,
  onCopy,
  onDelete,
  onGroup,
  onAddWidget,
  onText,
  onUploadImage,
  onExport,
  onExportBoard,
  onToggleObjectList,
  onOpenFiles,
  onToggleFullscreen,
  onTogglePanMode,
  onToggleDuplicateMode
}) => {
  const { t } = useTranslation()
  const labelOf = (key: string) => String(t(key))
  const { touchUi } = useTouchUi()
  const [legendOpen, setLegendOpen] = useState(() => readDockLegendOpen())
  const [moreOpen, setMoreOpen] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const showLabel = legendOpen

  const setLegend = useCallback((open: boolean) => {
    setLegendOpen(open)
    writeDockLegendOpen(open)
  }, [])

  const onToggleLegend = () => {
    setLegendOpen((prev) => {
      const next = !prev
      writeDockLegendOpen(next)
      return next
    })
  }

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
        if (Math.abs(dx) < Math.abs(dy)) {
          return
        }
        if (dx < -SWIPE_PX) {
          setLegend(true)
        } else if (dx > SWIPE_PX) {
          setLegend(false)
        }
        return
      }

      if (Math.abs(dy) < Math.abs(dx)) {
        return
      }
      if (dy < -SWIPE_PX) {
        setLegend(true)
      } else if (dy > SWIPE_PX) {
        setLegend(false)
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
  }, [setLegend])

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
  const showTouch = showTouchTools || touchUi

  return (
    <div className="fixed bottom-5 left-2/4 z-[12] -translate-x-2/4 xs:bottom-auto xs:right-5 xs:top-1/2 xs:translate-x-0 xs:-translate-y-1/2">
      <div
        ref={dockRef}
        className="relative flex max-w-[min(96vw,40rem)] items-center gap-0.5 rounded-2xl border border-slate-200/80 bg-[#eef1ff]/95 px-1.5 py-1 shadow-md backdrop-blur xs:max-h-[70vh] xs:max-w-[7.5rem] xs:flex-col xs:overflow-y-auto xs:noScrollbar"
      >
        <DockButton
          label={
            legendOpen
              ? labelOf('operate.collapseLegend')
              : labelOf('operate.expandLegend')
          }
          showLabel={showLabel}
          active={legendOpen}
          onClick={onToggleLegend}
          className="order-last xs:order-none"
        >
          {legendOpen ? (
            <ChevronDown strokeWidth={iconStroke} />
          ) : (
            <ChevronUp strokeWidth={iconStroke} />
          )}
        </DockButton>

        <Section tone="default" showLabel={showLabel}>
          <DockButton
            label={labelOf('operate.dock.undo')}
            showLabel={showLabel}
            onClick={onUndo}
          >
            <Undo2 strokeWidth={iconStroke} />
          </DockButton>
          <DockButton
            label={labelOf('operate.dock.redo')}
            showLabel={showLabel}
            onClick={onRedo}
          >
            <Redo2 strokeWidth={iconStroke} />
          </DockButton>
          {showTouch && (
            <DockButton
              label={labelOf('operate.dock.pan')}
              showLabel={showLabel}
              active={isPanMode}
              onClick={onTogglePanMode}
            >
              <Hand strokeWidth={iconStroke} />
            </DockButton>
          )}
        </Section>

        {showSelection && (
          <Section
            tone="selection"
            showLabel={showLabel}
            title={labelOf('operate.selectionActions')}
          >
            <DockButton
              label={labelOf('operate.dock.copy')}
              showLabel={showLabel}
              onClick={onCopy}
            >
              <Copy strokeWidth={iconStroke} />
            </DockButton>
            {canGroup && (
              <DockButton
                label={labelOf('operate.dock.group')}
                showLabel={showLabel}
                onClick={onGroup}
              >
                <Group strokeWidth={iconStroke} />
              </DockButton>
            )}
            <DockButton
              label={labelOf('operate.dock.widget')}
              showLabel={showLabel}
              onClick={onAddWidget}
            >
              <LayoutTemplate strokeWidth={iconStroke} />
            </DockButton>
            {showTouch && (
              <DockButton
                label={labelOf('operate.dock.duplicateMode')}
                showLabel={showLabel}
                active={duplicateDragEnabled}
                onClick={onToggleDuplicateMode}
              >
                <span className="relative inline-flex">
                  <Copy strokeWidth={iconStroke} size={18} />
                  <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold leading-none text-[#66CC8A]">
                    +
                  </span>
                </span>
              </DockButton>
            )}
            <DockButton
              label={labelOf('operate.dock.delete')}
              showLabel={showLabel}
              onClick={onDelete}
            >
              <Trash2 strokeWidth={iconStroke} />
            </DockButton>
          </Section>
        )}

        <Section tone="default" showLabel={showLabel}>
          <DockButton
            label={labelOf('operate.dock.text')}
            showLabel={showLabel}
            onClick={onText}
          >
            <Type strokeWidth={iconStroke} />
          </DockButton>
          <DockButton
            label={labelOf('operate.dock.image')}
            showLabel={showLabel}
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
            label={labelOf('operate.dock.save')}
          />
          <DockButton
            label={labelOf('operate.dock.layers')}
            showLabel={showLabel}
            onClick={onToggleObjectList}
          >
            <Layers strokeWidth={iconStroke} />
          </DockButton>
          <DockButton
            label={labelOf('operate.dock.boards')}
            showLabel={showLabel}
            onClick={onOpenFiles}
          >
            <BookText strokeWidth={iconStroke} />
          </DockButton>
        </Section>

        {!isMobile && (
          <div className="relative">
            <DockButton
              label={labelOf('operate.dock.more')}
              showLabel={showLabel}
              active={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <Ellipsis strokeWidth={iconStroke} />
            </DockButton>
            {moreOpen && (
              <div className="absolute bottom-full left-1/2 z-20 mb-2 min-w-[8rem] -translate-x-1/2 rounded-xl border border-slate-200 bg-[#eef1ff] p-1 shadow-lg xs:bottom-auto xs:left-auto xs:right-full xs:top-0 xs:mb-0 xs:mr-2 xs:translate-x-0">
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
  )
}

export default OperationDock
