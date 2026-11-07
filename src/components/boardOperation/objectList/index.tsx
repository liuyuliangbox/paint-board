import { FC, useEffect, useRef, useState } from 'react'
import Sortable from 'sortablejs'
import { useTranslation } from 'react-i18next'
import { Link2, Link2Off } from 'lucide-react'
import { paintBoard } from '@/core/paintBoard'
import { useTouchUi } from '@/hooks/useTouchUi'
import {
  objectListRows,
  ObjectListRow,
  ObjectListSource
} from '@/core/element/layer/objectList'
import {
  activeHasLink,
  linkActiveObjects,
  ListSelectMode,
  moveObjectInList,
  objectFromList,
  selectObjectFromList,
  toggleObjectVisible,
  unlinkActiveObjects,
  updateObjectTextFromList
} from '@/core/element/layer/objectListActions'
import ObjectItem from './objectItem'

interface IProps {
  updateShow: (show: boolean) => void
}

const readRows = (): ObjectListRow[] => {
  const canvas = paintBoard.canvas
  if (!canvas) {
    return []
  }
  return objectListRows(
    canvas.getObjects() as ObjectListSource[],
    canvas.getActiveObjects() as ObjectListSource[]
  )
}

const ObjectList: FC<IProps> = ({ updateShow }) => {
  const { t } = useTranslation()
  const { coarse } = useTouchUi()
  const sortableRef = useRef<HTMLUListElement>(null)
  const [rows, setRows] = useState<ObjectListRow[]>(readRows)
  const [anchorIndex, setAnchorIndex] = useState(0)
  const [canUnlink, setCanUnlink] = useState(false)
  const [multiSelect, setMultiSelect] = useState(false)
  const selectedCount = rows.filter((row) => row.selected).length

  useEffect(() => {
    const refresh = () => {
      setRows(readRows())
      setCanUnlink(activeHasLink())
    }
    refresh()
    paintBoard.addHookFn(refresh)
    const canvas = paintBoard.canvas
    canvas?.on('object:added', refresh)
    canvas?.on('object:removed', refresh)
    canvas?.on('object:modified', refresh)
    canvas?.on('selection:created', refresh)
    canvas?.on('selection:updated', refresh)
    canvas?.on('selection:cleared', refresh)
    return () => {
      paintBoard.removeHookFn(refresh)
      canvas?.off('object:added', refresh)
      canvas?.off('object:removed', refresh)
      canvas?.off('object:modified', refresh)
      canvas?.off('selection:created', refresh)
      canvas?.off('selection:updated', refresh)
      canvas?.off('selection:cleared', refresh)
    }
  }, [])

  useEffect(() => {
    if (!sortableRef.current) {
      return
    }
    const sortable = new Sortable(sortableRef.current, {
      animation: 150,
      ghostClass: 'opacity-50',
      chosenClass: 'scale-105',
      dragClass: 'rotate-2',
      handle: '.drag-object-list-handle',
      onEnd: (evt) => {
        if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
          moveObjectInList(evt.oldIndex, evt.newIndex)
        }
      }
    })
    return () => {
      sortable.destroy()
    }
  }, [])

  const handleSelect = (index: number, event: React.MouseEvent) => {
    const object = objectFromList(index)
    if (!object) {
      return
    }
    let mode: ListSelectMode = 'replace'
    if (event.shiftKey) {
      mode = 'range'
    } else if (event.metaKey || event.ctrlKey || (coarse && multiSelect)) {
      mode = 'toggle'
    } else {
      setAnchorIndex(index)
    }
    selectObjectFromList(object, {
      mode,
      listIndex: index,
      anchorIndex,
      expandLinks: !event.altKey
    })
    if (mode === 'range') {
      // keep existing anchor
    } else if (mode === 'replace') {
      setAnchorIndex(index)
    }
  }

  // Portrait: open from the right, clear the left ops dock (dim still masks it).
  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--pb-z-focus)]">
      <button
        type="button"
        aria-label="Close"
        className="pointer-events-auto absolute inset-0 z-0 bg-black/40"
        onClick={() => updateShow(false)}
      />
      <div className="pointer-events-none absolute inset-0 z-[1] flex items-stretch justify-end">
        <div className="pointer-events-auto pb-panel-fill flex w-96 max-w-[min(80vw,24rem)] flex-col overflow-hidden bg-white px-4 py-4 shadow-xl xs:m-0 xs:w-[var(--pb-panel-max-w-clear-left)] xs:max-w-[var(--pb-panel-max-w-clear-left)] xs:rounded-none xs:rounded-l-2xl xs:px-3 xs:py-3 landscape:w-[min(90vw,28rem)] landscape:max-w-[90vw] landscape:px-3 landscape:py-3">
          <div className="shrink-0 text-center font-fredokaOne text-xl xs:text-lg landscape:text-lg">
            {t('objectList.title')}
          </div>
          <div className="mt-2 flex shrink-0 flex-wrap items-center justify-center gap-1.5 xs:mt-1.5 xs:gap-1">
            {coarse && (
              <button
                type="button"
                className={`btn btn-sm gap-1 ${
                  multiSelect ? 'btn-primary' : 'btn-ghost'
                }`}
                aria-pressed={multiSelect}
                onClick={() => setMultiSelect((value) => !value)}
              >
                {t('objectList.multiSelect')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-ghost gap-1"
              disabled={selectedCount < 2}
              title={String(t('objectList.link'))}
              onClick={() => {
                linkActiveObjects()
              }}
            >
              <Link2 size={16} />
              {t('objectList.link')}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost gap-1"
              disabled={!canUnlink}
              title={String(t('objectList.unlink'))}
              onClick={() => {
                unlinkActiveObjects()
              }}
            >
              <Link2Off size={16} />
              {t('objectList.unlink')}
            </button>
          </div>
          <p className="mt-1.5 shrink-0 text-center text-[11px] text-slate-400 line-clamp-2 xs:mt-1 xs:line-clamp-1 landscape:line-clamp-1">
            {coarse && multiSelect
              ? t('objectList.multiSelectHint')
              : t('objectList.hint')}
          </p>
          <div className="mt-2 flex min-h-0 w-full max-w-full flex-1 flex-col rounded-2xl bg-[#eef1ff] py-1.5 xs:mt-1.5">
            <ul
              ref={sortableRef}
              className="text-base-content noScrollbar mx-2 my-1.5 min-h-0 max-w-full flex-1 flex-nowrap overflow-y-auto rounded-xl bg-white px-2 py-2"
            >
              {rows.length === 0 ? (
                <li className="px-2 py-6 text-center text-sm text-slate-400">
                  {t('objectList.empty')}
                </li>
              ) : (
                rows.map((row, index) => (
                  <ObjectItem
                    key={row.key}
                    row={row}
                    onSelect={(event) => handleSelect(index, event)}
                    onToggleVisible={() => {
                      const object = objectFromList(index)
                      if (object) {
                        toggleObjectVisible(object)
                      }
                    }}
                    onCommitText={(value) => {
                      const object = objectFromList(index)
                      if (object) {
                        updateObjectTextFromList(object, value)
                      }
                    }}
                  />
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ObjectList
