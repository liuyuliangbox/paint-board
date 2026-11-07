/**
 * Map store / i18n language codes to HTML lang (BCP 47) so browsers
 * do not offer EN→ZH translate when the UI is already Chinese.
 */
export const toHtmlLang = (language: string) => {
  const folded = language.toLowerCase()
  if (folded === 'zh' || folded === 'zh-cn' || folded === 'zh-hans') {
    return 'zh-CN'
  }
  if (folded === 'zh-tw' || folded === 'zh-hant') {
    return 'zh-TW'
  }
  if (folded === 'ja' || folded.startsWith('ja-')) {
    return 'ja'
  }
  if (folded === 'ko' || folded.startsWith('ko-')) {
    return 'ko'
  }
  if (folded === 'en' || folded.startsWith('en-')) {
    return 'en'
  }
  return language
}

/** Apply lang (+ discourage whole-page auto-translate on a drawing app). */
export const syncDocumentLanguage = (language: string) => {
  if (typeof document === 'undefined') {
    return
  }
  const html = document.documentElement
  html.lang = toHtmlLang(language)
  html.setAttribute('translate', 'no')
}
