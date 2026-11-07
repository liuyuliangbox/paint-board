import { ActionMode } from '@/constants'

export const modeSwitch = [
  {
    type: ActionMode.DRAW,
    text: 'tool.draw',
    keyboard: 'B'
  },
  {
    type: ActionMode.ERASE,
    text: 'tool.eraser',
    keyboard: 'E'
  },
  {
    type: ActionMode.SELECT,
    text: 'tool.select',
    keyboard: '3'
  },
  {
    type: ActionMode.Board,
    text: 'tool.board',
    keyboard: '4'
  }
]
