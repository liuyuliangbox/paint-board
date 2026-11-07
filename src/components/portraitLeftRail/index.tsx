import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import useUiLegendStore from '@/store/uiLegend'
import useUiOverlayStore from '@/store/uiOverlay'
import useOperationChromeBridge from '@/store/operationChromeBridge'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'
import ChromeActions from '@/components/boardOperation/operationChrome/ChromeActions'
import LanguageSwitch from '@/components/languageSwitch'
import ZoomInfo from '@/components/zoomInfo'
import CameraConfig from '@/components/cameraConfig'
import InfoIcon from '@/components/icons/info.svg?react'

/**
 * Portrait long right edge: workspace chrome + help cluster.
 * Ops dock sits on the left; draw toggle stays top-left (ToolPanel).
 * Hidden while layers/boards/widgets cover this side; stays for tools
 * (tools open from the left and clear this rail).
 */
const PortraitLeftRail: FC = () => {
  const { t } = useTranslation()
  const showLabel = useUiLegendStore((s) => s.legendOpen)
  const chromeBridge = useOperationChromeBridge((s) => s.bridge)
  const narrowPortrait = useNarrowPortrait()
  const overlayActive = useUiOverlayStore((s) => s.active)

  if (!narrowPortrait) {
    return null
  }
  // Layers / boards / widgets cover the right chrome; tools clears it so keep it.
  if (
    overlayActive === 'layers' ||
    overlayActive === 'boards' ||
    overlayActive === 'widgets'
  ) {
    return null
  }

  return (
    <div className="pointer-events-none fixed right-1.5 top-1/2 z-[var(--pb-z-chrome)] flex max-h-[min(70vh,32rem)] -translate-y-1/2 flex-col">
      <div className="pointer-events-auto flex max-h-full flex-col items-center gap-0.5 overflow-y-auto noScrollbar rounded-2xl border border-slate-200/80 bg-[#eef1ff]/95 px-1 py-1.5 shadow-md backdrop-blur">
        {chromeBridge && (
          <>
            <ChromeActions bridge={chromeBridge} layout="col" />
            <div className="my-0.5 h-px w-6 shrink-0 bg-slate-200/80" />
          </>
        )}
        <LanguageSwitch rail />
        <button
          type="button"
          className="flex w-full flex-col items-center gap-0.5 rounded-full bg-white px-0.5 py-1 hover:opacity-70"
          title={showLabel ? undefined : String(t('operate.help'))}
          aria-label={String(t('operate.help'))}
          onClick={() => {
            ;(
              document.getElementById('help-modal') as HTMLDialogElement
            ).showModal()
          }}
        >
          <InfoIcon className="h-7 w-7 shrink-0 rounded-full" />
          {showLabel && (
            <span className="max-w-[2.75rem] truncate text-center text-[9px] font-medium leading-tight text-slate-700">
              {t('operate.help')}
            </span>
          )}
        </button>
        <ZoomInfo showLabel={showLabel} rail />
        <CameraConfig showLabel={showLabel} rail />
      </div>
    </div>
  )
}

export default PortraitLeftRail
