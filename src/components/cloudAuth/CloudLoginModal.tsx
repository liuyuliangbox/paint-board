import { FC, FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cloudLoginAndNotify } from '@/core/auth/cloudAuth'
import { isWidgetSyncConfigured } from '@/core/widget/widgetSync'

interface IProps {
  onClose: () => void
  onSuccess?: () => void
}

const CloudLoginModal: FC<IProps> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!isWidgetSyncConfigured()) {
      setError('cloudAuth.notConfigured')
      return
    }
    setBusy(true)
    setError('')
    try {
      await cloudLoginAndNotify(username.trim(), password)
      onSuccess?.()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message === 'invalid_credentials') {
        setError('cloudAuth.invalidCredentials')
      } else if (message === 'sync_not_configured') {
        setError('cloudAuth.notConfigured')
      } else {
        setError('cloudAuth.failed')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal modal-open z-[90]">
      <div className="modal-box max-w-sm">
        <h3 className="font-fredokaOne text-xl">{t('cloudAuth.title')}</h3>
        <p className="mt-1 text-sm text-slate-500">{t('cloudAuth.hint')}</p>
        <form className="mt-4 flex flex-col gap-3" onSubmit={onSubmit}>
          <label className="form-control w-full">
            <span className="label-text text-sm">
              {t('cloudAuth.username')}
            </span>
            <input
              className="input input-bordered input-sm w-full"
              autoComplete="username"
              value={username}
              disabled={busy}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text text-sm">
              {t('cloudAuth.password')}
            </span>
            <input
              type="password"
              className="input input-bordered input-sm w-full"
              autoComplete="current-password"
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-error">{t(error)}</p>}
          <div className="modal-action mt-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={onClose}
            >
              {t('cloudAuth.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={busy || !username.trim() || !password}
            >
              {busy ? t('cloudAuth.busy') : t('cloudAuth.login')}
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </div>
  )
}

export default CloudLoginModal
