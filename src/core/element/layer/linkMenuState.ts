import { fabric } from 'fabric'
import { getPaintLinkId } from './paintLink'

export type LinkMenuState = {
  canLink: boolean
  canUnlink: boolean
  /** i18n key for the link action */
  linkLabelKey: 'objectList.linkSelection' | 'objectList.link'
  /** i18n key for the unlink action */
  unlinkLabelKey: 'objectList.unlink' | 'objectList.unlinkAll'
}

/**
 * Decide which link actions to show for a mixed canvas selection.
 * - Link (≥2): always allowed; stamps one new linkId on the whole selection.
 * - Unlink: if any selected object already has a linkId.
 * - Mixed / multi-group: use "unlink all" wording.
 */
export const getLinkMenuState = (objects: fabric.Object[]): LinkMenuState => {
  const visible = objects.filter((object) => object.visible !== false)
  const linkIds = visible
    .map((object) => getPaintLinkId(object))
    .filter(Boolean)
  const uniqueLinks = new Set(linkIds)
  const linkedCount = linkIds.length
  const allLinked = visible.length > 0 && linkedCount === visible.length
  const singleGroup = uniqueLinks.size === 1 && allLinked

  return {
    canLink: visible.length >= 2,
    canUnlink: linkedCount > 0,
    linkLabelKey: 'objectList.linkSelection',
    unlinkLabelKey: singleGroup ? 'objectList.unlink' : 'objectList.unlinkAll'
  }
}
