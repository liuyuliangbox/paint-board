import { FC, Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { isAppleDevice } from '@/utils'
import { rowVisible, useHelpSurfaces } from '@/hooks/useHelpSurfaces'
import {
  BOARD_ROWS,
  ELEMENT_ROWS,
  TOOL_ROWS,
  type HelpControlRow,
  type HelpKeyPart
} from './rows'

const KeyParts: FC<{ parts: HelpKeyPart[]; metaKey: string }> = ({
  parts,
  metaKey
}) => {
  const { t } = useTranslation()
  return (
    <>
      {parts.map((part, index) => {
        const key = `${part.kind}-${index}`
        if (part.kind === 'kbd') {
          return (
            <kbd key={key} className="kbd kbd-sm">
              {part.label}
            </kbd>
          )
        }
        if (part.kind === 'meta') {
          return (
            <kbd key={key} className="kbd kbd-sm">
              {metaKey}
            </kbd>
          )
        }
        if (part.kind === 'text') {
          return <span key={key}>{t(part.key)}</span>
        }
        return (
          <span key={key}>
            {part.label === '+' || part.label === '/' || part.label === '·'
              ? ` ${part.label} `
              : ` ${part.label ?? ''} `}
          </span>
        )
      })}
    </>
  )
}

const ControlTable: FC<{
  title: string
  rows: HelpControlRow[]
  metaKey: string
  ctx: {
    showTouch: boolean
    showPointer: boolean
    showKeyboard: boolean
  }
}> = ({ title, rows, metaKey, ctx }) => {
  const { t } = useTranslation()
  const visible = rows.filter((row) => rowVisible(row.surfaces, ctx))
  if (visible.length === 0) {
    return null
  }

  return (
    <Fragment>
      <div className="my-4 text-xl font-bold">{title}</div>
      <div className="overflow-auto">
        <table className="table">
          <thead>
            <tr>
              <th>{t('helpInfo.operations')}</th>
              <th>{t('helpInfo.shortcutKey')}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td>{t(row.actionKey)}</td>
                <td>
                  <KeyParts parts={row.parts} metaKey={metaKey} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Fragment>
  )
}

/** Current-device controls only (touch / pointer / keyboard filtered). */
const HelpControls: FC = () => {
  const { t } = useTranslation()
  const ctx = useHelpSurfaces()
  const metaKey = isAppleDevice() ? 'Cmd' : 'Ctrl'
  const surfaceBits = [
    ctx.showTouch ? t('helpInfo.surfaceTouch') : null,
    ctx.showPointer ? t('helpInfo.surfacePointer') : null,
    ctx.showKeyboard ? t('helpInfo.surfaceKeyboard') : null
  ].filter(Boolean)

  return (
    <div className="pb-10">
      <p className="mt-4 rounded-xl bg-[#eef1ff] px-3 py-2 text-sm text-slate-600">
        {t('helpInfo.showingFor')}
        <span className="ml-1 font-medium text-slate-800">
          {surfaceBits.join(' · ')}
        </span>
      </p>

      <ControlTable
        title={t('helpInfo.board')}
        rows={BOARD_ROWS}
        metaKey={metaKey}
        ctx={ctx}
      />
      <ControlTable
        title={t('helpInfo.elements')}
        rows={ELEMENT_ROWS}
        metaKey={metaKey}
        ctx={ctx}
      />
      <ControlTable
        title={t('helpInfo.tools')}
        rows={TOOL_ROWS}
        metaKey={metaKey}
        ctx={ctx}
      />

      {!ctx.showKeyboard && (
        <p className="mt-6 text-sm text-slate-500">
          {t('helpInfo.guide.drawingModes')}
        </p>
      )}
    </div>
  )
}

export default HelpControls
