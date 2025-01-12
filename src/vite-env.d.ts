/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// node asset
declare module '*?asset' {
  const src: string
  export default src
}
