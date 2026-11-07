import { FC, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookText,
  Expand,
  Layers,
  RectangleHorizontal,
  RectangleVertical,
  Shrink
} from 'lucide-react'
import useUiLegendStore from '@/store/uiLegend'

/**
 * Landscape / wide layout: workspace chrome at top-right so the bottom dock
 * can stay short (draw + selection only) without horizontal scrolling.
 */
export interface OperationChromeProps {
  isFullscreen: boolean
  isLandscapeLayout: boolean
  onToggleObjectList: () => void
  onOpenFiles: () => void
  onToggleFullscreen: () => void
  onToggleLandscapeLayout: () => void
}

const ChromeButton: FC<{
  label: string
  showLabel: boolean
  active?: boolean
  onClick: () => void
  children: ReactNode
}> = ({ label, showLabel, active = false, onClick, children }) => (
  <button
    type="button"
    title={showLabel ? undefined : label}
    aria-label={label}
    aria-pressed={active || undefined}
    onClick={onClick}
    className={`flex items-center justify-center rounded-xl transition-colors ${
      showLabel ? 'h-9 gap-1 px-2' : 'h-9 w-9'
    } ${
      active
        ? 'bg-[#66CC8A]/25 text-[#2d8f55]'
        : 'text-slate-700 hover:bg-slate-200/80'
    }`}
  >
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#66CC8A] [&>svg]:h-[18px] [&>svg]:w-[18px]">
      {children}
    </span>
    {showLabel && (
      <span className="max-w-[4.5rem] truncate text-[11px] font-medium leading-tight text-slate-700">
        {label}
      </span>
    )}
  </button>
)

const OperationChrome: FC<OperationChromeProps> = ({
  isFullscreen,
  isLandscapeLayout,
  onToggleObjectList,
  onOpenFiles,
  onToggleFullscreen,
  onToggleLandscapeLayout
}) => {
  const { t } = useTranslation()
  const labelOf = (key: string) => String(t(key))
  const showLabel = useUiLegendStore((s) => s.legendOpen)

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[12] hidden landscape:block">
      <div className="pointer-events-auto flex max-w-[min(92vw,28rem)] flex-wrap items-center justify-end gap-0.5 rounded-2xl border border-slate-200/80 bg-[#eef1ff]/95 p-0.5 shadow-md backdrop-blur">
        <ChromeButton
          label={
            isLandscapeLayout
              ? labelOf('operate.dock.portrait')
              : labelOf('operate.dock.landscape')
          }
          showLabel={showLabel}
          active={isLandscapeLayout}
          onClick={onToggleLandscapeLayout}
        >
          {isLandscapeLayout ? (
            <RectangleVertical strokeWidth={2} />
          ) : (
            <RectangleHorizontal strokeWidth={2} />
          )}
        </ChromeButton>
        <ChromeButton
          label={labelOf('operate.dock.layers')}
          showLabel={showLabel}
          onClick={onToggleObjectList}
        >
          <Layers strokeWidth={2} />
        </ChromeButton>
        <ChromeButton
          label={labelOf('operate.dock.boards')}
          showLabel={showLabel}
          onClick={onOpenFiles}
        >
          <BookText strokeWidth={2} />
        </ChromeButton>
        <ChromeButton
          label={labelOf(
            isFullscreen ? 'operate.exitFullscreen' : 'operate.fullscreen'
          )}
          showLabel={showLabel}
          active={isFullscreen}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? (
            <Shrink strokeWidth={2} />
          ) : (
            <Expand strokeWidth={2} />
          )}
        </ChromeButton>
      </div>
    </div>
  )
}

export default OperationChrome
