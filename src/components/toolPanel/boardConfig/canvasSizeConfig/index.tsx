import { RectangleHorizontal, RectangleVertical } from 'lucide-react'
import useFileStore, { useCurrentFile } from '@/store/files'
import { useTranslation } from 'react-i18next'
import {
  canvasSizeForOrientation,
  isCanvasLandscape
} from '@/utils/canvasOrientation'

const CanvasSizeConfig = () => {
  const { updateCanvasWidth, updateCanvasHeight, updateCanvasSize } =
    useFileStore()
  const currentFile = useCurrentFile()
  if (!currentFile) {
    return null
  }
  const { t } = useTranslation()
  const landscape = isCanvasLandscape(
    currentFile.canvasWidth,
    currentFile.canvasHeight
  )

  const toggleOrientation = () => {
    const next = canvasSizeForOrientation(!landscape)
    updateCanvasSize(next.width, next.height)
  }

  return (
    <div className="form-control mt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold font-fredokaOne text-sm">
          {t('title.canvasSize')}
        </div>
        <button
          type="button"
          className="btn btn-xs btn-ghost gap-1 text-primary"
          onClick={toggleOrientation}
          aria-label={
            landscape
              ? t('canvasSize.switchToPortrait') || undefined
              : t('canvasSize.switchToLandscape') || undefined
          }
        >
          {landscape ? (
            <RectangleVertical size={14} strokeWidth={2} />
          ) : (
            <RectangleHorizontal size={14} strokeWidth={2} />
          )}
          {landscape
            ? t('canvasSize.switchToPortrait')
            : t('canvasSize.switchToLandscape')}
        </button>
      </div>
      <div className="mt-1 flex items-center w-full">
        <div className="text-sm font-fredokaOne w-12 mr-2 shrink-0">
          {t('canvasSize.width')}
        </div>
        <div className="text-sm font-fredokaOne mr-2 text-primary-focus w-9 shrink-0">
          {(currentFile.canvasWidth * 100).toFixed(0) + '%'}
        </div>
        <input
          className="range range-primary range-xs"
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={String(currentFile.canvasWidth)}
          onChange={(e) => {
            updateCanvasWidth(Number(e.target.value))
          }}
        />
      </div>
      <div className="mt-1 flex items-center w-full">
        <div className="text-sm font-fredokaOne w-12 mr-2 shrink-0">
          {t('canvasSize.height')}
        </div>
        <div className="text-sm font-fredokaOne mr-2 text-primary-focus w-9 shrink-0">
          {(currentFile.canvasHeight * 100).toFixed(0) + '%'}
        </div>
        <input
          className="range range-primary range-xs"
          type="range"
          min="0.1"
          max="1"
          step="0.01"
          value={String(currentFile.canvasHeight)}
          onChange={(e) => {
            updateCanvasHeight(Number(e.target.value))
          }}
        />
      </div>
    </div>
  )
}

export default CanvasSizeConfig
