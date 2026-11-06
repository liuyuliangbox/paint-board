import { getWidgetSyncBaseUrl } from '@/core/widget/widgetSync'

export const CLOUD_TOKEN_KEY = 'PAINT-BOARD-CLOUD-TOKEN'

export const getCloudToken = (): string => {
  try {
    return (sessionStorage.getItem(CLOUD_TOKEN_KEY) || '').trim()
  } catch {
    return ''
  }
}

export const setCloudToken = (token: string) => {
  sessionStorage.setItem(CLOUD_TOKEN_KEY, token.trim())
}

export const clearCloudToken = () => {
  try {
    sessionStorage.removeItem(CLOUD_TOKEN_KEY)
  } catch {
    // ignore
  }
}

export const isCloudLoggedIn = () => Boolean(getCloudToken())

export const cloudLogin = async (
  username: string,
  password: string
): Promise<void> => {
  const base = getWidgetSyncBaseUrl()
  if (!base) {
    throw new Error('sync_not_configured')
  }
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  if (!response.ok) {
    let detail = ''
    try {
      const data = (await response.json()) as { error?: string }
      detail = data.error || ''
    } catch {
      // ignore
    }
    throw new Error(detail || `http_${response.status}`)
  }
  const data = (await response.json()) as { token?: string }
  if (!data.token) {
    throw new Error('invalid_login_response')
  }
  setCloudToken(data.token)
}

export const authHeaders = (
  extra?: Record<string, string>
): Record<string, string> => {
  const token = getCloudToken()
  if (!token) {
    throw new Error('unauthorized')
  }
  return {
    Authorization: `Bearer ${token}`,
    ...(extra || {})
  }
}

type CloudAuthListener = () => void
const listeners = new Set<CloudAuthListener>()

export const subscribeCloudAuth = (listener: CloudAuthListener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const notifyCloudAuthChanged = () => {
  listeners.forEach((listener) => listener())
}

export const cloudLogout = () => {
  clearCloudToken()
  notifyCloudAuthChanged()
}

export const cloudLoginAndNotify = async (
  username: string,
  password: string
) => {
  await cloudLogin(username, password)
  notifyCloudAuthChanged()
}
