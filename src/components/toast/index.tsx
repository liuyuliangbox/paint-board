import { FC } from 'react'
import { useTranslation } from 'react-i18next'

interface IProps {
  type?: 'error' | 'success' | 'warning' | 'info'
  message: string
  /** Optional action button (e.g. clear corrupt storage). */
  actionLabel?: string
  onAction?: () => void
  actionBusy?: boolean
}

const Toast: FC<IProps> = ({
  message,
  type = 'success',
  actionLabel,
  onAction,
  actionBusy = false
}) => {
  const { t } = useTranslation()

  return (
    <div className="pointer-events-none toast toast-top toast-center z-[200] w-[min(94vw,36rem)] max-w-[min(94vw,36rem)]">
      <div
        className={`pointer-events-auto alert alert-${type} w-full max-w-full items-start overflow-visible shadow-lg`}
      >
        <div className="flex w-full min-w-0 flex-col gap-2">
          <span className="block w-full whitespace-normal break-words text-left text-sm leading-snug">
            {t(message)}
          </span>
          {actionLabel && onAction && (
            <button
              type="button"
              className="btn btn-sm btn-neutral self-end shrink-0"
              disabled={actionBusy}
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (!actionBusy) {
                  onAction()
                }
              }}
            >
              {actionBusy ? '…' : t(actionLabel)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Toast
