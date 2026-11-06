import { v4 as uuidv4 } from 'uuid'
import { fabric } from 'fabric'

export const PAINT_LINK_ID_KEY = '_paintLinkId'

export type LinkedObject = fabric.Object & {
  _paintLinkId?: string
}

export const getPaintLinkId = (object: fabric.Object) => {
  const value = (object as LinkedObject)._paintLinkId
  return typeof value === 'string' && value ? value : ''
}

export const setPaintLinkId = (
  object: fabric.Object,
  linkId: string | null
) => {
  if (!linkId) {
    delete (object as LinkedObject)._paintLinkId
    return
  }
  ;(object as LinkedObject)._paintLinkId = linkId
}

export const createPaintLinkId = () => `lnk_${uuidv4()}`

export const collectLinkedObjects = (
  canvas: fabric.Canvas,
  seed: fabric.Object[],
  options?: { includeHidden?: boolean }
) => {
  const includeHidden = options?.includeHidden === true
  const linkIds = new Set(
    seed.map((object) => getPaintLinkId(object)).filter(Boolean)
  )
  if (!linkIds.size) {
    return [...seed]
  }
  const matched = canvas.getObjects().filter((object) => {
    if (!includeHidden && object.visible === false) {
      return false
    }
    const linkId = getPaintLinkId(object)
    return Boolean(linkId && linkIds.has(linkId))
  })
  const byId = new Set(matched)
  seed.forEach((object) => byId.add(object))
  return [...byId]
}

export const stampPaintLinkId = (
  objects: fabric.Object[],
  linkId = createPaintLinkId()
) => {
  objects.forEach((object) => setPaintLinkId(object, linkId))
  return linkId
}
