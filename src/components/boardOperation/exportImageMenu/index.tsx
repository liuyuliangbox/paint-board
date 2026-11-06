import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Save } from 'lucide-react'
import { ExportScope } from '@/core/export/exportCanvasImage'
import { placeMenu } from './placeMenu'

interface IProps {
  hasSelection: boolean
  onExport: (scope: ExportScope) => void
  onExportBoard: () => void
  /** When true, show function name next to the icon (dock legend mode). */
  showLabel?: boolean
  /** Phone vertical rail vs desktop bottom bar. */
  layout?: 'rail' | 'bar'
  label?: string
}

const HOVER_CLOSE_DELAY = 200

const ExportImageMenu = ({
  hasSelection,
  onExport,
  onExportBoard,
  showLabel = false,
  layout = 'bar',
  label
}: IProps) => {
  const { t } = useTranslation()
  const buttonLabel = label || t('operate.save')
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const canHover = useRef(
    window.matchMedia('(hover: hover) and (pointer: fine)').matches
  )

  const clearCloseTimer = () => {
    if (closeTimer.current !== undefined) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = undefined
    }
  }

  const openMenu = () => {
    clearCloseTimer()
    setOpen(true)
  }

  const scheduleClose = () => {
    if (!canHover.current) {
      return
    }
    clearCloseTimer()
    closeTimer.current = window.setTimeout(() => {
      setOpen(false)
    }, HOVER_CLOSE_DELAY)
  }

  useEffect(() => () => clearCloseTimer(), [])

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }
    const place = () => {
      const anchor = anchorRef.current
      const menu = menuRef.current
      if (!anchor || !menu) {
        return
      }
      const anchorRect = anchor.getBoundingClientRect()
      const menuRect = menu.getBoundingClientRect()
      setPosition(
        placeMenu(
          {
            left: anchorRect.left,
            top: anchorRect.top,
            width: anchorRect.width,
            height: anchorRect.height
          },
          { width: menuRect.width, height: menuRect.height },
          { width: window.innerWidth, height: window.innerHeight }
        )
      )
    }
    place()
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      document.removeEventListener('scroll', place, true)
    }
  }, [open, hasSelection])

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }
      if (
        anchorRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const choose = (scope: ExportScope) => {
    clearCloseTimer()
    setOpen(false)
    onExport(scope)
  }

  const exportBoard = () => {
    clearCloseTimer()
    setOpen(false)
    onExportBoard()
  }

  const options: Array<{ scope: ExportScope; label: string }> = [
    { scope: 'viewport', label: t('exportImage.viewport') },
    { scope: 'content', label: t('exportImage.content') }
  ]
  if (hasSelection) {
    options.push({ scope: 'selection', label: t('exportImage.selection') })
  }

  return (
    <>
      <div
        ref={anchorRef}
        role="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={buttonLabel || undefined}
        title={showLabel ? undefined : buttonLabel || undefined}
        className={`flex shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-slate-200 ${
          layout === 'rail'
            ? `w-full flex-col gap-0.5 px-0.5 ${showLabel ? 'py-1.5' : 'py-2'}`
            : 'flex-row gap-1 px-1.5 py-1.5'
        } ${open ? 'bg-slate-200/80' : ''}`}
        onMouseEnter={() => {
          if (canHover.current) {
            openMenu()
          }
        }}
        onMouseLeave={scheduleClose}
        onClick={() => {
          if (canHover.current) {
            openMenu()
            return
          }
          setOpen((value) => !value)
        }}
      >
        <Save strokeWidth={2} color="#66CC8A" size={18} />
        {showLabel && (
          <span
            className={
              layout === 'rail'
                ? 'w-full px-0.5 text-center text-[9px] font-medium leading-[1.1] text-slate-700 line-clamp-2'
                : 'shrink-0 whitespace-nowrap text-[11px] font-medium leading-tight text-slate-700'
            }
          >
            {buttonLabel}
          </span>
        )}
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[20] rounded-xl bg-[#eef1ff] p-1 shadow-xl"
            style={
              position
                ? { top: position.top, left: position.left }
                : { top: 0, left: -9999, visibility: 'hidden' }
            }
            onMouseEnter={() => {
              if (canHover.current) {
                openMenu()
              }
            }}
            onMouseLeave={scheduleClose}
          >
            {options.map((option) => (
              <button
                key={option.scope}
                type="button"
                role="menuitem"
                className="block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-200"
                onClick={() => choose(option.scope)}
              >
                {option.label}
              </button>
            ))}
            <div className="mx-2 my-1 h-px bg-slate-200" />
            <button
              type="button"
              role="menuitem"
              className="block w-full whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-200"
              onClick={exportBoard}
            >
              {t('exportImage.board')}
            </button>
          </div>,
          document.body
        )}
    </>
  )
}

export default ExportImageMenu
