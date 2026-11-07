import React from 'react'
import { useTranslation } from 'react-i18next'
import useUiLegendStore from '@/store/uiLegend'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'

import InfoIcon from '@/components/icons/info.svg?react'
import ZoomInfo from '../zoomInfo'
import CameraConfig from '../cameraConfig'
import LanguageSwitch from '@/components/languageSwitch'
import HelpModal from './helpModal'

const HelpArea: React.FC = () => {
  const { t } = useTranslation()
  const showLabel = useUiLegendStore((s) => s.legendOpen)
  const narrowPortrait = useNarrowPortrait()

  return (
    <>
      {/*
        Narrow portrait: language/help/zoom/camera live on the right chrome rail.
        Landscape/desktop: bottom-left (or top-left in landscape) capsule.
      */}
      {!narrowPortrait && (
        <div className="z-[4] fixed bottom-3 left-3 flex flex-row items-center justify-center gap-0.5 rounded-full bg-[#eef1ff] px-2 py-1.5 landscape:bottom-auto landscape:left-14 landscape:top-3">
          <LanguageSwitch />
          <button
            type="button"
            className={`flex items-center gap-1 rounded-full bg-white px-0.5 py-0.5 hover:opacity-70 ${
              showLabel ? 'pr-1.5' : ''
            }`}
            title={showLabel ? undefined : String(t('operate.help'))}
            aria-label={String(t('operate.help'))}
            onClick={() => {
              ;(
                document.getElementById('help-modal') as HTMLDialogElement
              ).showModal()
            }}
          >
            <InfoIcon className="rounded-full" />
            {showLabel && (
              <span className="pr-1 text-[11px] font-medium text-slate-700">
                {t('operate.help')}
              </span>
            )}
          </button>
          <ZoomInfo showLabel={showLabel} />
          <CameraConfig showLabel={showLabel} />
        </div>
      )}

      <HelpModal />
    </>
  )
}

export default HelpArea
