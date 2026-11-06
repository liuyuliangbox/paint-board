import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Hand, Trash2 } from 'lucide-react'
import { paintBoard } from '@/core/paintBoard'
import useBoardStore from '@/store/board'
import { ActionMode } from '@/constants'
import { useTouchUi } from '@/hooks/useTouchUi'

/**
 * Thumb-friendly strip for touch: pan hand tool, duplicate-while-drag, copy, delete.
 */
const SelectionTouchBar = () => {
  const { t } = useTranslation()
  const { touchUi } = useTouchUi()
  const {
    mode,
    isPanMode,
    duplicateDragEnabled,
    togglePanMode,
    toggleDuplicateDragEnabled
  } = useBoardStore()
  const [hasSelection, setHasSelection] = useState(false)

  useEffect(() => {
    const refresh = () => {
      setHasSelection((paintBoard.canvas?.getActiveObjects().length ?? 0) > 0)
    }
    paintBoard.addHookFn(refresh)
    refresh()
    return () => {
      paintBoard.removeHookFn(refresh)
    }
  }, [])

  if (!touchUi) {
    return null
  }

  const inSelect = mode === ActionMode.SELECT || mode === ActionMode.Board

  return (
    <div className="pointer-events-auto fixed bottom-[4.75rem] left-1/2 z-[15] flex -translate-x-1/2 items-center gap-1 rounded-full border border-slate-200 bg-[#eef1ff]/95 px-2 py-1.5 shadow-md backdrop-blur xs:bottom-auto xs:right-16 xs:top-1/2 xs:left-auto xs:translate-x-0 xs:-translate-y-1/2 xs:flex-col">
      <button
        type="button"
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          isPanMode
            ? 'bg-[#66CC8A] text-white'
            : 'text-slate-600 hover:bg-white'
        }`}
        aria-label={t('touchUi.panMode') || undefined}
        aria-pressed={isPanMode}
        onClick={() => togglePanMode()}
      >
        <Hand size={20} strokeWidth={2} />
      </button>
      {inSelect && hasSelection && (
        <>
          <button
            type="button"
            className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
              duplicateDragEnabled
                ? 'bg-[#66CC8A] text-white'
                : 'text-slate-600 hover:bg-white'
            }`}
            aria-label={t('touchUi.duplicateMode') || undefined}
            aria-pressed={duplicateDragEnabled}
            onClick={() => toggleDuplicateDragEnabled()}
          >
            <Copy size={18} strokeWidth={2} />
            <span className="absolute bottom-1 right-1 text-[10px] font-bold leading-none">
              +
            </span>
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-white"
            aria-label={t('operate.copy') || undefined}
            onClick={() => paintBoard.copyObject()}
          >
            <Copy size={20} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-white"
            aria-label={t('operate.delete') || undefined}
            onClick={() => paintBoard.deleteObject()}
          >
            <Trash2 size={20} strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  )
}

export default SelectionTouchBar
