import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Tags } from 'lucide-react'
import useUiLegendStore from '@/store/uiLegend'
import useUiOverlayStore from '@/store/uiOverlay'
import { useNarrowPortrait } from '@/hooks/useNarrowPortrait'

/**
 * Global one-tap labels switch for every viewport:
 * icon-only vs text under/beside chrome, dock, draw toggle, help, etc.
 * Narrow portrait: bottom-center (hidden while a primary panel is open).
 * Other layouts: bottom-right.
 */
const UiLegendToggle: FC = () => {
  const { t } = useTranslation()
  const legendOpen = useUiLegendStore((s) => s.legendOpen)
  const toggleLegend = useUiLegendStore((s) => s.toggleLegend)
  const narrowPortrait = useNarrowPortrait()
  const overlayActive = useUiOverlayStore((s) => s.active)
  const label = String(
    t(legendOpen ? 'operate.collapseLegend' : 'operate.expandLegend')
  )

  if (narrowPortrait && overlayActive !== 'none') {
    return null
  }

  return (
    <div
      className={`pointer-events-none fixed z-[var(--pb-z-chrome)] ${
        narrowPortrait
          ? 'bottom-3 left-1/2 -translate-x-1/2'
          : 'bottom-3 right-3 landscape:right-3'
      }`}
    >
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-pressed={legendOpen}
        onClick={toggleLegend}
        className={`pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200/80 px-2.5 py-1.5 text-xs font-medium shadow-md backdrop-blur transition-colors ${
          legendOpen
            ? 'bg-[#66CC8A]/25 text-[#2d8f55]'
            : 'bg-[#eef1ff]/95 text-slate-700 hover:bg-slate-200/80'
        }`}
      >
        <Tags className="h-4 w-4 shrink-0 text-[#66CC8A]" strokeWidth={2} />
        <span className="max-w-[5rem] truncate whitespace-nowrap landscape:max-w-none">
          {label}
        </span>
      </button>
    </div>
  )
}

export default UiLegendToggle
