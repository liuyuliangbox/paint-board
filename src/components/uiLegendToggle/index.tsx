import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Tags } from 'lucide-react'
import useUiLegendStore from '@/store/uiLegend'
import useUiOverlayStore from '@/store/uiOverlay'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'

/**
 * Global chrome prefs: labels on/off, and one-tap hide-all for screenshots.
 * When chrome is hidden, only the restore control stays visible.
 */
const UiLegendToggle: FC = () => {
  const { t } = useTranslation()
  const legendOpen = useUiLegendStore((s) => s.legendOpen)
  const toggleLegend = useUiLegendStore((s) => s.toggleLegend)
  const chromeHidden = useUiLegendStore((s) => s.chromeHidden)
  const toggleChromeHidden = useUiLegendStore((s) => s.toggleChromeHidden)
  const narrowPortrait = useNarrowPortrait()
  const overlayActive = useUiOverlayStore((s) => s.active)

  const legendLabel = String(
    t(legendOpen ? 'operate.collapseLegend' : 'operate.expandLegend')
  )
  const chromeLabel = String(
    t(chromeHidden ? 'operate.showChrome' : 'operate.hideChrome')
  )

  if (!chromeHidden && narrowPortrait && overlayActive !== 'none') {
    return null
  }

  const zClass = chromeHidden
    ? 'z-[var(--pb-z-focus)]'
    : 'z-[var(--pb-z-chrome)]'
  const btnClass = (active: boolean) =>
    `pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors ${
      active
        ? 'bg-[#66CC8A]/25 text-[#2d8f55]'
        : 'bg-[#eef1ff]/95 text-slate-700 hover:bg-slate-200/80'
    }`

  // Narrow portrait: both centered under the dock.
  // Landscape / desktop: hide-UI bottom-left, legend bottom-right — avoid
  // stacking on one side where they collide with the centered dock.
  if (narrowPortrait) {
    return (
      <div
        className={`pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 ${zClass}`}
      >
        <div className="pointer-events-auto flex items-center gap-1.5">
          {!chromeHidden && (
            <button
              type="button"
              title={legendLabel}
              aria-label={legendLabel}
              aria-pressed={legendOpen}
              onClick={toggleLegend}
              className={btnClass(legendOpen)}
            >
              <Tags
                className="h-4 w-4 shrink-0 text-[#66CC8A]"
                strokeWidth={2}
              />
              <span className="max-w-[5rem] truncate whitespace-nowrap">
                {legendLabel}
              </span>
            </button>
          )}
          <button
            type="button"
            title={chromeLabel}
            aria-label={chromeLabel}
            aria-pressed={chromeHidden}
            onClick={toggleChromeHidden}
            className={btnClass(chromeHidden)}
          >
            {chromeHidden ? (
              <Eye
                className="h-4 w-4 shrink-0 text-[#66CC8A]"
                strokeWidth={2}
              />
            ) : (
              <EyeOff
                className="h-4 w-4 shrink-0 text-[#66CC8A]"
                strokeWidth={2}
              />
            )}
            <span className="max-w-[5rem] truncate whitespace-nowrap">
              {chromeLabel}
            </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`pointer-events-none fixed bottom-3 left-3 ${zClass}`}>
        <button
          type="button"
          title={chromeLabel}
          aria-label={chromeLabel}
          aria-pressed={chromeHidden}
          onClick={toggleChromeHidden}
          className={btnClass(chromeHidden)}
        >
          {chromeHidden ? (
            <Eye className="h-4 w-4 shrink-0 text-[#66CC8A]" strokeWidth={2} />
          ) : (
            <EyeOff
              className="h-4 w-4 shrink-0 text-[#66CC8A]"
              strokeWidth={2}
            />
          )}
          <span className="max-w-[5rem] truncate whitespace-nowrap landscape:max-w-none">
            {chromeLabel}
          </span>
        </button>
      </div>
      {!chromeHidden && (
        <div className={`pointer-events-none fixed bottom-3 right-3 ${zClass}`}>
          <button
            type="button"
            title={legendLabel}
            aria-label={legendLabel}
            aria-pressed={legendOpen}
            onClick={toggleLegend}
            className={btnClass(legendOpen)}
          >
            <Tags className="h-4 w-4 shrink-0 text-[#66CC8A]" strokeWidth={2} />
            <span className="max-w-[5rem] truncate whitespace-nowrap landscape:max-w-none">
              {legendLabel}
            </span>
          </button>
        </div>
      )}
    </>
  )
}

export default UiLegendToggle
