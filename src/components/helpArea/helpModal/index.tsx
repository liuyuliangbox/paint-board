import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import useBoardStore from '@/store/board'
import { languageList } from './constants'

import { Github, BookOpen, BookText, Keyboard } from 'lucide-react'
import TranslateIcon from '@/components/icons/translate.svg?react'
import HelpControls from '../controls'
import HelpGuide from '../guide'

const HelpModal = () => {
  const { t, i18n } = useTranslation()
  const { language, updateLanguage } = useBoardStore()
  const [activeTab, setActiveTab] = useState<'controls' | 'guide'>('guide')

  const handleChangLang = (newLanguage: string) => {
    // Menu uses `zh-tw`; i18n resource key is `zh-TW`.
    void i18n.changeLanguage(newLanguage === 'zh-tw' ? 'zh-TW' : newLanguage)
    updateLanguage(newLanguage)
  }

  return (
    <dialog id="help-modal" className="modal">
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
      <div className="modal-box h-[90vh] max-h-[800px] w-[90vw] max-w-[800px] overflow-auto">
        <div className="mb-8 flex items-start gap-3">
          <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href="https://github.com/LHRUN/paint-board"
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-xl bg-[#eef1ff95] px-4 py-3 transition-colors hover:bg-[#eef1ff]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700">
                <Github size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium leading-5">
                  {t('helpInfo.openSourceRepo')}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">
                  {t('helpInfo.openSourceRepoDesc')}
                </span>
              </span>
            </a>
            <a
              href="https://songlh.top/paint-board-docs"
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-xl bg-[#eef1ff95] px-4 py-3 transition-colors hover:bg-[#eef1ff]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700">
                <BookOpen size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-medium leading-5">
                  {t('helpInfo.docs')}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">
                  {t('helpInfo.docsDesc')}
                </span>
              </span>
            </a>
          </div>

          <div className="dropdown dropdown-bottom dropdown-end shrink-0">
            <div tabIndex={0} role="button">
              <TranslateIcon className="h-8 w-8 cursor-pointer rounded-md bg-[#66CC8960] p-1 hover:bg-[#66CC8980]" />
            </div>
            <ul
              tabIndex={0}
              className="dropdown-content menu menu-compact z-[11] w-40 rounded-box bg-base-100 shadow"
            >
              {languageList.map((item) => (
                <li
                  key={item.value}
                  onClick={() => handleChangLang(item.value)}
                >
                  <a className={`${item.value === language ? 'active' : ''}`}>
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          role="tablist"
          className="tabs tabs-bordered tabs-lg sticky -top-6 z-10 bg-white"
        >
          <a
            role="tab"
            className={`tab ${activeTab === 'guide' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            <BookText size={20} className="mr-2" />
            {t('helpInfo.guideTab')}
          </a>
          <a
            role="tab"
            className={`tab ${activeTab === 'controls' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('controls')}
          >
            <Keyboard size={20} className="mr-2" />
            {t('helpInfo.controlsTab')}
          </a>
        </div>

        {activeTab === 'guide' && <HelpGuide />}
        {activeTab === 'controls' && <HelpControls />}
      </div>
    </dialog>
  )
}

export default HelpModal
