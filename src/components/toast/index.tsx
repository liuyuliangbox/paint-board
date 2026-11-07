import { FC, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface IProps {
  type?: 'error' | 'success' | 'warning' | 'info'
  message: string
  /** Optional translated hint lines (shown under the summary). */
  hints?: string[]
  /** Optional technical dump (diagnosis lines). */
  detail?: string
  /** Optional action button (e.g. clear corrupt storage). */
  actionLabel?: string
  onAction?: () => void
  actionBusy?: boolean
}

const Toast: FC<IProps> = ({
  message,
  type = 'success',
  hints,
  detail,
  actionLabel,
  onAction,
  actionBusy = false
}) => {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copyDetail = async () => {
    if (!detail) {
      return
    }
    try {
      await navigator.clipboard.writeText(detail)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="pointer-events-none toast toast-top toast-center z-[200] w-[min(94vw,36rem)] max-w-[min(94vw,36rem)]">
      <div
        className={`pointer-events-auto alert alert-${type} w-full max-w-full items-start overflow-visible shadow-lg`}
      >
        <div className="flex w-full min-w-0 flex-col gap-2">
          <span className="block w-full whitespace-normal break-words text-left text-sm leading-snug">
            {t(message)}
          </span>
          {hints && hints.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-4 text-left text-xs leading-snug opacity-90">
              {hints.map((hint) => (
                <li key={hint}>{t(hint)}</li>
              ))}
            </ul>
          )}
          {detail && (
            <details className="rounded-lg bg-black/5 px-2 py-1 text-left">
              <summary className="cursor-pointer text-xs font-medium">
                {t('tip.hydrateDiag.technicalDetails')}
              </summary>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-snug opacity-90">
                {detail}
              </pre>
              <button
                type="button"
                className="btn btn-ghost btn-xs mt-1"
                onClick={(event) => {
                  event.preventDefault()
                  void copyDetail()
                }}
              >
                {copied
                  ? t('tip.hydrateDiag.copied')
                  : t('tip.hydrateDiag.copyDetails')}
              </button>
            </details>
          )}
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
