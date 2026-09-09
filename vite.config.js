import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Stable filenames prevent a browser from requesting an old, hashed asset
  // after Render replaces the previous production build.
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/chunk-[name].js',
        assetFileNames: (asset) => asset.name?.endsWith('.css') ? 'assets/app.css' : 'assets/[name][extname]'
      }
    }
  }
})
