import { authHeaders } from '@/core/auth/cloudAuth'
import { getWidgetSyncBaseUrl, isValidSyncCode } from '@/core/widget/widgetSync'

export const cloudBaseUrl = () => {
  const base = getWidgetSyncBaseUrl()
  if (!base) {
    throw new Error('sync_not_configured')
  }
  return base
}

export const cloudFetch = async (
  path: string,
  init: {
    method?: string
    syncCode?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
) => {
  const headers: Record<string, string> = {
    ...authHeaders(init.headers)
  }
  if (init.syncCode) {
    if (!isValidSyncCode(init.syncCode)) {
      throw new Error('invalid_sync_code')
    }
    headers['X-Sync-Code'] = init.syncCode.trim()
  }
  if (init.body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  const response = await fetch(`${cloudBaseUrl()}${path}`, {
    method: init.method || (init.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined
  })
  if (!response.ok) {
    let detail = ''
    try {
      const data = (await response.json()) as { error?: string }
      detail = data.error || ''
    } catch {
      // ignore
    }
    if (response.status === 401) {
      throw new Error('unauthorized')
    }
    throw new Error(detail || `http_${response.status}`)
  }
  const text = await response.text()
  if (!text) {
    return null
  }
  return JSON.parse(text) as unknown
}
