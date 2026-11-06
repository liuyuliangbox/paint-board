import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import type { CloudBoardMeta } from '@/core/board/boardSync'

interface IProps {
  meta: CloudBoardMeta
  selected: boolean
  onToggle: (id: string) => void
}

const CloudBoardCard: FC<IProps> = ({ meta, selected, onToggle }) => {
  const { t } = useTranslation()
  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border bg-base-100 shadow-sm ${
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        className="relative flex h-[140px] w-full items-center justify-center overflow-hidden bg-slate-50"
        onClick={() => onToggle(meta.id)}
      >
        {meta.thumbnail ? (
          <img
            src={meta.thumbnail}
            alt={meta.title}
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : (
          <span className="text-sm text-slate-400">
            {t('fileBoard.noThumbnail')}
          </span>
        )}
        <input
          type="checkbox"
          className="checkbox checkbox-primary checkbox-sm absolute left-2 top-2 bg-white"
          checked={selected}
          onChange={() => onToggle(meta.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={t('fileBoard.select', { title: meta.title }) || undefined}
        />
      </button>
      <div className="flex flex-1 items-center px-3 py-2">
        <span className="truncate text-sm font-medium" title={meta.title}>
          {meta.title}
        </span>
      </div>
    </div>
  )
}

export default CloudBoardCard
