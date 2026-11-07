import React from 'react'

import InfoIcon from '@/components/icons/info.svg?react'
import ZoomInfo from '../zoomInfo'
import CameraConfig from '../cameraConfig'
import HelpModal from './helpModal'

const HelpArea: React.FC = () => {
  return (
    <>
      {/*
        Portrait: bottom-left, clear of the side rail.
        Landscape: top-left beside the tool-panel toggle so it does not crowd the dock.
      */}
      <div className="z-[4] fixed bottom-5 left-5 flex flex-row items-center justify-center rounded-full bg-[#eef1ff] px-2.5 py-1.5 landscape:bottom-auto landscape:left-14 landscape:top-3">
        <InfoIcon
          className="cursor-pointer rounded-full bg-white hover:opacity-70"
          onClick={() => {
            ;(
              document.getElementById('help-modal') as HTMLDialogElement
            ).showModal()
          }}
        />
        <ZoomInfo />
        <CameraConfig />
      </div>

      <HelpModal />
    </>
  )
}

export default HelpArea
