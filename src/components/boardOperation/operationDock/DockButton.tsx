import { FC, ReactNode } from 'react'

interface IProps {
  label: string
  showLabel: boolean
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  children: ReactNode
  as?: 'button' | 'div' | 'label'
  htmlFor?: string
  className?: string
  /** Phone vertical rail vs desktop bottom bar. */
  layout?: 'rail' | 'bar'
}

const DockButton: FC<IProps> = ({
  label,
  showLabel,
  active = false,
  disabled = false,
  onClick,
  children,
  as = 'button',
  htmlFor,
  className = '',
  layout = 'bar'
}) => {
  const rail = layout === 'rail'
  const base = `flex shrink-0 items-center justify-center rounded-lg transition-colors ${
    disabled
      ? 'cursor-not-allowed opacity-40'
      : 'cursor-pointer hover:bg-slate-200'
  } ${active ? 'bg-[#66CC8A]/25 text-[#2d8f55]' : 'text-slate-700'} ${
    rail
      ? `w-full flex-col gap-0.5 px-0.5 ${showLabel ? 'py-1.5' : 'py-2'}`
      : // Bottom bar: icon+label row when open; compact icon-only when collapsed.
      showLabel
      ? 'flex-row gap-1 px-1.5 py-1.5'
      : 'flex-row px-1 py-1'
  } ${className}`

  const content = (
    <>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#66CC8A] [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {children}
      </span>
      {showLabel && (
        <span
          className={
            rail
              ? 'w-full px-0.5 text-center text-[9px] font-medium leading-[1.1] text-slate-700 line-clamp-2'
              : 'shrink-0 whitespace-nowrap text-[11px] font-medium leading-tight text-slate-700'
          }
        >
          {label}
        </span>
      )}
    </>
  )

  const tip = showLabel ? undefined : label

  if (as === 'label') {
    return (
      <label htmlFor={htmlFor} className={base} aria-label={label} title={tip}>
        {content}
      </label>
    )
  }

  if (as === 'div') {
    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={base}
        aria-label={label}
        aria-disabled={disabled || undefined}
        title={tip}
        onClick={disabled ? undefined : onClick}
        onKeyDown={(event) => {
          if (disabled) {
            return
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick?.()
          }
        }}
      >
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      className={base}
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={disabled}
      title={tip}
      onClick={onClick}
    >
      {content}
    </button>
  )
}

export default DockButton
