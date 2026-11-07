import { useEffect, useMemo, useRef, useState } from 'react'
import { paintBoard } from '@/core/paintBoard'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronUp,
  CloudDownload,
  CloudUpload,
  Copy,
  FolderPlus,
  LayoutTemplate,
  LogIn,
  Pencil,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react'
import useWidgetStore, {
  MAX_WIDGET_COUNT,
  WIDGET_CATEGORY_ALL,
  WIDGET_DRAG_MIME,
  WIDGET_UNCATEGORIZED,
  widgetCategoryOf
} from '@/store/widgets'
import useUiOverlayStore, { shouldMutexOverlays } from '@/store/uiOverlay'
import { insertWidgetObjects } from '@/core/widget/widget'
import {
  getMySyncCode,
  isValidSyncCode,
  isWidgetSyncConfigured,
  listCloudWidgets,
  regenerateMySyncCode,
  setMySyncCode,
  type CloudWidgetMeta
} from '@/core/widget/widgetSync'
import { isCloudLoggedIn, subscribeCloudAuth } from '@/core/auth/cloudAuth'
import Toast from '@/components/toast'
import CloudLoginModal from '@/components/cloudAuth/CloudLoginModal'
import { useTouchUi } from '@/hooks/useTouchUi'

type SyncTab = 'local' | 'cloud'

const WidgetPanel = () => {
  const { t } = useTranslation()
  const {
    widgets,
    categories,
    activeCategory,
    panelOpen,
    setPanelOpen,
    setActiveCategory,
    addCategory,
    removeCategory,
    renameWidget,
    setWidgetCategory,
    deleteWidget,
    getWidgetObjects,
    uploadWidgetsToCloud,
    downloadWidgetsFromCloud,
    deleteWidgetsFromCloud
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
  const [showLogin, setShowLogin] = useState(false)
  const [loggedIn, setLoggedIn] = useState(() => isCloudLoggedIn())
  const [syncTab, setSyncTab] = useState<SyncTab>('local')
  /** Checkbox batch selection (drives select-all / cloud actions). */
  const [selected, setSelected] = useState<Set<string>>(new Set())
  /** Single-click focus (green ring + 当前); independent of checkboxes. */
  const [focusedId, setFocusedId] = useState('')
  const [cloudMetas, setCloudMetas] = useState<CloudWidgetMeta[]>([])
  const [cloudLoadedCode, setCloudLoadedCode] = useState('')
  const panelRef = useRef<HTMLDivElement>(null)
  /** Only fire regenerate if pointerdown also started on that button. */
  const regenerateArmedRef = useRef(false)
  const { coarse, narrow } = useTouchUi()
  const overlayActive = useUiOverlayStore((s) => s.active)

  useEffect(() => subscribeCloudAuth(() => setLoggedIn(isCloudLoggedIn())), [])

  const setWidgetsOpen = (open: boolean) => {
    setPanelOpen(open)
    if (open) {
      useUiOverlayStore.getState().open('widgets')
    } else {
      useUiOverlayStore.getState().close('widgets')
    }
  }

  useEffect(() => {
    if (!shouldMutexOverlays()) {
      return
    }
    if (overlayActive !== 'widgets' && overlayActive !== 'none' && panelOpen) {
      setPanelOpen(false)
    }
  }, [overlayActive, panelOpen, setPanelOpen])

  // Canvas interaction must not hit panel controls (click-through / release-over-button).
  useEffect(() => {
    if (!panelOpen) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const root = panelRef.current
      if (root?.contains(event.target as Node)) {
        return
      }
      const canvas = paintBoard.canvas
      if (!canvas) {
        return
      }
      const lower = canvas.getElement()
      const upper = (canvas as unknown as { upperCanvasEl?: HTMLElement })
        .upperCanvasEl
      const target = event.target
      if (
        target === lower ||
        target === upper ||
        (lower && lower.contains(target as Node)) ||
        (upper && upper.contains(target as Node))
      ) {
        setWidgetsOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true)
  }, [panelOpen, setPanelOpen])

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

  const resolvedCloudCode = targetCode.trim() || mySyncCode
  const isOwnCloudSpace =
    Boolean(cloudLoadedCode) && cloudLoadedCode === mySyncCode
  const activeIds =
    syncTab === 'local'
      ? filteredWidgets.map((widget) => widget.id)
      : cloudMetas.map((meta) => meta.id)
  const allSelected =
    activeIds.length > 0 && activeIds.every((id) => selected.has(id))

  useEffect(() => {
    setSelected((current) => {
      const alive = new Set(activeIds)
      let changed = false
      const next = new Set<string>()
      current.forEach((id) => {
        if (alive.has(id)) {
          next.add(id)
        } else {
          changed = true
        }
      })
      return changed ? next : current
    })
    if (focusedId && !activeIds.includes(focusedId)) {
      setFocusedId('')
    }
  }, [syncTab, filteredWidgets, cloudMetas, focusedId, activeIds])

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type })
  }

  const ensureCloudAuth = () => {
    if (!isWidgetSyncConfigured()) {
      showToast('widget.syncNotConfigured')
      return false
    }
    if (!isCloudLoggedIn()) {
      setShowLogin(true)
      showToast('cloudAuth.loginRequired')
      return false
    }
    return true
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

  const toggleSelected = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(activeIds))
  }

  const switchSyncTab = (next: SyncTab) => {
    setSyncTab(next)
    setSelected(new Set())
    setFocusedId('')
  }

  const focusWidget = (id: string) => {
    setFocusedId(id)
  }

  const widgetFrameClass = (id: string) => {
    if (focusedId === id) {
      return 'border-[#66CC8A] ring-2 ring-[#66CC8A]'
    }
    if (selected.has(id)) {
      return 'border-[#66CC8A]/60 ring-1 ring-[#66CC8A]/40'
    }
    return 'border-slate-200'
  }

  const loadCloud = async () => {
    if (!ensureCloudAuth()) {
      return
    }
    if (!isValidSyncCode(resolvedCloudCode)) {
      showToast('widget.syncInvalidCode')
      return
    }
    setSyncBusy(true)
    try {
      const result = await listCloudWidgets(resolvedCloudCode)
      setCloudMetas(result.metas)
      setCloudLoadedCode(resolvedCloudCode)
      setSelected(new Set())
      showToast('widget.syncLoadSuccess', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'unauthorized') {
        setShowLogin(true)
        showToast('cloudAuth.loginRequired')
      } else {
        showToast('widget.syncFailed')
      }
    } finally {
      setSyncBusy(false)
    }
  }

  const uploadSelected = async () => {
    if (!ensureCloudAuth() || selected.size === 0) {
      return
    }
    setSyncBusy(true)
    try {
      await uploadWidgetsToCloud([...selected])
      showToast('widget.syncUploadSuccess', 'success')
      if (cloudLoadedCode === mySyncCode) {
        const result = await listCloudWidgets(mySyncCode)
        setCloudMetas(result.metas)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'unauthorized') {
        setShowLogin(true)
        showToast('cloudAuth.loginRequired')
      } else {
        showToast('widget.syncFailed')
      }
    } finally {
      setSyncBusy(false)
    }
  }

  const downloadSelected = async () => {
    if (!ensureCloudAuth() || !cloudLoadedCode || selected.size === 0) {
      return
    }
    setSyncBusy(true)
    try {
      const metas = cloudMetas.filter((meta) => selected.has(meta.id))
      const count = await downloadWidgetsFromCloud(
        cloudLoadedCode,
        [...selected],
        metas
      )
      if (count < selected.size) {
        showToast('widget.limitReached')
      } else {
        showToast('widget.syncDownloadSuccess', 'success')
      }
      setSelected(new Set())
      setSyncTab('local')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'unauthorized') {
        setShowLogin(true)
        showToast('cloudAuth.loginRequired')
      } else {
        showToast('widget.syncFailed')
      }
    } finally {
      setSyncBusy(false)
    }
  }

  const deleteSelectedCloud = async () => {
    if (!ensureCloudAuth() || !isOwnCloudSpace || selected.size === 0) {
      return
    }
    if (
      !window.confirm(
        String(t('widget.syncDeleteConfirm', { count: selected.size }))
      )
    ) {
      return
    }
    setSyncBusy(true)
    try {
      await deleteWidgetsFromCloud([...selected])
      const result = await listCloudWidgets(mySyncCode)
      setCloudMetas(result.metas)
      setSelected(new Set())
      showToast('widget.syncDeleteSuccess', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'unauthorized') {
        setShowLogin(true)
        showToast('cloudAuth.loginRequired')
      } else {
        showToast('widget.syncFailed')
      }
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
      {panelOpen && (
        <button
          type="button"
          aria-label="Close"
          className="pointer-events-auto fixed inset-0 z-[var(--pb-z-focus)] bg-black/40"
          onClick={() => setWidgetsOpen(false)}
        />
      )}
      <div
        ref={panelRef}
        className={`pointer-events-none fixed left-1/2 top-0 -translate-x-1/2 ${
          panelOpen
            ? 'z-[var(--pb-z-focus-panel)] w-[min(96vw,56rem)]'
            : 'z-[var(--pb-z-chrome)] w-auto'
        }`}
      >
        <div
          className={`pointer-events-auto overflow-hidden rounded-b-xl border border-t-0 border-slate-200 bg-[#eef1ff]/95 shadow-md backdrop-blur ${
            panelOpen && narrow ? 'max-h-[min(45vh,22rem)]' : ''
          }`}
        >
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-white/50"
            onClick={() => {
              const next = !panelOpen
              setWidgetsOpen(next)
            }}
          >
            <LayoutTemplate className="h-3.5 w-3.5 text-[#66CC8A]" />
            <span>{t('widget.panelTitle')}</span>
            <span className="text-[10px] text-slate-400">
              {widgets.length}/{MAX_WIDGET_COUNT}
            </span>
            {panelOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {panelOpen && (
            <div
              className={`border-t border-slate-200/80 px-3 pb-3 pt-2 ${
                narrow ? 'max-h-[min(40vh,20rem)] overflow-y-auto' : ''
              }`}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <button
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    syncTab === 'local'
                      ? 'bg-[#66CC8A] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => switchSyncTab('local')}
                >
                  {t('widget.tabLocal')}
                </button>
                <button
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    syncTab === 'cloud'
                      ? 'bg-[#66CC8A] text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => switchSyncTab('cloud')}
                >
                  {t('widget.tabCloud')}
                </button>
                <div className="ml-auto flex items-center gap-1">
                  {!loggedIn && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
                      onClick={() => setShowLogin(true)}
                    >
                      <LogIn className="h-3 w-3" />
                      {t('cloudAuth.login')}
                    </button>
                  )}
                </div>
              </div>

              {syncTab === 'local' ? (
                <>
                  <div className="mb-2 flex items-center gap-1 overflow-x-auto pb-1">
                    {tabs.map((tab) => {
                      const active = activeCategory === tab.id
                      const count = categoryCounts[tab.id] || 0
                      return (
                        <div
                          key={tab.id}
                          className="flex shrink-0 items-center"
                        >
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

                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <label className="flex items-center gap-1 text-[10px] text-slate-500">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={allSelected}
                        disabled={!filteredWidgets.length}
                        onChange={toggleAll}
                      />
                      {allSelected
                        ? t('widget.clearSelection')
                        : t('widget.selectAll')}
                    </label>
                    {selected.size > 0 && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded bg-[#66CC8A] px-2 py-1 text-[11px] text-white hover:bg-[#57b87a] disabled:opacity-50"
                        disabled={syncBusy}
                        onClick={() => void uploadSelected()}
                      >
                        <CloudUpload className="h-3.5 w-3.5" />
                        {syncBusy
                          ? t('widget.syncBusy')
                          : t('widget.syncUpload')}
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
                      {filteredWidgets.map((widget) => {
                        const checked = selected.has(widget.id)
                        const focused = focusedId === widget.id
                        return (
                          <div
                            key={widget.id}
                            className={`group relative flex w-28 shrink-0 flex-col rounded-lg border bg-white p-1.5 shadow-sm ${widgetFrameClass(
                              widget.id
                            )}`}
                            draggable={editingId !== widget.id}
                            onDragStart={(event) =>
                              onDragStart(event, widget.id)
                            }
                          >
                            <div className="absolute left-1 top-1 z-[1]">
                              <input
                                type="checkbox"
                                className={`checkbox checkbox-xs bg-white ${
                                  coarse || checked ? '' : 'opacity-70'
                                }`}
                                checked={checked}
                                aria-label={
                                  t('widget.select', {
                                    title: widget.title
                                  }) || undefined
                                }
                                onChange={() => toggleSelected(widget.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <button
                              type="button"
                              className="flex h-16 w-full items-center justify-center overflow-hidden rounded bg-slate-50"
                              title={String(t('widget.insertHint'))}
                              onClick={(event) => {
                                if (event.detail > 1) {
                                  return
                                }
                                if (coarse && focused) {
                                  void insertAtCenter(widget.id)
                                  return
                                }
                                focusWidget(widget.id)
                              }}
                              onDoubleClick={() =>
                                void insertAtCenter(widget.id)
                              }
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
                                  className="min-w-0 flex-1 truncate text-xs text-slate-600"
                                  title={widget.title}
                                >
                                  {widget.title}
                                </span>
                                {focused && (
                                  <span className="shrink-0 rounded-full bg-[#66CC8A] px-1 py-px text-[9px] leading-none text-white">
                                    {t('widget.current')}
                                  </span>
                                )}
                                {coarse && (
                                  <button
                                    type="button"
                                    className="rounded bg-[#66CC8A]/15 px-1 py-0.5 text-[9px] text-[#3d9a5c]"
                                    title={String(t('widget.insert'))}
                                    onClick={() =>
                                      void insertAtCenter(widget.id)
                                    }
                                  >
                                    {t('widget.insert')}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className={`rounded p-0.5 text-slate-400 hover:bg-slate-100 ${
                                    coarse
                                      ? ''
                                      : 'opacity-0 group-hover:opacity-100'
                                  }`}
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
                                  onClick={() => {
                                    if (focusedId === widget.id) {
                                      setFocusedId('')
                                    }
                                    deleteWidget(widget.id)
                                  }}
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
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
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
                      className="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      disabled={syncBusy}
                      onClick={() => void loadCloud()}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {t('widget.syncLoad')}
                    </button>
                    <button
                      type="button"
                      className="rounded px-1.5 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      disabled={syncBusy || !targetCode.trim()}
                      onClick={onSetAsMine}
                    >
                      {t('widget.syncSetAsMine')}
                    </button>
                  </div>
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <label className="flex items-center gap-1 text-[10px] text-slate-500">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={allSelected}
                        disabled={!cloudMetas.length}
                        onChange={toggleAll}
                      />
                      {allSelected
                        ? t('widget.clearSelection')
                        : t('widget.selectAll')}
                    </label>
                    {selected.size > 0 && (
                      <>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded bg-[#66CC8A] px-2 py-1 text-[11px] text-white hover:bg-[#57b87a] disabled:opacity-50"
                          disabled={syncBusy}
                          onClick={() => void downloadSelected()}
                        >
                          <CloudDownload className="h-3.5 w-3.5" />
                          {t('widget.syncDownload')}
                        </button>
                        {isOwnCloudSpace && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            disabled={syncBusy}
                            onClick={() => void deleteSelectedCloud()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {t('widget.syncDelete')}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  {cloudLoadedCode ? (
                    <p className="mb-1 text-[10px] text-slate-400">
                      {t('widget.syncLoadedAs', { code: cloudLoadedCode })}
                      {isOwnCloudSpace ? ` · ${t('widget.syncOwnSpace')}` : ''}
                    </p>
                  ) : null}
                  {!cloudLoadedCode ? (
                    <p className="py-3 text-center text-sm text-slate-500">
                      {t('widget.syncCloudEmptyHint')}
                    </p>
                  ) : cloudMetas.length === 0 ? (
                    <p className="py-3 text-center text-sm text-slate-500">
                      {t('widget.syncCloudEmpty')}
                    </p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {cloudMetas.map((meta) => {
                        const checked = selected.has(meta.id)
                        const focused = focusedId === meta.id
                        return (
                          <div
                            key={meta.id}
                            className={`relative flex w-28 shrink-0 flex-col rounded-lg border bg-white p-1.5 shadow-sm ${widgetFrameClass(
                              meta.id
                            )}`}
                          >
                            <div className="absolute left-1 top-1 z-[1]">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-xs bg-white"
                                checked={checked}
                                aria-label={
                                  t('widget.select', {
                                    title: meta.title
                                  }) || undefined
                                }
                                onChange={() => toggleSelected(meta.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <button
                              type="button"
                              className="flex h-16 w-full items-center justify-center overflow-hidden rounded bg-slate-50"
                              onClick={(event) => {
                                if (event.detail > 1) {
                                  return
                                }
                                focusWidget(meta.id)
                              }}
                            >
                              {meta.thumbnail ? (
                                <img
                                  src={meta.thumbnail}
                                  alt={meta.title}
                                  className="max-h-full max-w-full object-contain"
                                  draggable={false}
                                />
                              ) : (
                                <LayoutTemplate className="h-6 w-6 text-slate-300" />
                              )}
                            </button>
                            <div className="mt-1 flex items-center gap-0.5">
                              <span
                                className="min-w-0 flex-1 truncate text-xs text-slate-600"
                                title={meta.title}
                              >
                                {meta.title}
                              </span>
                              {focused && (
                                <span className="shrink-0 rounded-full bg-[#66CC8A] px-1 py-px text-[9px] leading-none text-white">
                                  {t('widget.current')}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              <div className="mt-2 rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2">
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
                    onPointerDown={(event) => {
                      if (event.button === 0) {
                        regenerateArmedRef.current = true
                      }
                    }}
                    onPointerLeave={() => {
                      regenerateArmedRef.current = false
                    }}
                    onPointerCancel={() => {
                      regenerateArmedRef.current = false
                    }}
                    onClick={() => {
                      if (!regenerateArmedRef.current) {
                        return
                      }
                      regenerateArmedRef.current = false
                      onRegenerate()
                    }}
                  >
                    <RefreshCw className="h-3 w-3" />
                    {t('widget.syncRegenerate')}
                  </button>
                </div>
                {!isWidgetSyncConfigured() && (
                  <p className="text-[10px] text-amber-600">
                    {t('widget.syncNotConfigured')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
      {showLogin && (
        <CloudLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setLoggedIn(true)}
        />
      )}
    </>
  )
}

export default WidgetPanel
