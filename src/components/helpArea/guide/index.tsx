import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useHelpSurfaces } from '@/hooks/useHelpSurfaces'

/**
 * Viewport-aware how-to for the current chrome (rails / dock / panels),
 * aligned with the UI audit — not the old bottom-bar encyclopedia.
 */
const HelpGuide: FC = () => {
  const { t } = useTranslation()
  const { narrowPortrait, isMobile, showTouch, showPointer } =
    useHelpSurfaces()

  return (
    <div className="pb-10">
      <p className="mt-4 rounded-xl bg-[#eef1ff] px-3 py-2 text-sm text-slate-600">
        {narrowPortrait
          ? t('helpInfo.guide.layoutBannerPortrait')
          : t('helpInfo.guide.layoutBannerDesktop')}
      </p>

      <div className="my-4 text-xl font-bold">
        {t('helpInfo.guide.layoutTitle')}
      </div>
      <ul className="list-disc space-y-1 pl-10 text-sm leading-6">
        {narrowPortrait ? (
          <>
            <li>{t('helpInfo.guide.portraitOps')}</li>
            <li>{t('helpInfo.guide.portraitChrome')}</li>
            <li>{t('helpInfo.guide.portraitDraw')}</li>
            <li>{t('helpInfo.guide.portraitLegend')}</li>
          </>
        ) : (
          <>
            <li>{t('helpInfo.guide.desktopOps')}</li>
            <li>{t('helpInfo.guide.desktopChrome')}</li>
            <li>{t('helpInfo.guide.desktopDraw')}</li>
            <li>{t('helpInfo.guide.desktopLegend')}</li>
            <li>{t('helpInfo.guide.desktopHelp')}</li>
          </>
        )}
      </ul>

      <div className="my-4 text-xl font-bold">
        {t('helpInfo.guide.panelsTitle')}
      </div>
      <ul className="list-disc space-y-1 pl-10 text-sm leading-6">
        <li>{t('helpInfo.guide.panelTools')}</li>
        <li>{t('helpInfo.guide.panelLayers')}</li>
        <li>{t('helpInfo.guide.panelBoards')}</li>
        <li>{t('helpInfo.guide.panelWidgets')}</li>
        <li>{t('helpInfo.guide.panelDim')}</li>
        {narrowPortrait && <li>{t('helpInfo.guide.panelMutex')}</li>}
      </ul>

      <div className="my-4 text-xl font-bold">
        {t('helpInfo.guide.drawingTitle')}
      </div>
      <ul className="list-disc space-y-1 pl-10 text-sm leading-6">
        <li>{t('helpInfo.guide.drawingModes')}</li>
        <li>{t('helpInfo.guide.drawingBrushes')}</li>
        {showPointer && <li>{t('helpInfo.guide.drawingScroll')}</li>}
        {showTouch && <li>{t('helpInfo.guide.drawingCols')}</li>}
        {showPointer && <li>{t('helpInfo.guide.drawingKeys')}</li>}
      </ul>

      <div className="my-4 text-xl font-bold">
        {t('helpInfo.guide.capabilitiesTitle')}
      </div>
      <ul className="list-disc space-y-1 pl-10 text-sm leading-6">
        {isMobile ? (
          <>
            <li>{t('helpInfo.guide.capOrientation')}</li>
            <li>{t('helpInfo.guide.capFullscreen')}</li>
          </>
        ) : (
          <li>{t('helpInfo.guide.capDesktopNoOrientation')}</li>
        )}
        {showTouch && <li>{t('helpInfo.guide.capGestures')}</li>}
        {showPointer && <li>{t('helpInfo.guide.capMouse')}</li>}
        <li>{t('helpInfo.guide.capLegend')}</li>
      </ul>
    </div>
  )
}

export default HelpGuide
