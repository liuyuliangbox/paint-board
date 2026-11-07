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
    <div className="toast toast-top toast-center z-[100]">
      <div className={`alert alert-${type} max-w-[min(94vw,36rem)]`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-left">{t(message)}</span>
          {actionLabel && onAction && (
            <button
              type="button"
              className="btn btn-sm btn-neutral shrink-0"
              disabled={actionBusy}
              onClick={onAction}
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
