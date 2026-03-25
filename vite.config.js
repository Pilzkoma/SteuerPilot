import { defineConfig } from 'vite'

// Separate Vite-Config für vitest (Engine-Tests ohne Electron)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/engine/**/*.test.js']
  }
})
