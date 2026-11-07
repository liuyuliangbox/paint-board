import type { HelpSurface } from '@/hooks/useHelpSurfaces'

export type HelpKeyPart =
  | { kind: 'kbd'; label: string }
  | { kind: 'text'; key: string }
  | { kind: 'meta' }
  | { kind: 'sep'; label?: string }

export type HelpControlRow = {
  id: string
  actionKey: string
  surfaces: HelpSurface[]
  parts: HelpKeyPart[]
}

/** Board / canvas controls — filtered by current input surfaces. */
export const BOARD_ROWS: HelpControlRow[] = [
  {
    id: 'pan-space',
    actionKey: 'helpInfo.boardOperations.panBoard1',
    surfaces: ['pointer', 'keyboard'],
    parts: [
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.spaceKey' },
      { kind: 'sep', label: '+' },
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.spaceDrag' }
    ]
  },
  {
    id: 'pan-ctrl',
    actionKey: 'helpInfo.boardOperations.panBoardCtrlDrag',
    surfaces: ['pointer', 'keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.ctrlEmptyDrag' }
    ]
  },
  {
    id: 'pan-arrows',
    actionKey: 'helpInfo.boardOperations.panBoard2',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: '▲' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '◀︎' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '▶︎' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '▼' }
    ]
  },
  {
    id: 'zoom-wheel',
    actionKey: 'helpInfo.boardOperations.zoomBoard1',
    surfaces: ['pointer'],
    parts: [{ kind: 'text', key: 'helpInfo.keyboardShortcuts.mouseWheel' }]
  },
  {
    id: 'zoom-keys',
    actionKey: 'helpInfo.boardOperations.zoomBoard2',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: '+' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '-' }
    ]
  },
  {
    id: 'zoom-reset',
    actionKey: 'helpInfo.boardOperations.resetZoom',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: '0' }
    ]
  },
  {
    id: 'undo',
    actionKey: 'helpInfo.boardOperations.undo',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: 'Z' }
    ]
  },
  {
    id: 'redo',
    actionKey: 'helpInfo.boardOperations.redo',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: 'Shift' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: 'Z' }
    ]
  },
  {
    id: 'pan-touch',
    actionKey: 'helpInfo.boardOperations.panBoardMobile',
    surfaces: ['touch'],
    parts: [
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.doubleFingerDrag' }
    ]
  },
  {
    id: 'pan-hand',
    actionKey: 'helpInfo.boardOperations.panBoardHand',
    surfaces: ['touch'],
    parts: [{ kind: 'text', key: 'helpInfo.keyboardShortcuts.handPanToggle' }]
  },
  {
    id: 'zoom-touch',
    actionKey: 'helpInfo.boardOperations.zoomBoardMobile',
    surfaces: ['touch'],
    parts: [
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.doubleFingerZoom' }
    ]
  },
  {
    id: 'undo-touch',
    actionKey: 'helpInfo.boardOperations.undoMobile',
    surfaces: ['touch'],
    parts: [{ kind: 'text', key: 'helpInfo.keyboardShortcuts.doubleFingerTap' }]
  },
  {
    id: 'redo-touch',
    actionKey: 'helpInfo.boardOperations.redoMobile',
    surfaces: ['touch'],
    parts: [{ kind: 'text', key: 'helpInfo.keyboardShortcuts.threeFingerTap' }]
  }
]

export const ELEMENT_ROWS: HelpControlRow[] = [
  {
    id: 'select-all',
    actionKey: 'helpInfo.elementOperations.selectAll',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: 'A' }
    ]
  },
  {
    id: 'multi-select',
    actionKey: 'helpInfo.elementOperations.selectMultiple',
    surfaces: ['pointer'],
    parts: [
      { kind: 'kbd', label: 'Shift' },
      { kind: 'sep', label: '+' },
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.mouseLeftClick' }
    ]
  },
  {
    id: 'right-click',
    actionKey: 'helpInfo.elementOperations.rightClickSelect',
    surfaces: ['pointer'],
    parts: [{ kind: 'text', key: 'helpInfo.keyboardShortcuts.mouseRightClick' }]
  },
  {
    id: 'right-marquee',
    actionKey: 'helpInfo.elementOperations.rightClickMarquee',
    surfaces: ['pointer'],
    parts: [{ kind: 'text', key: 'helpInfo.keyboardShortcuts.mouseRightDrag' }]
  },
  {
    id: 'long-press',
    actionKey: 'helpInfo.elementOperations.longPressSelect',
    surfaces: ['touch'],
    parts: [{ kind: 'text', key: 'helpInfo.keyboardShortcuts.longPress' }]
  },
  {
    id: 'long-marquee',
    actionKey: 'helpInfo.elementOperations.longPressMarquee',
    surfaces: ['touch'],
    parts: [{ kind: 'text', key: 'helpInfo.keyboardShortcuts.longPressDrag' }]
  },
  {
    id: 'copy',
    actionKey: 'helpInfo.elementOperations.copySelected',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: 'C' }
    ]
  },
  {
    id: 'paste',
    actionKey: 'helpInfo.elementOperations.pasteElements',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: 'V' }
    ]
  },
  {
    id: 'paste-clip',
    actionKey: 'helpInfo.elementOperations.pasteClipboard',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: 'B' }
    ]
  },
  {
    id: 'duplicate',
    actionKey: 'helpInfo.elementOperations.duplicateSelected',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: 'D' }
    ]
  },
  {
    id: 'dup-drag',
    actionKey: 'helpInfo.elementOperations.duplicateDrag',
    surfaces: ['pointer', 'keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.spaceDrag' }
    ]
  },
  {
    id: 'move-touch',
    actionKey: 'helpInfo.elementOperations.moveSelectedTouch',
    surfaces: ['touch'],
    parts: [
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.twoFingerMoveSelection' }
    ]
  },
  {
    id: 'scale-touch',
    actionKey: 'helpInfo.elementOperations.scaleSelectedTouch',
    surfaces: ['touch'],
    parts: [
      {
        kind: 'text',
        key: 'helpInfo.keyboardShortcuts.twoFingerScaleSelection'
      }
    ]
  },
  {
    id: 'dup-touch',
    actionKey: 'helpInfo.elementOperations.duplicateDragTouch',
    surfaces: ['touch'],
    parts: [
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.duplicateModeToggle' }
    ]
  },
  {
    id: 'constrain',
    actionKey: 'helpInfo.elementOperations.constrainMove',
    surfaces: ['pointer', 'keyboard'],
    parts: [
      { kind: 'kbd', label: 'Shift' },
      { kind: 'sep', label: '+' },
      { kind: 'text', key: 'helpInfo.keyboardShortcuts.spaceDrag' }
    ]
  },
  {
    id: 'nudge',
    actionKey: 'helpInfo.elementOperations.nudgeSelected',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'kbd', label: '▲' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '◀︎' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '▶︎' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '▼' },
      { kind: 'sep', label: '·' },
      { kind: 'kbd', label: 'Shift' },
      { kind: 'sep', label: '×10' }
    ]
  },
  {
    id: 'esc',
    actionKey: 'helpInfo.elementOperations.clearSelection',
    surfaces: ['keyboard'],
    parts: [{ kind: 'kbd', label: 'Esc' }]
  },
  {
    id: 'delete',
    actionKey: 'helpInfo.elementOperations.deleteSelected',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'kbd', label: 'Backspace' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: 'Delete' }
    ]
  },
  {
    id: 'layer',
    actionKey: 'helpInfo.elementOperations.moveLayer',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'meta' },
      { kind: 'sep', label: '+' },
      { kind: 'kbd', label: '[' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: ']' }
    ]
  }
]

export const TOOL_ROWS: HelpControlRow[] = [
  {
    id: 'draw',
    actionKey: 'helpInfo.toolOperations.switchDrawMode',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'kbd', label: 'B' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '1' }
    ]
  },
  {
    id: 'erase',
    actionKey: 'helpInfo.toolOperations.switchEraserMode',
    surfaces: ['keyboard'],
    parts: [
      { kind: 'kbd', label: 'E' },
      { kind: 'sep', label: '/' },
      { kind: 'kbd', label: '2' }
    ]
  },
  {
    id: 'select',
    actionKey: 'helpInfo.toolOperations.switchSelectMode',
    surfaces: ['keyboard'],
    parts: [{ kind: 'kbd', label: '3' }]
  },
  {
    id: 'board',
    actionKey: 'helpInfo.toolOperations.switchBoardMode',
    surfaces: ['keyboard'],
    parts: [{ kind: 'kbd', label: '4' }]
  },
  {
    id: 'free',
    actionKey: 'helpInfo.toolOperations.switchFreeDrawing',
    surfaces: ['keyboard'],
    parts: [{ kind: 'kbd', label: '5' }]
  },
  {
    id: 'shape',
    actionKey: 'helpInfo.toolOperations.switchShapeDrawing',
    surfaces: ['keyboard'],
    parts: [{ kind: 'kbd', label: '6' }]
  },
  {
    id: 'brush',
    actionKey: 'helpInfo.toolOperations.switchBrushType',
    surfaces: ['keyboard'],
    parts: [{ kind: 'text', key: 'helpInfo.toolOperations.brushTypeNote' }]
  }
]
