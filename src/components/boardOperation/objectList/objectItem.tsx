import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, GripVertical, Link2 } from 'lucide-react'
import { ObjectListRow } from '@/core/element/layer/objectList'

interface IProps {
  row: ObjectListRow
  onSelect: (event: React.MouseEvent) => void
  onToggleVisible: () => void
  onCommitText?: (value: string) => void
}

const ObjectItem: FC<IProps> = ({
  row,
  onSelect,
  onToggleVisible,
  onCommitText
}) => {
  const { t } = useTranslation()
  const iconColor = row.selected ? '#fff' : '#66CC8A'
  const [draft, setDraft] = useState(row.textValue || '')

  useEffect(() => {
    setDraft(row.textValue || '')
  }, [row.textValue, row.key])

  return (
    <li
      className={`flex items-center justify-between flex-row my-1 px-2 rounded-lg overflow-hidden group cursor-pointer h-12 transition-all duration-200 ${
        row.selected ? 'bg-primary' : 'hover:bg-slate-100'
      } ${row.visible ? '' : 'opacity-50'}`}
      onClick={onSelect}
    >
      <span className="flex w-full min-w-0 items-center gap-1.5">
        {row.linked ? (
          <Link2
            size={14}
            color={iconColor}
            className="shrink-0"
            aria-label={String(t('objectList.linked'))}
          />
        ) : null}
        {row.isText ? (
          <input
            className={`input input-ghost input-xs h-8 min-w-0 flex-1 px-1 text-sm ${
              row.selected
                ? 'text-white caret-white placeholder:text-white/70'
                : 'text-base-content'
            }`}
            value={draft}
            placeholder={String(t('objectList.text'))}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => onCommitText?.(draft)}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter') {
                ;(event.target as HTMLInputElement).blur()
              }
              if (event.key === 'Escape') {
                setDraft(row.textValue || '')
                ;(event.target as HTMLInputElement).blur()
              }
            }}
          />
        ) : (
          <span
            className={`w-full truncate ${
              row.selected ? 'text-white font-semibold' : ''
            }`}
          >
            {t(row.labelKey)}
            {row.detail ? (
              <span className={row.selected ? 'font-normal' : 'text-slate-500'}>
                {` ${row.detail}`}
              </span>
            ) : null}
          </span>
        )}
      </span>
      <span className="ml-3 flex shrink-0 items-center gap-x-2">
        <span
          onClick={(event) => {
            event.stopPropagation()
            onToggleVisible()
          }}
        >
          {row.visible ? (
            <Eye color={iconColor} size={16} />
          ) : (
            <EyeOff color={iconColor} size={16} />
          )}
        </span>
        <GripVertical
          className="drag-object-list-handle hidden cursor-grab group-hover:block [@media(pointer:coarse)]:block xs:block"
          color={iconColor}
          size={16}
          onClick={(event) => {
            event.stopPropagation()
          }}
        />
      </span>
    </li>
  )
}

export default ObjectItem
