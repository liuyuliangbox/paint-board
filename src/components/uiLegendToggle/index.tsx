import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Tags } from 'lucide-react'
import useUiLegendStore from '@/store/uiLegend'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'

/**
 * Global labels switch. Narrow portrait uses PortraitBottomChrome instead
 * (help + legend on the short bottom edge).
 */
const UiLegendToggle: FC = () => {
  const { t } = useTranslation()
  const legendOpen = useUiLegendStore((s) => s.legendOpen)
  const toggleLegend = useUiLegendStore((s) => s.toggleLegend)
  const narrowPortrait = useNarrowPortrait()
  const label = String(
    t(legendOpen ? 'operate.collapseLegend' : 'operate.expandLegend')
  )

  if (narrowPortrait) {
    return null
  }

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-[13] xs:right-[3.75rem] landscape:right-3">
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={legendOpen}
        onClick={toggleLegend}
        className={`pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200/80 px-2 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors ${
          legendOpen
            ? 'bg-[#66CC8A]/25 text-[#2d8f55]'
            : 'bg-[#eef1ff]/95 text-slate-700 hover:bg-slate-200/80'
        }`}
      >
        <Tags className="h-4 w-4 shrink-0 text-[#66CC8A]" strokeWidth={2} />
        <span className="max-w-[4.5rem] truncate whitespace-nowrap landscape:max-w-none">
          {label}
        </span>
      </button>
    </div>
  )
}

export default UiLegendToggle
