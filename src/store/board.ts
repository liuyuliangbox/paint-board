import { fabric } from 'fabric'
import { ActionMode } from '@/constants'
import { DrawType } from '@/constants/draw'
import { paintBoard } from '@/core/paintBoard'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { alignGuideLine } from '@/core/fabricMixin/alignGuideLine'
import { getInitLanguage } from '@/i18n/utils'
import { syncDocumentLanguage } from '@/i18n/documentLang'

interface BoardState {
  mode: string // operating mode
  drawType: string // draw type
  language: string // i18n language 'zh' 'en'
  isObjectCaching: boolean // fabric objectCaching
  openGuideLine: boolean // does the guide line show
  /** Touch hand tool: single-finger pan (independent of ActionMode.Board). */
  isPanMode: boolean
  /** Touch duplicate-while-drag (desktop still uses Ctrl/Cmd+drag). */
  duplicateDragEnabled: boolean
}

interface BoardAction {
  updateMode: (mode: string) => void
  updateDrawType: (drawType: string) => void
  updateLanguage: (language: string) => void
  updateCacheState: () => void
  updateOpenGuideLine: () => void
  setPanMode: (enabled: boolean) => void
  togglePanMode: () => void
  setDuplicateDragEnabled: (enabled: boolean) => void
  toggleDuplicateDragEnabled: () => void
}

const initLanguage = getInitLanguage()

const useBoardStore = create<BoardState & BoardAction>()(
  persist(
    (set, get) => ({
      mode: ActionMode.DRAW,
      drawType: DrawType.FreeStyle,
      language: initLanguage,
      isObjectCaching: true,
      openGuideLine: false,
      isPanMode: false,
      duplicateDragEnabled: false,
      updateMode: (mode) => {
        const oldMode = get().mode
        if (oldMode !== mode) {
          // Switching tool modes clears temporary touch pan / dup-drag toggles.
          set({
            mode,
            isPanMode: false,
            duplicateDragEnabled: false
          })
          paintBoard.handleMode(mode)
        }
      },
      updateDrawType: (drawType) => {
        const oldDrawType = get().drawType
        if (oldDrawType !== drawType) {
          set({
            drawType
          })
          paintBoard.handleMode()
        }
      },
      updateLanguage(language) {
        set({
          language
        })
        syncDocumentLanguage(language)
      },
      updateCacheState() {
        const oldCacheState = get().isObjectCaching
        set({
          isObjectCaching: !oldCacheState
        })
        fabric.Object.prototype.set({
          objectCaching: useBoardStore.getState().isObjectCaching
        })
        paintBoard?.canvas?.renderAll()
      },
      updateOpenGuideLine() {
        const newOpenGuideLine = !get().openGuideLine
        set({
          openGuideLine: newOpenGuideLine
        })
        alignGuideLine.updateOpenState(newOpenGuideLine)
      },
      setPanMode(enabled) {
        set({
          isPanMode: enabled,
          ...(enabled ? { duplicateDragEnabled: false } : {})
        })
        if (enabled) {
          paintBoard.syncPanModeCursor()
        } else {
          paintBoard.handleMode()
        }
      },
      togglePanMode() {
        get().setPanMode(!get().isPanMode)
      },
      setDuplicateDragEnabled(enabled) {
        set({
          duplicateDragEnabled: enabled,
          ...(enabled ? { isPanMode: false } : {})
        })
        if (!enabled) {
          paintBoard.handleMode()
        } else {
          paintBoard.syncPanModeCursor()
        }
      },
      toggleDuplicateDragEnabled() {
        get().setDuplicateDragEnabled(!get().duplicateDragEnabled)
      }
    }),
    {
      name: 'PAINT-BOARD-STORE',
      partialize: (state) => ({
        mode: state.mode,
        drawType: state.drawType,
        language: state.language,
        isObjectCaching: state.isObjectCaching,
        openGuideLine: state.openGuideLine
      })
    }
  )
)
export default useBoardStore
