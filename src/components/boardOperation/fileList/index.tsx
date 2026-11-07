import { FC, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CloudDownload,
  CloudUpload,
  FileDown,
  FilePlus,
  FileUp,
  LogIn,
  LogOut,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react'
import useFileStore, { canAddBoard, MAX_BOARD_COUNT } from '@/store/files'
import { idsToDelete } from '@/store/boardRules'
import useBoardStore from '@/store/board'
import useCameraStore from '@/store/camera'
import { ActionMode } from '@/constants'
import { paintBoard } from '@/core/paintBoard'
import {
  cachedThumbnail,
  hydrateThumbnail,
  subscribeThumbnails
} from '@/core/thumbnail/thumbnailCache'
import { needsThumbnail } from '@/core/thumbnail/frame'
import {
  isThumbnailPending,
  scheduleBoardThumbnail
} from '@/core/thumbnail/scheduleBoardThumbnail'
import {
  cloudLogout,
  isCloudLoggedIn,
  subscribeCloudAuth
} from '@/core/auth/cloudAuth'
import {
  getMySyncCode,
  isValidSyncCode,
  isWidgetSyncConfigured
} from '@/core/widget/widgetSync'
import { listCloudBoards, type CloudBoardMeta } from '@/core/board/boardSync'
import Toast from '@/components/toast'
import DeleteFileModal from '@/components/boardOperation/deleteFileModal'
import FileCard from './fileCard'
import CloudBoardCard from './cloudBoardCard'
import RenameFileModal from '@/components/boardOperation/renameFileModal'
import DownloadFilesModal from '@/components/boardOperation/downloadFilesModal'
import CloudLoginModal from '@/components/cloudAuth/CloudLoginModal'

interface IProps {
  updateShow: (show: boolean) => void
}

type TabId = 'local' | 'cloud'

const FileList: FC<IProps> = ({ updateShow }) => {
  const { t } = useTranslation()
  const {
    files,
    currentId,
    uploadFile,
    deleteFiles,
    uploadBoardsToCloud,
    downloadBoardsFromCloud,
    deleteBoardsFromCloud
  } = useFileStore()
  const updateMode = useBoardStore((state) => state.updateMode)
  const updateOpenCamera = useCameraStore((state) => state.updateOpenCamera)
  const [tab, setTab] = useState<TabId>('local')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [renameId, setRenameId] = useState('')
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [downloadIds, setDownloadIds] = useState<string[]>([])
  const [showUploadFail, setShowUploadFail] = useState(false)
  const [showLimit, setShowLimit] = useState(false)
  const [thumbVersion, setThumbVersion] = useState(0)
  const [loggedIn, setLoggedIn] = useState(() => isCloudLoggedIn())
  const [showLogin, setShowLogin] = useState(false)
  const [mySyncCode] = useState(() => getMySyncCode())
  const [cloudCode, setCloudCode] = useState('')
  const [cloudMetas, setCloudMetas] = useState<CloudBoardMeta[]>([])
  const [cloudLoadedCode, setCloudLoadedCode] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    type: 'error' | 'success'
  } | null>(null)
  const [confirmCloudDelete, setConfirmCloudDelete] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const selectAllRef = useRef<HTMLInputElement>(null)
  const atLimit = !canAddBoard(files.length)
  const activeList =
    tab === 'local' ? files.map((file) => file.id) : cloudMetas.map((m) => m.id)
  const allSelected =
    activeList.length > 0 && activeList.every((id) => selected.has(id))
  // Checkbox batch, or the focused/current board when nothing is checked.
  const deleteSourceIds =
    selected.size > 0 ? [...selected] : currentId ? [currentId] : []
  const deleteTargets = idsToDelete(files, deleteSourceIds, currentId)
  const resolvedCloudCode = cloudCode.trim() || mySyncCode
  const isOwnCloudSpace =
    Boolean(cloudLoadedCode) && cloudLoadedCode === mySyncCode

  useEffect(() => subscribeCloudAuth(() => setLoggedIn(isCloudLoggedIn())), [])

  useEffect(
    () => subscribeThumbnails(() => setThumbVersion((value) => value + 1)),
    []
  )

  useEffect(() => {
    setSelected((current) => {
      const alive = new Set(activeList)
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
  }, [tab, files, cloudMetas])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selected.size > 0 && selected.size < activeList.length
    }
  }, [activeList.length, selected])

  useEffect(() => {
    let cancelled = false
    const syncThumbnails = async () => {
      const list = useFileStore.getState().files
      await Promise.all(list.map((file) => hydrateThumbnail(file.id)))
      if (cancelled) {
        return
      }
      list.forEach((file) => {
        const cached = cachedThumbnail(file.id)
        if (
          needsThumbnail(file.contentRevision, cached ? cached.revision : null)
        ) {
          scheduleBoardThumbnail(file.id)
        }
      })
    }
    void syncThumbnails()
    return () => {
      cancelled = true
    }
  }, [files])

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showLimitMessage = () => {
    setShowLimit(true)
    window.setTimeout(() => setShowLimit(false), 1800)
  }

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type })
  }

  const ensureCloudAuth = () => {
    if (!isWidgetSyncConfigured()) {
      showToast('fileBoard.syncNotConfigured')
      return false
    }
    if (!isCloudLoggedIn()) {
      setShowLogin(true)
      return false
    }
    return true
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
    setSelected(allSelected ? new Set() : new Set(activeList))
  }

  /** Single-click: switch current board (绿框 + 当前), keep the list open. */
  const focusBoard = (id: string) => {
    if (id === currentId) {
      return
    }
    updateOpenCamera(false)
    void paintBoard.switchFile(id)
    updateMode(ActionMode.DRAW)
  }

  /** Double-click: open board and close the list. */
  const openBoard = (id: string) => {
    if (id !== currentId) {
      updateOpenCamera(false)
      void paintBoard.switchFile(id)
      updateMode(ActionMode.DRAW)
    }
    updateShow(false)
  }

  const confirmBatchDelete = () => {
    deleteFiles(deleteTargets)
    setSelected(new Set())
    setConfirmDelete(false)
  }

  const handleUpload = (file?: File) => {
    if (!file) {
      return
    }
    if (atLimit) {
      showLimitMessage()
      return
    }
    void uploadFile(file).then((loaded) => {
      if (loaded) {
        scheduleBoardThumbnail(useFileStore.getState().currentId)
        void paintBoard.loadFile(useFileStore.getState().currentId)
        updateMode(ActionMode.DRAW)
        updateShow(false)
        return
      }
      if (!canAddBoard(useFileStore.getState().files.length)) {
        showLimitMessage()
        return
      }
      setShowUploadFail(true)
      window.setTimeout(() => setShowUploadFail(false), 1500)
    })
  }

  const switchTab = (next: TabId) => {
    setTab(next)
    setSelected(new Set())
  }

  const loadCloud = async () => {
    if (!ensureCloudAuth()) {
      return
    }
    if (!isValidSyncCode(resolvedCloudCode)) {
      showToast('fileBoard.syncInvalidCode')
      return
    }
    setSyncBusy(true)
    try {
      const result = await listCloudBoards(resolvedCloudCode)
      setCloudMetas(result.metas)
      setCloudLoadedCode(resolvedCloudCode)
      setSelected(new Set())
      showToast('fileBoard.syncLoadSuccess', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'unauthorized') {
        setShowLogin(true)
        showToast('cloudAuth.loginRequired')
      } else {
        showToast('fileBoard.syncFailed')
      }
    } finally {
      setSyncBusy(false)
    }
  }

  const uploadSelected = async () => {
    if (!ensureCloudAuth()) {
      return
    }
    if (selected.size === 0) {
      return
    }
    setSyncBusy(true)
    try {
      const ids = [...selected]
      const thumbs: Record<string, string> = {}
      ids.forEach((id) => {
        const url = cachedThumbnail(id)?.url
        if (url) {
          thumbs[id] = url
        }
      })
      const count = await uploadBoardsToCloud(ids, thumbs)
      showToast('fileBoard.syncUploadSuccess', 'success')
      if (cloudLoadedCode === mySyncCode) {
        const result = await listCloudBoards(mySyncCode)
        setCloudMetas(result.metas)
      }
      void count
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'unauthorized') {
        setShowLogin(true)
      }
      showToast('fileBoard.syncFailed')
    } finally {
      setSyncBusy(false)
    }
  }

  const downloadSelected = async () => {
    if (!ensureCloudAuth()) {
      return
    }
    if (!cloudLoadedCode || selected.size === 0) {
      return
    }
    setSyncBusy(true)
    try {
      const count = await downloadBoardsFromCloud(cloudLoadedCode, [
        ...selected
      ])
      if (count < selected.size) {
        showLimitMessage()
      }
      showToast('fileBoard.syncDownloadSuccess', 'success')
      setSelected(new Set())
      setTab('local')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'unauthorized') {
        setShowLogin(true)
      }
      showToast('fileBoard.syncFailed')
    } finally {
      setSyncBusy(false)
    }
  }

  const deleteSelectedCloud = async () => {
    if (!ensureCloudAuth() || !isOwnCloudSpace || selected.size === 0) {
      return
    }
    setSyncBusy(true)
    try {
      await deleteBoardsFromCloud([...selected])
      const result = await listCloudBoards(mySyncCode)
      setCloudMetas(result.metas)
      setSelected(new Set())
      setConfirmCloudDelete(false)
      showToast('fileBoard.syncDeleteSuccess', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'unauthorized') {
        setShowLogin(true)
      }
      showToast('fileBoard.syncFailed')
    } finally {
      setSyncBusy(false)
    }
  }

  return (
    <>
      <div
        className="modal modal-open z-[70]"
        onClick={() => updateShow(false)}
      >
        <div
          className="pb-panel-fill modal-box flex w-[var(--pb-panel-max-w-center)] max-w-5xl flex-col overflow-hidden p-0"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 xs:px-3 xs:py-2 landscape:px-3 landscape:py-2">
            <h3 className="font-fredokaOne text-xl xs:text-lg landscape:text-lg">
              {t('fileBoard.title')}
            </h3>
            <div className="flex items-center gap-1">
              {loggedIn ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    cloudLogout()
                    setLoggedIn(false)
                  }}
                >
                  <LogOut size={16} />
                  {t('cloudAuth.logout')}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowLogin(true)}
                >
                  <LogIn size={16} />
                  {t('cloudAuth.login')}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-circle"
                aria-label={t('fileBoard.close') || undefined}
                onClick={() => updateShow(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex shrink-0 gap-2 border-b border-slate-100 px-4 pt-2 xs:px-3 xs:pt-1.5 landscape:px-3 landscape:pt-1.5">
            <button
              type="button"
              className={`rounded-t-lg px-3 py-1.5 text-sm ${
                tab === 'local'
                  ? 'bg-[#66CC8A] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => switchTab('local')}
            >
              {t('fileBoard.tabLocal')}
            </button>
            <button
              type="button"
              className={`rounded-t-lg px-3 py-1.5 text-sm ${
                tab === 'cloud'
                  ? 'bg-[#66CC8A] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => switchTab('cloud')}
            >
              {t('fileBoard.tabCloud')}
            </button>
          </div>

          {tab === 'local' ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2 xs:gap-1.5 xs:px-3 xs:py-1.5 landscape:px-3 landscape:py-1.5">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                  {allSelected
                    ? t('fileBoard.clearSelection')
                    : t('fileBoard.selectAll')}
                </label>
                <span className="text-sm text-slate-500">
                  {t('fileBoard.selected', { count: selected.size })}
                  <span className="mx-1.5">·</span>
                  {`${files.length}/${MAX_BOARD_COUNT}`}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  {selected.size === 0 ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm min-xs:tooltip"
                        data-tip={t('fileBoard.create')}
                        aria-label={t('fileBoard.create') || undefined}
                        onClick={() => {
                          if (atLimit) {
                            showLimitMessage()
                            return
                          }
                          setCreating(true)
                        }}
                      >
                        <FilePlus size={18} color="#66CC8A" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm min-xs:tooltip"
                        data-tip={t('operate.uploadFile')}
                        aria-label={t('operate.uploadFile') || undefined}
                        onClick={() => {
                          if (atLimit) {
                            showLimitMessage()
                            return
                          }
                          uploadRef.current?.click()
                        }}
                      >
                        <FileUp size={18} color="#66CC8A" />
                      </button>
                      {deleteTargets.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm min-xs:tooltip"
                          data-tip={t('operate.deleteFile')}
                          aria-label={t('operate.deleteFile') || undefined}
                          onClick={() => setConfirmDelete(true)}
                        >
                          <Trash2 size={18} color="#66CC8A" />
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm min-xs:tooltip"
                        data-tip={t('fileBoard.syncUpload')}
                        disabled={syncBusy}
                        onClick={() => void uploadSelected()}
                      >
                        <CloudUpload size={18} color="#66CC8A" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm min-xs:tooltip"
                        data-tip={t('fileBoard.batchDelete')}
                        aria-label={t('fileBoard.batchDelete') || undefined}
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 size={18} color="#66CC8A" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm min-xs:tooltip"
                        data-tip={t('fileBoard.batchDownload')}
                        aria-label={t('fileBoard.batchDownload') || undefined}
                        onClick={() => setDownloadIds([...selected])}
                      >
                        <FileDown size={18} color="#66CC8A" />
                      </button>
                    </>
                  )}
                  <input
                    ref={uploadRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(event) => {
                      handleUpload(event.target.files?.[0])
                      event.target.value = ''
                    }}
                  />
                </div>
              </div>
              {showLimit && (
                <div className="mx-5 mb-3 shrink-0 rounded-lg bg-warning/20 px-3 py-2 text-sm">
                  {t('fileBoard.limit', { count: MAX_BOARD_COUNT })}
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1 xs:px-3 xs:pb-3 landscape:px-3 landscape:pb-3">
                <div className="grid content-start items-start gap-3 [grid-auto-rows:minmax(10rem,12.5rem)] [grid-template-columns:repeat(auto-fill,minmax(min(100%,14rem),1fr))] xs:gap-2.5 xs:[grid-auto-rows:minmax(9rem,11.5rem)] xs:[grid-template-columns:repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] landscape:gap-2.5 landscape:[grid-auto-rows:minmax(8rem,min(28vh,11rem))] landscape:[grid-template-columns:repeat(auto-fill,minmax(min(100%,11rem),1fr))]">
                  {files.map((file) => {
                    void thumbVersion
                    return (
                      <FileCard
                        key={file.id}
                        file={file}
                        checked={selected.has(file.id)}
                        current={file.id === currentId}
                        thumbnailUrl={cachedThumbnail(file.id)?.url}
                        pending={isThumbnailPending(
                          file.id,
                          file.contentRevision
                        )}
                        onFocus={focusBoard}
                        onOpen={openBoard}
                        onCheck={toggleSelected}
                        onRename={setRenameId}
                      />
                    )
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex shrink-0 flex-col gap-2 px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {t('fileBoard.syncTargetCode')}
                  </span>
                  <input
                    className="input input-bordered input-sm min-w-[14rem] flex-1 font-mono text-xs"
                    value={cloudCode}
                    placeholder={String(t('fileBoard.syncTargetPlaceholder'))}
                    disabled={syncBusy}
                    onChange={(e) => setCloudCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={syncBusy}
                    onClick={() => void loadCloud()}
                  >
                    <RefreshCw size={14} />
                    {t('fileBoard.syncLoad')}
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={allSelected}
                      disabled={!cloudMetas.length}
                      onChange={toggleAll}
                    />
                    {allSelected
                      ? t('fileBoard.clearSelection')
                      : t('fileBoard.selectAll')}
                  </label>
                  <span className="text-sm text-slate-500">
                    {t('fileBoard.selected', { count: selected.size })}
                    <span className="mx-1.5">·</span>
                    {t('fileBoard.syncCloudCount', {
                      count: cloudMetas.length
                    })}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    {selected.size > 0 && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={syncBusy}
                          onClick={() => void downloadSelected()}
                        >
                          <CloudDownload size={16} />
                          {t('fileBoard.syncDownload')}
                        </button>
                        {isOwnCloudSpace && (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            disabled={syncBusy}
                            onClick={() => setConfirmCloudDelete(true)}
                          >
                            <Trash2 size={16} />
                            {t('fileBoard.syncDelete')}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {cloudLoadedCode && (
                  <p className="text-[11px] text-slate-400">
                    {t('fileBoard.syncLoadedAs', {
                      code: cloudLoadedCode
                    })}
                    {isOwnCloudSpace ? ` · ${t('fileBoard.syncOwnSpace')}` : ''}
                  </p>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1 xs:px-3 xs:pb-3 landscape:px-3 landscape:pb-3">
                {!cloudLoadedCode ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {t('fileBoard.syncCloudEmptyHint')}
                  </p>
                ) : cloudMetas.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    {t('fileBoard.syncCloudEmpty')}
                  </p>
                ) : (
                  <div className="grid content-start items-start gap-4 [grid-auto-rows:200px] [grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))] xs:gap-2.5 xs:[grid-auto-rows:minmax(9rem,11.5rem)] xs:[grid-template-columns:repeat(auto-fill,minmax(min(100%,11.5rem),1fr))] landscape:gap-3 landscape:[grid-auto-rows:minmax(140px,180px)] landscape:[grid-template-columns:repeat(auto-fill,minmax(min(100%,180px),1fr))]">
                    {cloudMetas.map((meta) => (
                      <CloudBoardCard
                        key={meta.id}
                        meta={meta}
                        selected={selected.has(meta.id)}
                        onToggle={toggleSelected}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        {/* daisyUI backdrop uses z-index:-1; with a raised modal z-index it
            becomes untouchable, so closing is handled on the modal itself. */}
        <form method="dialog" className="modal-backdrop">
          <button type="button">close</button>
        </form>
      </div>
      {showUploadFail && <Toast message="tip.uploadFileFail" type="error" />}
      {toast && <Toast message={toast.message} type={toast.type} />}
      {confirmDelete && (
        <DeleteFileModal
          count={deleteTargets.length}
          keepCurrent={deleteTargets.length < deleteSourceIds.length}
          onConfirm={confirmBatchDelete}
          onClose={() => setConfirmDelete(false)}
        />
      )}
      {confirmCloudDelete && (
        <div className="modal modal-open z-[80]">
          <div className="modal-box">
            <h3 className="font-fredokaOne text-lg">
              {t('fileBoard.syncDeleteConfirm', { count: selected.size })}
            </h3>
            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmCloudDelete(false)}
              >
                {t('cloudAuth.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-error btn-sm"
                disabled={syncBusy}
                onClick={() => void deleteSelectedCloud()}
              >
                {t('fileBoard.syncDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
      {creating && (
        <RenameFileModal mode="create" onClose={() => setCreating(false)} />
      )}
      {renameId && (
        <RenameFileModal
          mode="edit"
          fileId={renameId}
          onClose={() => setRenameId('')}
        />
      )}
      {downloadIds.length > 0 && (
        <DownloadFilesModal
          ids={downloadIds}
          onClose={() => setDownloadIds([])}
        />
      )}
      {showLogin && (
        <CloudLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setLoggedIn(true)}
        />
      )}
    </>
  )
}

export default FileList
