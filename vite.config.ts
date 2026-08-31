/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // 禁用缓存：规避 Vitest 4.1.10 缓存竞态导致的收集期崩溃（见 CLAUDE.md Known Issues）
    cache: false,
  },
})
