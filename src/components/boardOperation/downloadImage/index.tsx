import { useState, FC, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebounceEffect } from '@/hooks/useDebounceEffect'
import {
  composeExportLayers,
  PAGE_EXPORT_FILL,
  type ExportBackground,
  type ExportBackgroundFrame
} from '@/core/export/exportCanvasImage'

import ReactCrop, { Crop } from 'react-image-crop'
import { canvasPreview, renderExportCrop } from './canvasPreview'
import Toast from '@/components/toast'

import { Scaling, RotateCw, Proportions, Image } from 'lucide-react'
import Mask from '@/components/mask'

import 'react-image-crop/dist/ReactCrop.css'

interface IProps {
  url: string
  showModal: boolean
  setShowModal: (show: boolean) => void
  background: ExportBackground | null
  backgroundFrame: ExportBackgroundFrame | null
}

const DownloadImage: FC<IProps> = ({
  url,
  showModal,
  setShowModal,
  background,
  backgroundFrame
}) => {
  const { t } = useTranslation()
  const [saveImageRotate, updateSaveImageRotate] = useState(0)
  const [saveImageScale, updateSaveImageScale] = useState(1)
  const [saveImageSize, updateSaveImageSize] = useState(1)
  const [includeBoardBackground, setIncludeBoardBackground] = useState(
    Boolean(backgroundFrame)
  )
  const [includePageGrey, setIncludePageGrey] = useState(false)
  const [displayUrl, setDisplayUrl] = useState(url)
  const [imageVersion, setImageVersion] = useState(0)
  const [backgroundPending, setBackgroundPending] = useState(false)
  const previewUrl = useRef<string | null>(url)

  const [completedCrop, setCompletedCrop] = useState<Crop | undefined>()
  const [crop, setCrop] = useState<Crop | undefined>()

  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenAnchorRef = useRef<HTMLAnchorElement>(null)
  const blobUrlRef = useRef('')
  const cropInitialized = useRef(false)
  const [downloadFailed, setDownloadFailed] = useState(false)

  const wantsBoard =
    includeBoardBackground && Boolean(background) && Boolean(backgroundFrame)
  const needsComposite = wantsBoard || includePageGrey

  useEffect(() => {
    cropInitialized.current = false
    setIncludeBoardBackground(Boolean(backgroundFrame))
    setIncludePageGrey(false)
    setDisplayUrl(url)
    previewUrl.current = url
    setBackgroundPending(false)
  }, [url, backgroundFrame])

  useEffect(() => {
    if (!needsComposite) {
      previewUrl.current = url
      setDisplayUrl(url)
      setBackgroundPending(false)
      return
    }
    let cancelled = false
    previewUrl.current = null
    setBackgroundPending(true)
    composeExportLayers(url, {
      pageFill: includePageGrey ? PAGE_EXPORT_FILL : null,
      board:
        wantsBoard && background && backgroundFrame
          ? { background, frame: backgroundFrame }
          : null
    })
      .then((next) => {
        if (cancelled) {
          return
        }
        previewUrl.current = next
        setDisplayUrl(next)
      })
      .catch((error) => {
        console.error('Failed to composite export layers', error)
        if (cancelled) {
          return
        }
        previewUrl.current = url
        setDisplayUrl(url)
        if (imgRef.current?.getAttribute('src') === url) {
          setBackgroundPending(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [
    url,
    needsComposite,
    includePageGrey,
    wantsBoard,
    background,
    backgroundFrame
  ])

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!cropInitialized.current) {
      const { width, height } = e.currentTarget
      const nextCrop: Crop = {
        unit: 'px',
        x: 0.1 * width,
        y: 0.1 * height,
        width: 0.8 * width,
        height: 0.8 * height
      }
      cropInitialized.current = true
      setCrop({ ...nextCrop })
      setCompletedCrop({ ...nextCrop })
    }
    setImageVersion((version) => version + 1)
  }

  const handleReset = () => {
    if (imgRef.current) {
      const { width, height } = imgRef.current
      const crop: Crop = {
        unit: 'px',
        x: 0.1 * width,
        y: 0.1 * height,
        width: 0.8 * width,
        height: 0.8 * height
      }
      setCrop({ ...crop })
      setCompletedCrop({ ...crop })
    }
    updateSaveImageRotate(0)
    updateSaveImageScale(1)
  }

  const onDownloadCropClick = async () => {
    const image = imgRef.current
    if (backgroundPending) {
      return
    }
    if (!image || !completedCrop) {
      setDownloadFailed(true)
      return
    }

    try {
      // Encode from the source image's natural pixels — not the DPR preview
      // canvas, which used to be downscaled and looked softer than the board.
      const exportCanvas = renderExportCrop(
        image,
        completedCrop,
        saveImageScale,
        saveImageRotate,
        saveImageSize
      )
      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob((result) => resolve(result), 'image/png')
      })
      if (!blob) {
        throw new Error('canvas toBlob failed')
      }

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
      blobUrlRef.current = URL.createObjectURL(blob)

      if (!hiddenAnchorRef.current) {
        setDownloadFailed(true)
        return
      }
      hiddenAnchorRef.current.href = blobUrlRef.current
      hiddenAnchorRef.current.click()
      setDownloadFailed(false)
      setShowModal(false)
    } catch (error) {
      console.error('Failed to download image', error)
      setDownloadFailed(true)
    }
  }

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
          saveImageScale,
          saveImageRotate
        )
        const target = previewUrl.current
        if (target && imgRef.current.getAttribute('src') === target) {
          setBackgroundPending(false)
        }
      }
    },
    100,
    [completedCrop, saveImageScale, saveImageRotate, imageVersion]
  )

  return (
    <Mask
      show={showModal}
      clickMask={() => {
        setShowModal(false)
      }}
    >
      {downloadFailed && <Toast message="tip.exportFail" type="error" />}
      <div className="card h-fit max-h-[85vh] w-[min(96vw,800px)] overflow-auto bg-[#eef1ff] p-4 shadow-xl sm:max-h-[60vh] sm:w-[80vw] sm:p-6">
        {completedCrop && (
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:justify-between sm:gap-0">
            <div className="w-full sm:w-[48%]">
              <div className="flex items-center flex-wrap gap-y-2">
                <div
                  className="mr-[12px] shrink-0 min-xs:tooltip"
                  data-tip={t('downloadImage.size')}
                >
                  <Proportions color="#66CC8A" />
                </div>
                <div className="tabs tabs-sm tabs-boxed bg-[#333C4D] shrink-0">
                  {[1, 2, 3].map((value) => (
                    <a
                      key={value}
                      className={`tab flex-grow font-fredokaOne font-normal text-white ${
                        saveImageSize === value
                          ? 'tab-active'
                          : 'hover:text-base-300'
                      }`}
                      onClick={() => {
                        updateSaveImageSize(value)
                      }}
                    >
                      {`${value}x`}
                    </a>
                  ))}
                </div>
              </div>

              <div className="flex items-center mt-3">
                <div
                  className="mr-[6px] shrink-0 min-xs:tooltip"
                  data-tip={t('downloadImage.rotate')}
                >
                  <RotateCw color="#66CC8A" />
                </div>
                <input
                  className="range range-primary range-xs"
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={String(saveImageRotate)}
                  onChange={(e) => {
                    updateSaveImageRotate(Number(e.target.value))
                  }}
                />
              </div>

              <div className="flex items-center mt-3">
                <div
                  className="mr-[12px] shrink-0 min-xs:tooltip"
                  data-tip={t('downloadImage.scale')}
                >
                  <Scaling color="#66CC8A" />
                </div>
                <input
                  className="range range-primary range-xs"
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.1"
                  value={String(saveImageScale)}
                  onChange={(e) => {
                    updateSaveImageScale(Number(e.target.value))
                  }}
                />
              </div>

              {backgroundFrame && (
                <div className="flex items-center mt-3">
                  <div
                    className="mr-[12px] shrink-0 min-xs:tooltip"
                    data-tip={t('downloadImage.boardBackground')}
                  >
                    <Image color="#66CC8A" />
                  </div>
                  <span className="mr-2 text-xs text-slate-600">
                    {t('downloadImage.boardBackground')}
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-success toggle-sm"
                    checked={includeBoardBackground}
                    aria-label={t('downloadImage.boardBackground') || undefined}
                    onChange={(e) => {
                      setIncludeBoardBackground(e.target.checked)
                    }}
                  />
                </div>
              )}
              <div className="flex items-center mt-3">
                <div
                  className="mr-[12px] shrink-0 min-xs:tooltip"
                  data-tip={t('downloadImage.pageGrey')}
                >
                  <Image color="#94a3b8" />
                </div>
                <span className="mr-2 text-xs text-slate-600">
                  {t('downloadImage.pageGrey')}
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-success toggle-sm"
                  checked={includePageGrey}
                  aria-label={t('downloadImage.pageGrey') || undefined}
                  onChange={(e) => {
                    setIncludePageGrey(e.target.checked)
                  }}
                />
              </div>
            </div>

            <div className="flex h-fit w-full flex-wrap gap-x-4 gap-y-2 sm:w-[48%]">
              <button
                className="btn btn-ghost btn-outline btn-sm min-h-10"
                onClick={() => setShowModal(false)}
              >
                {t('cancel')}
              </button>
              <button
                className="btn btn-secondary btn-sm min-h-10"
                onClick={handleReset}
              >
                {t('reset')}
              </button>
              <button
                className="btn btn-primary btn-sm min-h-10"
                disabled={backgroundPending}
                onClick={onDownloadCropClick}
              >
                {t('download')}
              </button>

              <a
                href="#hidden"
                ref={hiddenAnchorRef}
                download="paint-board"
                style={{
                  position: 'absolute',
                  top: '-200vh',
                  visibility: 'hidden'
                }}
              >
                Hidden download
              </a>
            </div>
          </div>
        )}
        <div className="mt-3 flex w-full flex-col gap-3 sm:flex-row sm:justify-between">
          {url && (
            <div className="w-full shrink-0 overflow-auto sm:w-[48%]">
              <div className="flex w-fit max-w-full bg-transparent bg-white bg-[length:13px_13px]">
                <ReactCrop
                  crop={crop}
                  onChange={setCrop}
                  onComplete={setCompletedCrop}
                  minHeight={80}
                  minWidth={80}
                >
                  <img
                    ref={imgRef}
                    src={displayUrl}
                    className="max-w-full"
                    style={{
                      transform: `scale(${saveImageScale}) rotate(${saveImageRotate}deg)`
                    }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              </div>
            </div>
          )}
          {completedCrop && (
            <div className="w-full max-h-48 shrink-0 overflow-auto sm:max-h-none sm:w-[48%]">
              <canvas
                ref={previewCanvasRef}
                className="object-contain border border-base-content border-dashed"
                style={{
                  width: completedCrop.width,
                  height: completedCrop.height
                }}
              />
            </div>
          )}
        </div>
      </div>
    </Mask>
  )
}

export default DownloadImage
