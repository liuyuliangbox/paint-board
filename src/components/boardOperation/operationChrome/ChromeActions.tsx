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
import type { OperationChromeBridge } from '@/store/operationChromeBridge'
import { isMobile as isMobileFn } from '@/utils'

const isMobile = isMobileFn()

export type ChromeActionsLayout = 'row' | 'col'

const ChromeButton: FC<{
  label: string
  showLabel: boolean
  layout: ChromeActionsLayout
  active?: boolean
  onClick: () => void
  children: ReactNode
}> = ({ label, showLabel, layout, active = false, onClick, children }) => {
  const col = layout === 'col'
  return (
    <button
      type="button"
      title={showLabel ? undefined : label}
      aria-label={label}
      aria-pressed={active || undefined}
      onClick={onClick}
      className={`flex items-center justify-center rounded-xl transition-colors ${
        col
          ? `w-full flex-col gap-0.5 px-0.5 ${showLabel ? 'py-1' : 'py-1.5'}`
          : showLabel
          ? 'h-9 gap-1 px-2'
          : 'h-9 w-9'
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
        <span
          className={
            col
              ? 'max-w-[2.75rem] text-center text-[9px] font-medium leading-tight text-slate-700 line-clamp-2'
              : 'max-w-[4.5rem] truncate text-[11px] font-medium leading-tight text-slate-700'
          }
        >
          {label}
        </span>
      )}
    </button>
  )
}

const ChromeActions: FC<{
  bridge: OperationChromeBridge
  layout?: ChromeActionsLayout
}> = ({ bridge, layout = 'row' }) => {
  const { t } = useTranslation()
  const labelOf = (key: string) => String(t(key))
  const showLabel = useUiLegendStore((s) => s.legendOpen)
  const {
    isFullscreen,
    isLandscapeLayout,
    onToggleObjectList,
    onOpenFiles,
    onToggleFullscreen,
    onToggleLandscapeLayout
  } = bridge

  return (
    <>
      {/* Desktop cannot orientation.lock — hide rather than a no-op control. */}
      {isMobile && (
        <ChromeButton
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
            <RectangleVertical strokeWidth={2} />
          ) : (
            <RectangleHorizontal strokeWidth={2} />
          )}
        </ChromeButton>
      )}
      <ChromeButton
        label={labelOf('operate.dock.layers')}
        showLabel={showLabel}
        layout={layout}
        onClick={onToggleObjectList}
      >
        <Layers strokeWidth={2} />
      </ChromeButton>
      <ChromeButton
        label={labelOf('operate.dock.boards')}
        showLabel={showLabel}
        layout={layout}
        onClick={onOpenFiles}
      >
        <BookText strokeWidth={2} />
      </ChromeButton>
      {/*
        Mobile: orientation lock already uses fullscreen under the hood.
        A separate fullscreen control often flips to landscape / “desktop site”
        chrome and is easy to trigger by mistake — hide it on phones.
      */}
      {!isMobile && (
        <ChromeButton
          label={labelOf(
            isFullscreen ? 'operate.exitFullscreen' : 'operate.fullscreen'
          )}
          showLabel={showLabel}
          layout={layout}
          active={isFullscreen}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? (
            <Shrink strokeWidth={2} />
          ) : (
            <Expand strokeWidth={2} />
          )}
        </ChromeButton>
      )}
    </>
  )
}

export default ChromeActions
