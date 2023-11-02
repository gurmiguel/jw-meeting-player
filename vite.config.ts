import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import { notBundle } from 'vite-plugin-electron/plugin'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      electron([
        {
          // Main-Process entry file of the Electron App.
          entry: 'electron/main.ts',
          vite: {
            define: {
              'process.env.FLUENTFFMPEG_COV': false,
            },
            build: {
              rollupOptions: {
                external: [
                  'canvas',
                ],
              },
            },
            plugins: [
              command === 'serve' && notBundle(),
            ],
          },
        },
        {
          entry: 'electron/preload.ts',
          onstart(options) {
            // Notify the Renderer-Process to reload the page when the Preload-Scripts build is complete, 
            // instead of restarting the entire Electron App.
            options.reload()
          },
        },
      ]),
    ],
    build: {
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'index.html'),
          player: path.resolve(__dirname, 'player.html'),
        },
      },
    },
  }
})
