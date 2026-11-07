import { paintBoard } from '@/core/paintBoard'
import { CSSProperties, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ZoomInfoProps {
  showLabel?: boolean
  /** Portrait left rail: stack label under the dial. */
  rail?: boolean
}

const ZoomInfo = ({ showLabel = false, rail = false }: ZoomInfoProps) => {
  const { t } = useTranslation()
  const [zoomValue, setZoomValue] = useState(
    paintBoard.evnet?.zoomEvent.handleZoomPercentage(false)
  )
  useEffect(() => {
    paintBoard.evnet?.zoomEvent.setZoomHook((num: number) => {
      setZoomValue(num)
    })
  }, [setZoomValue])

  const label = String(t('operate.zoom'))

  return (
    <button
      type="button"
      className={`flex items-center rounded-full ${
        rail
          ? 'w-full flex-col gap-0.5 px-0.5 py-1'
          : `ml-2 gap-1 ${showLabel ? 'bg-white/80 pr-1.5' : ''}`
      }`}
      title={showLabel ? undefined : label}
      aria-label={label}
      onClick={() => paintBoard.evnet?.zoomEvent.resetZoom()}
    >
      <div
        className="radial-progress bg-primary text-primary-content border-4 border-primary cursor-pointer"
        style={
          {
            '--value': zoomValue,
            '--size': '1.1rem',
            '--thickness': '0.2rem'
          } as CSSProperties
        }
      ></div>
      {showLabel && (
        <span
          className={
            rail
              ? 'max-w-[2.75rem] truncate text-center text-[9px] font-medium leading-tight text-slate-700'
              : 'text-[11px] font-medium text-slate-700'
          }
        >
          {label}
        </span>
      )}
    </button>
  )
}

export default ZoomInfo
