import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useCameraStore from '@/store/camera'

import { Settings2 } from 'lucide-react'
import DisplayConfig from './displayConfig'
import Toast from '../toast'
import CountDown from './countDown'

interface CameraConfigProps {
  showLabel?: boolean
  /** Portrait left rail: compact + menu opens to the right. */
  rail?: boolean
}

const CameraConfig = ({
  showLabel = false,
  rail = false
}: CameraConfigProps) => {
  const { t } = useTranslation()
  const { openCamera, updateOpenCamera, pauseCamera, updatePauseCamera } =
    useCameraStore()
  const [showCameraTip, updateShowCameraTip] = useState(false)
  const [openCameraCountdown, setOpenCameraCountdown] = useState(false)
  const cameraLabel = String(t('operate.camera'))

  const handleOpenCamera = async () => {
    const status = await navigator?.permissions?.query({
      name: 'camera'
    })

    if (status?.state === 'denied') {
      updateShowCameraTip(true)
      setTimeout(() => {
        updateShowCameraTip(false)
      }, 2000)
      return
    }

    updateOpenCamera(!openCamera)
  }

  const handleCountDown = () => {
    if (pauseCamera) {
      updatePauseCamera(false)
    } else {
      setOpenCameraCountdown(true)
    }
  }

  const handleCountDownDone = () => {
    updatePauseCamera(true)
    setOpenCameraCountdown(false)
  }

  return (
    <div
      className={`dropdown dropdown-hover ${
        rail
          ? 'dropdown-right w-full'
          : 'ml-2 dropdown-top landscape:dropdown-bottom'
      } ${showLabel && !rail ? 'h-7' : rail ? '' : 'h-7 w-7'}`}
    >
      <div
        tabIndex={0}
        role="button"
        title={showLabel ? undefined : cameraLabel}
        aria-label={cameraLabel}
        className={`relative flex cursor-pointer items-center justify-center rounded-full bg-white ${
          rail
            ? 'w-full flex-col gap-0.5 px-0.5 py-1'
            : showLabel
            ? 'h-7 gap-1 pl-0.5 pr-1.5'
            : 'h-7 w-7'
        }`}
      >
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
          {openCamera ? (
            <>
              <span className="absolute inline-flex h-7 w-7 animate-pulse rounded-full bg-[#ff586180]"></span>
              <span className="relative z-10 inline-flex h-4 w-4 rounded-full bg-[#ff5861]"></span>
            </>
          ) : (
            <>
              <span className="absolute inline-flex h-7 w-7 rounded-full bg-[#66CC8A40]"></span>
              <span className="relative z-10 inline-flex h-4 w-4 rounded-full bg-[#66CC8A]"></span>
            </>
          )}
        </span>
        {showLabel && (
          <span
            className={
              rail
                ? 'max-w-[2.75rem] truncate text-center text-[9px] font-medium leading-tight text-slate-700'
                : 'text-[11px] font-medium text-slate-700'
            }
          >
            {cameraLabel}
          </span>
        )}
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-[11] shadow"
      >
        <li>
          <a className="p-0">
            <label className="label cursor-pointer flex items-center justify-start gap-x-1 w-28">
              <span className="shrink-0">{t('camera.openCamera')}</span>
              <input
                type="checkbox"
                className={`toggle toggle-sm toggle-primary`}
                checked={openCamera}
                onChange={handleOpenCamera}
              />
            </label>
          </a>
        </li>
        {openCamera && (
          <li>
            <a className="p-0">
              <label className="label cursor-pointer flex items-center justify-start gap-x-1 w-32">
                <span className="shrink-0">{t('camera.freezeFrame')}</span>
                <input
                  type="checkbox"
                  className={`toggle toggle-sm toggle-primary`}
                  checked={pauseCamera}
                  onChange={() => handleCountDown()}
                />
              </label>
            </a>
          </li>
        )}
        <li>
          <a
            className="p-1 gap-x-1"
            onClick={() => {
              ;(
                document.getElementById(
                  'display-config-modal'
                ) as HTMLDialogElement
              )?.showModal()
            }}
          >
            <span className="text-nowrap">
              {t('camera.displayConfig.title')}
            </span>
            <Settings2 size={20} />
          </a>
        </li>
      </ul>
      <DisplayConfig />

      {showCameraTip && (
        <Toast message="tip.cameraPermissionDenied" type="error" />
      )}

      {/* countdown animation */}
      {openCameraCountdown && (
        <CountDown onDone={() => handleCountDownDone()} />
      )}
    </div>
  )
}

export default CameraConfig
