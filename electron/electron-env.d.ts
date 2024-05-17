/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    DIST: string
    /** /dist/ or /public/ */
    PUBLIC: string

    FILES_PATH: string
  }
}

declare module 'tasklist' {
  interface Args {
    filter?: string[]
  }

  interface WindowItem {
    imageName: string
    pid: number
    sessionName: string
    sessionNumbe: number
    memUsage: number
  }

  export const tasklist: (args: Args) => Promise<WindowItem[]>
}

declare module 'win-control'
