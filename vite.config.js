import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        play: resolve(root, 'play/index.html'),
        studio: resolve(root, 'studio/index.html'),
        board: resolve(root, 'board/index.html'),
        handoff: resolve(root, 'handoff/index.html'),
      },
    },
  },
})
