/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />
/// <reference types="./types/index.d.ts" />

interface ImportMetaEnv {
  readonly VITE_WIDGET_SYNC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
