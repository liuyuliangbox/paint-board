import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayoutTemplate, Link2, Link2Off, Loader2 } from 'lucide-react'
import useWidgetMenuStore from '@/store/widgetMenu'
import useWidgetStore, { MAX_WIDGET_COUNT } from '@/store/widgets'
import useBoardStore from '@/store/board'
import { ActionMode } from '@/constants'
import { paintBoard } from '@/core/paintBoard'
import {
  linkActiveObjects,
  unlinkActiveObjects
} from '@/core/element/layer/objectListActions'
import { getLinkMenuState } from '@/core/element/layer/linkMenuState'
import Toast from '@/components/toast'

const WidgetContextMenu = () => {
  const { t } = useTranslation()
  const { open, x, y, closeMenu } = useWidgetMenuStore()
  const addWidgetFromSelection = useWidgetStore(
    (state) => state.addWidgetFromSelection
  )
  const widgetCount = useWidgetStore((state) => state.widgets.length)
  const setPanelOpen = useWidgetStore((state) => state.setPanelOpen)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeObjects = open ? paintBoard.canvas?.getActiveObjects() || [] : []
  const linkState = useMemo(
    () => getLinkMenuState(activeObjects),
    [open, activeObjects.length]
  )

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return
      }
      closeMenu()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.code === 'Escape') {
        closeMenu()
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open, closeMenu])

  if (!open) {
    return toast ? <Toast message={toast} type="error" /> : null
  }

  const left = Math.min(x, window.innerWidth - 200)
  const top = Math.min(y, window.innerHeight - 160)

  const onAdd = async () => {
    if (busy) {
      return
    }
    if (widgetCount >= MAX_WIDGET_COUNT) {
      setToast('widget.limitReached')
      closeMenu()
      return
    }
    const count = paintBoard.canvas?.getActiveObjects().length ?? 0
    if (!count) {
      setToast('tip.unselectedElementTip')
      closeMenu()
      return
    }
    setBusy(true)
    try {
      useBoardStore.getState().updateMode(ActionMode.SELECT)
      const ok = await addWidgetFromSelection()
      if (ok) {
        setPanelOpen(true)
      } else {
        setToast('widget.addFailed')
      }
    } finally {
      setBusy(false)
      closeMenu()
    }
  }

  const onLink = () => {
    linkActiveObjects()
    closeMenu()
  }

  const onUnlink = () => {
    unlinkActiveObjects()
    closeMenu()
  }

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-[10000] min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        style={{ left, top }}
      >
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          onClick={() => void onAdd()}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LayoutTemplate className="h-4 w-4 text-[#66CC8A]" />
          )}
          {t('widget.addToWidgets')}
        </button>
        {linkState.canLink && (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            onClick={onLink}
          >
            <Link2 className="h-4 w-4 text-[#66CC8A]" />
            {t(linkState.linkLabelKey)}
          </button>
        )}
        {linkState.canUnlink && (
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            onClick={onUnlink}
          >
            <Link2Off className="h-4 w-4 text-[#66CC8A]" />
            {t(linkState.unlinkLabelKey)}
          </button>
        )}
      </div>
      {toast && <Toast message={toast} type="error" />}
    </>
  )
}

export default WidgetContextMenu
