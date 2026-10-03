import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // The API builds these from the live catalog; serve them on the site's own
    // address like production does (see the deployment notes).
    proxy: {
      '/sitemap.xml': 'http://localhost:5000',
      '/robots.txt': 'http://localhost:5000',
    },
  },
})
