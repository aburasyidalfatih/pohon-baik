import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: { alias: { 'server-only': fileURLToPath(new URL('./tests/helpers/server-only.ts', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    // Beberapa file uji menyalakan Payload (dan push skema) bersamaan: beri waktu lebih untuk beforeAll.
    hookTimeout: 60_000,
  },
})
