import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Tags } from 'lucide-react'
import useUiLegendStore from '@/store/uiLegend'

/**
 * Global labels switch — bottom-right, clear of the portrait rail.
 * Collapsed: icon + short word; open: full “hide labels” text.
 */
const UiLegendToggle: FC = () => {
  const { t } = useTranslation()
  const legendOpen = useUiLegendStore((s) => s.legendOpen)
  const toggleLegend = useUiLegendStore((s) => s.toggleLegend)
  const label = String(
    t(legendOpen ? 'operate.collapseLegend' : 'operate.expandLegend')
  )

  return (
    <div
      className={`pointer-events-none fixed bottom-3 z-[13] right-3 xs:right-[3.75rem] landscape:right-3 ${
        legendOpen ? 'xs:right-[5rem]' : 'xs:right-[3.75rem]'
      }`}
    >
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
        <span className="max-w-[4.5rem] truncate whitespace-nowrap xs:max-w-[3.25rem] landscape:max-w-none">
          {label}
        </span>
      </button>
    </div>
  )
}

export default UiLegendToggle
