import { FC, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import useBoardStore from '@/store/board'
import useUiLegendStore from '@/store/uiLegend'
import { languageList } from '@/components/helpArea/helpModal/constants'
import TranslateIcon from '@/components/icons/translate.svg?react'

/** Menu stores `zh-tw`; i18n resource key is `zh-TW`. */
const toI18nLng = (value: string) => (value === 'zh-tw' ? 'zh-TW' : value)

const sameLang = (a: string, b: string) =>
  toI18nLng(a).toLowerCase() === toI18nLng(b).toLowerCase()

interface LanguageSwitchProps {
  /** Portrait right chrome rail: compact vertical control, menu opens left. */
  rail?: boolean
}

/**
 * Language control — embed in help capsule or portrait left rail.
 */
const LanguageSwitch: FC<LanguageSwitchProps> = ({ rail = false }) => {
  const { t, i18n } = useTranslation()
  const language = useBoardStore((s) => s.language)
  const updateLanguage = useBoardStore((s) => s.updateLanguage)
  const showLabel = useUiLegendStore((s) => s.legendOpen)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const current =
    languageList.find((item) => sameLang(item.value, language)) ??
    languageList[0]
  const aria = String(t('operate.language'))

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const apply = (value: string) => {
    void i18n.changeLanguage(toI18nLng(value))
    updateLanguage(value)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={`relative ${rail ? 'w-full overflow-visible' : ''}`}
    >
      <button
        type="button"
        title={showLabel ? undefined : aria}
        aria-label={aria}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center rounded-full bg-white hover:opacity-70 ${
          rail
            ? `w-full flex-col gap-0.5 px-0.5 py-1 ${
                open ? 'ring-1 ring-[#66CC8A]/50' : ''
              }`
            : `gap-1 px-0.5 py-0.5 ${showLabel ? 'pr-1.5' : ''} ${
                open ? 'ring-1 ring-[#66CC8A]/50' : ''
              }`
        }`}
      >
        <TranslateIcon className="h-7 w-7 shrink-0 rounded-full p-1 text-[#66CC8A]" />
        {showLabel && (
          <span
            className={
              rail
                ? 'max-w-[2.75rem] truncate text-center text-[9px] font-medium leading-tight text-slate-700'
                : 'pr-1 text-[11px] font-medium text-slate-700'
            }
          >
            {current.name}
          </span>
        )}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={aria}
          className={
            rail
              ? // Right-edge rail: open left so the menu stays on-screen.
                'absolute right-full top-0 z-[var(--pb-z-focus)] mr-2 min-w-[9.5rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-[#eef1ff] py-1 shadow-lg'
              : 'absolute bottom-full left-0 z-[var(--pb-z-focus)] mb-2 min-w-[9.5rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-[#eef1ff] py-1 shadow-lg landscape:bottom-auto landscape:top-full landscape:mb-0 landscape:mt-2'
          }
        >
          {languageList.map((item) => {
            const active = sameLang(item.value, language)
            return (
              <li key={item.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`flex w-full px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#66CC8A]/25 text-[#2d8f55]'
                      : 'text-slate-700 hover:bg-slate-200/80'
                  }`}
                  onClick={() => apply(item.value)}
                >
                  {item.name}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default LanguageSwitch
