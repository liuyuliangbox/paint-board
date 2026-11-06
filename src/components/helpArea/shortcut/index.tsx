import { isAppleDevice } from '@/utils'
import { useTranslation } from 'react-i18next'

const Shortcut = () => {
  const { t } = useTranslation()
  const isApple = isAppleDevice()
  const metaKey = isApple ? 'Cmd' : 'Ctrl'

  return (
    <div className="pb-10">
      <div className="text-xl font-bold my-4">{t('helpInfo.board')}</div>

      <div className="overflow-auto">
        <table className="table">
          {/* head */}
          <thead>
            <tr>
              <th>{t('helpInfo.operations')}</th>
              <th>{t('helpInfo.shortcutKey')}</th>
            </tr>
          </thead>
          {/* body */}
          <tbody>
            <tr>
              <td>{t('helpInfo.boardOperations.panBoard1')}</td>
              <td>
                <kbd className="kbd kbd-sm">
                  {t('helpInfo.keyboardShortcuts.spaceKey')}
                </kbd>
                <span> + </span>
                <span>{t('helpInfo.keyboardShortcuts.spaceDrag')}</span>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.panBoardCtrlDrag')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <span>{t('helpInfo.keyboardShortcuts.ctrlEmptyDrag')}</span>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.panBoard2')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">▲</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">◀︎</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">▶︎</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">▼</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.zoomBoard1')}</td>
              <td>{t('helpInfo.keyboardShortcuts.mouseWheel')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.zoomBoard2')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">+</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">-</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.resetZoom')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">0</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.undo')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">Z</kbd>
              </td>
            </tr>
            <tr>
              <td>
                {t('helpInfo.boardOperations.redo')}
                <span></span>
              </td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">Shift</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">Z</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.panBoardMobile')}</td>
              <td>{t('helpInfo.keyboardShortcuts.doubleFingerDrag')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.panBoardHand')}</td>
              <td>{t('helpInfo.keyboardShortcuts.handPanToggle')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.zoomBoardMobile')}</td>
              <td>{t('helpInfo.keyboardShortcuts.doubleFingerZoom')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.undoMobile')}</td>
              <td>{t('helpInfo.keyboardShortcuts.doubleFingerTap')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.boardOperations.redoMobile')}</td>
              <td>{t('helpInfo.keyboardShortcuts.threeFingerTap')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-xl font-bold my-4">{t('helpInfo.elements')}</div>

      <div className="overflow-auto">
        <table className="table">
          {/* head */}
          <thead>
            <tr>
              <th>操作</th>
              <th>快捷键</th>
            </tr>
          </thead>
          {/* body */}
          <tbody>
            <tr>
              <td>{t('helpInfo.elementOperations.selectAll')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">A</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.selectMultiple')}</td>
              <td>
                <kbd className="kbd kbd-sm">Shift</kbd>
                <span> + </span>
                <span>{t('helpInfo.keyboardShortcuts.mouseLeftClick')}</span>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.rightClickSelect')}</td>
              <td>{t('helpInfo.keyboardShortcuts.mouseRightClick')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.rightClickMarquee')}</td>
              <td>{t('helpInfo.keyboardShortcuts.mouseRightDrag')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.longPressSelect')}</td>
              <td>{t('helpInfo.keyboardShortcuts.longPress')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.longPressMarquee')}</td>
              <td>{t('helpInfo.keyboardShortcuts.longPressDrag')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.copySelected')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">C</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.pasteElements')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">V</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.pasteClipboard')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">B</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.duplicateSelected')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">D</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.duplicateDrag')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <span>{t('helpInfo.keyboardShortcuts.spaceDrag')}</span>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.duplicateDragTouch')}</td>
              <td>{t('helpInfo.keyboardShortcuts.duplicateModeToggle')}</td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.constrainMove')}</td>
              <td>
                <kbd className="kbd kbd-sm">Shift</kbd>
                <span> + </span>
                <span>{t('helpInfo.keyboardShortcuts.spaceDrag')}</span>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.nudgeSelected')}</td>
              <td>
                <kbd className="kbd kbd-sm">▲</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">◀︎</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">▶︎</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">▼</kbd>
                <span> · </span>
                <kbd className="kbd kbd-sm">Shift</kbd>
                <span> ×10</span>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.clearSelection')}</td>
              <td>
                <kbd className="kbd kbd-sm">Esc</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.deleteSelected')}</td>
              <td>
                <kbd className="kbd kbd-sm">Backspace</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">Delete</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.elementOperations.moveLayer')}</td>
              <td>
                <kbd className="kbd kbd-sm">{metaKey}</kbd>
                <span> + </span>
                <kbd className="kbd kbd-sm">[</kbd>
                <span> / </span>
                <kbd className="kbd kbd-sm">]</kbd>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="text-xl font-bold my-4">{t('helpInfo.tools')}</div>

      <div className="overflow-auto">
        <table className="table">
          {/* head */}
          <thead>
            <tr>
              <th>操作</th>
              <th>快捷键</th>
            </tr>
          </thead>
          {/* body */}
          <tbody>
            <tr>
              <td>{t('helpInfo.toolOperations.switchDrawMode')}</td>
              <td>
                <kbd className="kbd kbd-sm">1</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.toolOperations.switchEraserMode')}</td>
              <td>
                <kbd className="kbd kbd-sm">2</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.toolOperations.switchSelectMode')}</td>
              <td>
                <kbd className="kbd kbd-sm">3</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.toolOperations.switchBoardMode')}</td>
              <td>
                <kbd className="kbd kbd-sm">4</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.toolOperations.switchFreeDrawing')}</td>
              <td>
                <kbd className="kbd kbd-sm">5</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.toolOperations.switchShapeDrawing')}</td>
              <td>
                <kbd className="kbd kbd-sm">6</kbd>
              </td>
            </tr>
            <tr>
              <td>{t('helpInfo.toolOperations.switchBrushType')}</td>
              <td>
                <span>{t('helpInfo.toolOperations.brushTypeNote')}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Shortcut
