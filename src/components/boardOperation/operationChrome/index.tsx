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
  active?: boolean
  onClick: () => void
  children: ReactNode
}> = ({ label, active = false, onClick, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active || undefined}
    onClick={onClick}
    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
      active
        ? 'bg-[#66CC8A]/25 text-[#2d8f55]'
        : 'text-slate-700 hover:bg-slate-200/80'
    }`}
  >
    <span className="flex h-5 w-5 items-center justify-center text-[#66CC8A] [&>svg]:h-[18px] [&>svg]:w-[18px]">
      {children}
    </span>
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

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[12] hidden landscape:block">
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-slate-200/80 bg-[#eef1ff]/95 p-0.5 shadow-md backdrop-blur">
        <ChromeButton
          label={
            isLandscapeLayout
              ? labelOf('operate.dock.portrait')
              : labelOf('operate.dock.landscape')
          }
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
          onClick={onToggleObjectList}
        >
          <Layers strokeWidth={2} />
        </ChromeButton>
        <ChromeButton
          label={labelOf('operate.dock.boards')}
          onClick={onOpenFiles}
        >
          <BookText strokeWidth={2} />
        </ChromeButton>
        <ChromeButton
          label={labelOf(
            isFullscreen ? 'operate.exitFullscreen' : 'operate.fullscreen'
          )}
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
