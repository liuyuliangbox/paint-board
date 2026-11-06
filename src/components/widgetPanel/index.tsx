import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronUp,
  CloudDownload,
  CloudUpload,
  Copy,
  FolderPlus,
  LayoutTemplate,
  Pencil,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react'
import useWidgetStore, {
  WIDGET_CATEGORY_ALL,
  WIDGET_DRAG_MIME,
  WIDGET_UNCATEGORIZED,
  widgetCategoryOf
} from '@/store/widgets'
import { insertWidgetObjects } from '@/core/widget/widget'
import {
  getMySyncCode,
  isValidSyncCode,
  isWidgetSyncConfigured,
  regenerateMySyncCode,
  setMySyncCode
} from '@/core/widget/widgetSync'
import Toast from '@/components/toast'

const WidgetPanel = () => {
  const { t } = useTranslation()
  const {
    widgets,
    categories,
    activeCategory,
    panelOpen,
    togglePanel,
    setActiveCategory,
    addCategory,
    removeCategory,
    renameWidget,
    setWidgetCategory,
    deleteWidget,
    getWidgetObjects,
    pushToCloud,
    pullFromCloud
  } = useWidgetStore()
  const [toast, setToast] = useState<{
    message: string
    type: 'error' | 'success'
  } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [draftCategory, setDraftCategory] = useState('')
  const [mySyncCode, setMySyncCodeState] = useState(() => getMySyncCode())
  const [targetCode, setTargetCode] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const filteredWidgets = useMemo(() => {
    if (activeCategory === WIDGET_CATEGORY_ALL) {
      return widgets
    }
    return widgets.filter(
      (widget) => widgetCategoryOf(widget) === activeCategory
    )
  }, [widgets, activeCategory])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [WIDGET_CATEGORY_ALL]: widgets.length,
      [WIDGET_UNCATEGORIZED]: 0
    }
    categories.forEach((name) => {
      counts[name] = 0
    })
    widgets.forEach((widget) => {
      const key = widgetCategoryOf(widget)
      counts[key] = (counts[key] || 0) + 1
    })
    return counts
  }, [widgets, categories])

  const resolveTargetCode = () => {
    const trimmed = targetCode.trim()
    if (!trimmed) {
      return mySyncCode
    }
    return trimmed
  }

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type })
  }

  const insertAtCenter = async (id: string) => {
    const objects = await getWidgetObjects(id)
    if (!objects?.length) {
      showToast('widget.insertFailed')
      return
    }
    const ok = await insertWidgetObjects(objects)
    if (!ok) {
      showToast('widget.insertFailed')
    }
  }

  const onDragStart = (event: React.DragEvent, id: string) => {
    event.dataTransfer.setData(WIDGET_DRAG_MIME, id)
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const submitCategory = () => {
    const ok = addCategory(draftCategory)
    if (!ok) {
      showToast('widget.categoryAddFailed')
    }
    setDraftCategory('')
    setAddingCategory(false)
  }

  const copyMyCode = async () => {
    try {
      await navigator.clipboard.writeText(mySyncCode)
      showToast('widget.syncCopied', 'success')
    } catch {
      showToast('widget.syncFailed')
    }
  }

  const onRegenerate = () => {
    if (!window.confirm(String(t('widget.syncRegenerateConfirm')))) {
      return
    }
    const next = regenerateMySyncCode()
    setMySyncCodeState(next)
  }

  const onSetAsMine = () => {
    const next = targetCode.trim()
    if (!isValidSyncCode(next)) {
      showToast('widget.syncInvalidCode')
      return
    }
    if (!window.confirm(String(t('widget.syncSetAsMineConfirm')))) {
      return
    }
    try {
      setMySyncCode(next)
      setMySyncCodeState(next)
      setTargetCode('')
    } catch {
      showToast('widget.syncInvalidCode')
    }
  }

  const runSync = async (mode: 'push' | 'pull') => {
    if (!isWidgetSyncConfigured()) {
      showToast('widget.syncNotConfigured')
      return
    }
    const code = resolveTargetCode()
    if (!isValidSyncCode(code)) {
      showToast('widget.syncInvalidCode')
      return
    }
    if (
      mode === 'pull' &&
      !window.confirm(String(t('widget.syncPullConfirm')))
    ) {
      return
    }
    setSyncBusy(true)
    try {
      if (mode === 'push') {
        await pushToCloud(code)
        showToast('widget.syncPushSuccess', 'success')
      } else {
        await pullFromCloud(code)
        showToast('widget.syncPullSuccess', 'success')
      }
    } catch {
      showToast('widget.syncFailed')
    } finally {
      setSyncBusy(false)
    }
  }

  const tabs = [
    { id: WIDGET_CATEGORY_ALL, label: t('widget.categoryAll') },
    {
      id: WIDGET_UNCATEGORIZED,
      label: t('widget.categoryUncategorized')
    },
    ...categories.map((name) => ({ id: name, label: name }))
  ]

  return (
    <>
      <div
        className={`fixed left-1/2 top-0 z-[20] -translate-x-1/2 ${
          panelOpen ? 'w-[min(96vw,56rem)]' : 'w-auto'
        }`}
      >
        <div className="overflow-hidden rounded-b-xl border border-t-0 border-slate-200 bg-[#eef1ff]/95 shadow-md backdrop-blur">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 hover:bg-white/50"
            onClick={togglePanel}
          >
            <LayoutTemplate className="h-3.5 w-3.5 text-[#66CC8A]" />
            <span>{t('widget.panelTitle')}</span>
            <span className="text-[10px] text-slate-400">{widgets.length}</span>
            {panelOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {panelOpen && (
            <div className="border-t border-slate-200/80 px-3 pb-3 pt-2">
              <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
                {tabs.map((tab) => {
                  const active = activeCategory === tab.id
                  const count = categoryCounts[tab.id] || 0
                  return (
                    <div key={tab.id} className="flex shrink-0 items-center">
                      <button
                        type="button"
                        className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                          active
                            ? 'bg-[#66CC8A] text-white'
                            : 'bg-white text-slate-600 hover:bg-slate-100'
                        }`}
                        onClick={() => setActiveCategory(tab.id)}
                      >
                        {tab.label}
                        <span className="ml-1 opacity-80">{count}</span>
                      </button>
                      {tab.id !== WIDGET_CATEGORY_ALL &&
                        tab.id !== WIDGET_UNCATEGORIZED && (
                          <button
                            type="button"
                            className="ml-0.5 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                            title={String(t('widget.deleteCategory'))}
                            onClick={() => removeCategory(tab.id)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                    </div>
                  )
                })}
                {addingCategory ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <input
                      className="w-24 rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                      value={draftCategory}
                      autoFocus
                      placeholder={String(t('widget.categoryName'))}
                      onChange={(e) => setDraftCategory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          submitCategory()
                        }
                        if (e.key === 'Escape') {
                          setAddingCategory(false)
                          setDraftCategory('')
                        }
                      }}
                      onBlur={() => {
                        if (draftCategory.trim()) {
                          submitCategory()
                          return
                        }
                        setAddingCategory(false)
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                    title={String(t('widget.addCategory'))}
                    onClick={() => setAddingCategory(true)}
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    {t('widget.addCategory')}
                  </button>
                )}
              </div>

              {widgets.length === 0 ? (
                <p className="py-3 text-center text-sm text-slate-500">
                  {t('widget.emptyHint')}
                </p>
              ) : filteredWidgets.length === 0 ? (
                <p className="py-3 text-center text-sm text-slate-500">
                  {t('widget.emptyCategory')}
                </p>
              ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {filteredWidgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="group relative flex w-28 shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm"
                      draggable={editingId !== widget.id}
                      onDragStart={(event) => onDragStart(event, widget.id)}
                    >
                      <button
                        type="button"
                        className="flex h-16 w-full items-center justify-center overflow-hidden rounded bg-slate-50"
                        title={String(t('widget.insert'))}
                        onClick={() => void insertAtCenter(widget.id)}
                      >
                        {widget.thumbnail ? (
                          <img
                            src={widget.thumbnail}
                            alt={widget.title}
                            className="max-h-full max-w-full object-contain"
                            draggable={false}
                          />
                        ) : (
                          <LayoutTemplate className="h-6 w-6 text-slate-300" />
                        )}
                      </button>
                      {editingId === widget.id ? (
                        <input
                          className="mt-1 w-full rounded border border-slate-300 px-1 text-xs"
                          value={draftTitle}
                          autoFocus
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onBlur={() => {
                            renameWidget(widget.id, draftTitle)
                            setEditingId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameWidget(widget.id, draftTitle)
                              setEditingId(null)
                            }
                            if (e.key === 'Escape') {
                              setEditingId(null)
                            }
                          }}
                        />
                      ) : (
                        <div className="mt-1 flex items-center gap-0.5">
                          <span
                            className="flex-1 truncate text-xs text-slate-600"
                            title={widget.title}
                          >
                            {widget.title}
                          </span>
                          <button
                            type="button"
                            className="rounded p-0.5 text-slate-400 opacity-0 hover:bg-slate-100 group-hover:opacity-100"
                            title={String(t('widget.rename'))}
                            onClick={() => {
                              setEditingId(widget.id)
                              setDraftTitle(widget.title)
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            className="rounded p-0.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                            title={String(t('widget.delete'))}
                            onClick={() => deleteWidget(widget.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <select
                        className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[10px] text-slate-500"
                        value={widgetCategoryOf(widget)}
                        title={String(t('widget.setCategory'))}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          setWidgetCategory(widget.id, e.target.value)
                        }
                      >
                        <option value={WIDGET_UNCATEGORIZED}>
                          {t('widget.categoryUncategorized')}
                        </option>
                        {categories.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2">
                <div className="mb-1.5 text-[11px] font-medium text-slate-600">
                  {t('widget.syncTitle')}
                </div>
                {!isWidgetSyncConfigured() && (
                  <p className="mb-1.5 text-[10px] text-amber-600">
                    {t('widget.syncNotConfigured')}
                  </p>
                )}
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">
                    {t('widget.syncMyCode')}
                  </span>
                  <code className="max-w-[14rem] truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">
                    {mySyncCode}
                  </code>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
                    onClick={() => void copyMyCode()}
                  >
                    <Copy className="h-3 w-3" />
                    {t('widget.syncCopy')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
                    onClick={onRegenerate}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t('widget.syncRegenerate')}
                  </button>
                </div>
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">
                    {t('widget.syncTargetCode')}
                  </span>
                  <input
                    className="min-w-[12rem] flex-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px]"
                    value={targetCode}
                    placeholder={String(t('widget.syncTargetPlaceholder'))}
                    onChange={(e) => setTargetCode(e.target.value)}
                    disabled={syncBusy}
                  />
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                    disabled={syncBusy || !targetCode.trim()}
                    onClick={onSetAsMine}
                  >
                    {t('widget.syncSetAsMine')}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded bg-[#66CC8A] px-2 py-1 text-[11px] text-white hover:bg-[#57b87a] disabled:opacity-50"
                    disabled={syncBusy}
                    onClick={() => void runSync('push')}
                  >
                    <CloudUpload className="h-3.5 w-3.5" />
                    {syncBusy ? t('widget.syncBusy') : t('widget.syncPush')}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={syncBusy}
                    onClick={() => void runSync('pull')}
                  >
                    <CloudDownload className="h-3.5 w-3.5" />
                    {t('widget.syncPull')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  )
}

export default WidgetPanel
