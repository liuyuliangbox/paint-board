import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import zh from './zh.json'
import zh_tw from './zh-tw.json'
import ja from './ja.json'
import ko from './ko-kr.json'
import useBoardStore from '@/store/board'
import { syncDocumentLanguage } from './documentLang'

const lang = useBoardStore.getState().language

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: en
    },
    zh: {
      translation: zh
    },
    'zh-TW': {
      translation: zh_tw
    },
    ja: {
      translation: ja
    },
    ko: {
      translation: ko
    }
  },
  lng: lang
})

syncDocumentLanguage(lang)

// Persist rehydrate may change language after first paint.
useBoardStore.persist.onFinishHydration(() => {
  syncDocumentLanguage(useBoardStore.getState().language)
})
if (useBoardStore.persist.hasHydrated()) {
  syncDocumentLanguage(useBoardStore.getState().language)
}

export default i18n
