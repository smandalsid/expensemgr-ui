import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // In local dev, forward /api/* → http://127.0.0.1:8000/*
      // This avoids CORS since the browser sees same-origin requests.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Follow redirects server-side so the browser never sees a 307
        // pointing directly at 127.0.0.1 (which would trigger a CORS failure).
        followRedirects: true,
      },
    },
  },
})
