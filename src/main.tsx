import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'
import { loadUiChineseFont } from '@/core/font/googleFont'

// Do not await. The interface renders with the system Chinese fallback first.
void loadUiChineseFont()

// Purge leftover Workbox SWs from when PWA was enabled in vite dev.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      void reg.unregister()
    }
  })
  if (typeof caches !== 'undefined') {
    void caches.keys().then((keys) => {
      for (const key of keys) {
        void caches.delete(key)
      }
    })
  }
}

if (import.meta.env.PROD) {
  const script = document.createElement('script')
  script.textContent = `
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "k06rclje17");
  `
  script.async = true
  document.body.appendChild(script)
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
