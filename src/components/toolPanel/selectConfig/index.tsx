import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { paintBoard } from '@/core/paintBoard'
import { ELEMENT_CUSTOM_TYPE } from '@/constants'
import useBoardStore from '@/store/board'
import { useTouchUi } from '@/hooks/useTouchUi'

import { Info } from 'lucide-react'
import LayerConfig from './layerConfig'
import OpacityConfig from './opacityConfig'
import EraserConfig from './eraserConfig'
import LockConfig from './lockConfig'
import ImageFilterConfig from './imageFilterConfig'
import FontStyleConfig from './fontStyleConfig'
import SelectFontFamilyConfig from './selectFontFamilyConfig'
import TextColorConfig from './textColorConfig'
import ObjectColorConfig from './objectColorConfig'
import LineStyleConfig from './lineStyleConfig'
import OutlineStrokeConfig from './outlineStrokeConfig'

const SelectConfig = () => {
  const { t } = useTranslation()
  const { coarse } = useTouchUi()
  const isTouchMultiSelect = useBoardStore((s) => s.isTouchMultiSelect)
  const toggleTouchMultiSelect = useBoardStore((s) => s.toggleTouchMultiSelect)
  const [refreshCount, setRefresh] = useState(0) // refresh data

  useEffect(() => {
    const refresh = () => setRefresh((v) => v + 1)
    paintBoard.addHookFn(refresh)
    return () => {
      paintBoard.removeHookFn(refresh)
    }
  }, [setRefresh])

  const activeObject = paintBoard.canvas?.getActiveObject()

  const multiSelectToggle = coarse ? (
    <div className="mt-2 flex flex-col gap-1">
      <button
        type="button"
        className={`btn btn-sm gap-1 ${
          isTouchMultiSelect ? 'btn-primary' : 'btn-neutral'
        }`}
        aria-pressed={isTouchMultiSelect}
        onClick={() => toggleTouchMultiSelect()}
      >
        {t('objectList.multiSelect')}
      </button>
      <span className="text-[11px] leading-snug text-slate-500">
        {isTouchMultiSelect
          ? t('objectList.multiSelectHint')
          : t('objectList.multiSelectCanvasHint')}
      </span>
    </div>
  ) : null

  if (!activeObject) {
    return (
      <div className="mt-3 flex w-56 flex-col gap-2">
        {multiSelectToggle}
        <div className="flex">
          <Info size={16} className="mr-1 shrink-0" />
          <span className="text-sm">{t('tip.unselectedElementTip')}</span>
        </div>
      </div>
    )
  }

  return (
    // `contents` lets each block flow into landscape multi-columns.
    <div className="form-control landscape:contents">
      {multiSelectToggle}
      <OpacityConfig refreshCount={refreshCount} />

      <EraserConfig refreshCount={refreshCount} />

      <LockConfig refreshCount={refreshCount} />

      <LayerConfig />

      {activeObject?._customType === ELEMENT_CUSTOM_TYPE.IMAGE && (
        <ImageFilterConfig />
      )}

      <TextColorConfig refreshCount={refreshCount} />

      <ObjectColorConfig refreshCount={refreshCount} kind="draw" />

      <OutlineStrokeConfig refreshCount={refreshCount} />

      <ObjectColorConfig refreshCount={refreshCount} kind="shape" />

      <LineStyleConfig refreshCount={refreshCount} />

      {activeObject?._customType === ELEMENT_CUSTOM_TYPE.I_TEXT && (
        <FontStyleConfig refreshCount={refreshCount} />
      )}
      {[ELEMENT_CUSTOM_TYPE.DRAW_TEXT, ELEMENT_CUSTOM_TYPE.I_TEXT].includes(
        activeObject?._customType as string
      ) && <SelectFontFamilyConfig refreshCount={refreshCount} />}
    </div>
  )
}

export default SelectConfig
