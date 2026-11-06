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
  className = ''
}) => {
  const base = `flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1.5 transition-colors ${
    disabled
      ? 'cursor-not-allowed opacity-40'
      : 'cursor-pointer hover:bg-slate-200'
  } ${active ? 'bg-[#66CC8A]/25 text-[#2d8f55]' : 'text-slate-700'} ${
    showLabel ? 'min-w-0' : ''
  } ${className}`

  const content = (
    <>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[#66CC8A] [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {children}
      </span>
      {showLabel && (
        <span className="max-w-[5.5rem] truncate whitespace-normal text-center text-[10px] font-medium leading-tight text-slate-700 xs:text-left">
          {label}
        </span>
      )}
    </>
  )

  if (as === 'label') {
    return (
      <label
        htmlFor={htmlFor}
        className={base}
        aria-label={label}
        title={label}
      >
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
        title={label}
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
      title={label}
      onClick={onClick}
    >
      {content}
    </button>
  )
}

export default DockButton
