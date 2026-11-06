import type { IFile } from '@/store/files'
import { cloudFetch } from '@/core/sync/cloudRequest'
import { getMySyncCode } from '@/core/widget/widgetSync'

export interface CloudBoardMeta {
  id: string
  title: string
  updatedAt: number
  thumbnail?: string
  contentRevision?: number
  size?: number
}

export const listCloudBoards = async (
  code: string
): Promise<{ metas: CloudBoardMeta[]; updatedAt: number }> => {
  const data = (await cloudFetch('/api/boards/sync', {
    method: 'GET',
    syncCode: code
  })) as { metas?: CloudBoardMeta[]; updatedAt?: number }
  return {
    metas: Array.isArray(data.metas) ? data.metas : [],
    updatedAt: Number(data.updatedAt) || 0
  }
}

export const fetchCloudBoard = async (
  code: string,
  id: string
): Promise<IFile> => {
  const board = (await cloudFetch(
    `/api/boards/sync/item?id=${encodeURIComponent(id)}`,
    { method: 'GET', syncCode: code }
  )) as IFile
  if (!board?.id) {
    throw new Error('not_found')
  }
  return board
}

export const upsertCloudBoard = async (board: IFile, thumbnail?: string) => {
  const code = getMySyncCode()
  const body = {
    ...board,
    ...(thumbnail ? { thumbnail } : {})
  }
  await cloudFetch('/api/boards/sync/item', {
    method: 'PUT',
    syncCode: code,
    body
  })
}

export const deleteCloudBoards = async (ids: string[]) => {
  const code = getMySyncCode()
  await cloudFetch('/api/boards/sync/items', {
    method: 'DELETE',
    syncCode: code,
    body: { ids }
  })
}
