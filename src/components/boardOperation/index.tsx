import { ChangeEvent, useState, useCallback, useEffect, useRef } from 'react'
import useBoardStore from '@/store/board'
import useFileStore, {
  DEFAULT_BACKGROUND_SORT,
  useCurrentFile
} from '@/store/files'
import useCameraStore from '@/store/camera'
import { canGroupActiveObjects } from '@/core/element/group/groupSelection'
import { getLinkMenuState } from '@/core/element/layer/linkMenuState'
import { linkActiveObjects } from '@/core/element/layer/objectListActions'
import { ActionMode } from '@/constants'
import { paintBoard } from '@/core/paintBoard'
import { ImageElement } from '@/core/element/image'
import { captureCameraFrame } from '@/core/camera/renderer'
import {
  exportCanvasImage,
  ExportImageResult,
  ExportScope
} from '@/core/export/exportCanvasImage'
import { exportErrorMessageKey } from '@/core/export/exportError'
import useWidgetStore, { MAX_WIDGET_COUNT } from '@/store/widgets'
import { useTouchUi } from '@/hooks/useTouchUi'
import { useLandscapeLayout } from '@/hooks/useLandscapeLayout'
import {
  enterLandscapeLayout,
  exitLandscapeLayout
} from '@/utils/screenOrientation'
import { canvasSizeForOrientation } from '@/utils/canvasOrientation'

import FileList from './fileList'
import ObjectList from './objectList'
import DownloadImage from './downloadImage'
import UploadImage from '@/components/uploadImage/lazy'
import Toast from '@/components/toast'
import { subscribeImageDropNotice } from '@/core/event/imageDrop'
import OperationDock from './operationDock'

const BoardOperation = () => {
  const { touchUi } = useTouchUi()
  const { landscape } = useLandscapeLayout()
  const { isPanMode, mode, togglePanMode, setPanMode, updateMode } =
    useBoardStore()
  const { cameraOpacity, openCamera } = useCameraStore()
  const currentFile = useCurrentFile()
  const saveJSON = useFileStore((state) => state.saveJSON)
  const updateCanvasSize = useFileStore((state) => state.updateCanvasSize)
  const [showFile, updateShowFile] = useState(false)
  const [showObjectList, updateShowObjectList] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [layoutHint, setLayoutHint] = useState<string | null>(null)

  const [exportImage, setExportImage] = useState<ExportImageResult | null>(null)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [hasSelection, setHasSelection] = useState(false)
  const [canGroup, setCanGroup] = useState(false)
  const [canLink, setCanLink] = useState(false)
  const exportingRef = useRef(false)

  const [uploadImageURL, setUploadImageURL] = useState('')
  const [dropNotice, setDropNotice] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [widgetNotice, setWidgetNotice] = useState<string | null>(null)
  const addWidgetFromSelection = useWidgetStore(
    (state) => state.addWidgetFromSelection
  )
  const setWidgetPanelOpen = useWidgetStore((state) => state.setPanelOpen)
  const widgetCount = useWidgetStore((state) => state.widgets.length)

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (err) {
      console.error('fullscreen error:', err)
    }
  }, [])

  const toggleLandscapeLayout = useCallback(async () => {
    if (landscape) {
      await exitLandscapeLayout()
      const portrait = canvasSizeForOrientation(false)
      updateCanvasSize(portrait.width, portrait.height)
      return
    }
    const result = await enterLandscapeLayout()
    if (result.ok) {
      const next = canvasSizeForOrientation(true)
      updateCanvasSize(next.width, next.height)
      setLayoutHint(null)
      return
    }
    if (result.hintKey) {
      setLayoutHint(result.hintKey)
      window.setTimeout(() => setLayoutHint(null), 2800)
    }
  }, [landscape, updateCanvasSize])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const saveSelectionAsWidget = async () => {
    if (widgetCount >= MAX_WIDGET_COUNT) {
      setWidgetNotice('widget.limitReached')
      return
    }
    const ok = await addWidgetFromSelection()
    if (ok) {
      setWidgetPanelOpen(true)
      setWidgetNotice('widget.addSuccess')
    } else {
      setWidgetNotice('widget.addFailed')
    }
  }

  const uploadImageFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = (fEvent) => {
      const data = fEvent.target?.result
      if (data && typeof data === 'string') {
        setUploadImageURL(data)
        setShowUploadModal(true)
      }
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleUploadImage = (imageUrl: string) => {
    if (imageUrl) {
      const image = new ImageElement()
      image.addImage(imageUrl)
    }
  }

  useEffect(() => {
    let timer = 0
    const unsubscribe = subscribeImageDropNotice((notice) => {
      setDropNotice(notice)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setDropNotice(null), 2800)
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!widgetNotice) {
      return
    }
    const timer = window.setTimeout(() => setWidgetNotice(null), 2800)
    return () => window.clearTimeout(timer)
  }, [widgetNotice])

  useEffect(() => {
    const refreshSelection = () => {
      const active = paintBoard.canvas?.getActiveObjects() ?? []
      const count = active.length
      setHasSelection(count > 0)
      setCanGroup(canGroupActiveObjects(count))
      setCanLink(getLinkMenuState(active).canLink)
    }
    paintBoard.addHookFn(refreshSelection)
    refreshSelection()
    return () => {
      paintBoard.removeHookFn(refreshSelection)
    }
  }, [])

  const saveImage = async (scope: ExportScope) => {
    const canvas = paintBoard.canvas
    if (!canvas || exportingRef.current) {
      return
    }
    exportingRef.current = true
    const colorIndex = currentFile?.currentBackgroundColor ?? -1
    const colorList = currentFile?.backgroundColorList
    try {
      const result = await exportCanvasImage(canvas, scope, {
        sort: currentFile?.backgroundSort || DEFAULT_BACKGROUND_SORT,
        color:
          colorList?.length && colorIndex >= 0
            ? colorList[colorIndex] || null
            : null,
        imageUrl: currentFile?.backgroundImage || '',
        imageOpacity: currentFile?.backgroundImageOpacity ?? 1,
        cameraFrame: openCamera ? captureCameraFrame() : null,
        cameraOpacity
      })
      setExportImage(result)
      setShowDownloadModal(true)
      setExportError(null)
    } catch (error) {
      console.error('Failed to export canvas', error)
      setExportError(exportErrorMessageKey(error))
    } finally {
      exportingRef.current = false
    }
  }

  return (
    <>
      <OperationDock
        hasSelection={hasSelection}
        canGroup={canGroup}
        canLink={canLink}
        isFullscreen={isFullscreen}
        isPanMode={isPanMode}
        mode={mode}
        showTouchTools={touchUi}
        onUndo={() => paintBoard.history?.undo()}
        onRedo={() => paintBoard.history?.redo()}
        onCopy={() => paintBoard.copyObject()}
        onDelete={() => paintBoard.deleteObject()}
        onGroup={() => paintBoard.groupObject()}
        onLink={() => linkActiveObjects()}
        onAddWidget={() => void saveSelectionAsWidget()}
        onText={() => paintBoard.textElement?.loadText({})}
        onUploadImage={uploadImageFile}
        onExport={saveImage}
        onExportBoard={saveJSON}
        onToggleObjectList={() => updateShowObjectList((open) => !open)}
        onOpenFiles={() => updateShowFile(true)}
        onToggleFullscreen={() => void toggleFullscreen()}
        onTogglePanMode={() => togglePanMode()}
        onSelectMode={() => {
          // Always exit hand-pan; one tap must land in select even if already SELECT.
          setPanMode(false)
          updateMode(ActionMode.SELECT)
        }}
        isLandscapeLayout={landscape}
        onToggleLandscapeLayout={() => void toggleLandscapeLayout()}
      />
      {exportError && <Toast message={exportError} type="error" />}
      {dropNotice && <Toast message={dropNotice} type="warning" />}
      {layoutHint && <Toast message={layoutHint} type="warning" />}
      {widgetNotice && (
        <Toast
          message={widgetNotice}
          type={widgetNotice === 'widget.addSuccess' ? 'success' : 'error'}
        />
      )}
      {showObjectList && <ObjectList updateShow={updateShowObjectList} />}
      {showFile && <FileList updateShow={updateShowFile} />}
      {showDownloadModal && exportImage && (
        <DownloadImage
          url={exportImage.url}
          background={exportImage.background}
          backgroundFrame={exportImage.backgroundFrame}
          showModal={showDownloadModal}
          setShowModal={setShowDownloadModal}
        />
      )}
      <UploadImage
        url={uploadImageURL}
        showModal={showUploadModal}
        setShowModal={setShowUploadModal}
        handleUploadImage={handleUploadImage}
      />
    </>
  )
}

export default BoardOperation
