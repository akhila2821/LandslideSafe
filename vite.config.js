import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Default Vite hashed filenames (assets/index-[hash].js). index.html always
  // points at the current build's files, so new Render deploys are picked up
  // immediately and old files can be cached immutably without going stale.
})
