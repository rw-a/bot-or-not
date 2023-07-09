/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_PORT: number
  // more env variables...
}
  
interface ImportMeta {
  readonly env: ImportMetaEnv
}