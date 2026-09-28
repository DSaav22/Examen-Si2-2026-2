import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Los GLB se sirven desde backend/public/models. Sin este proxy Vite
      // responde el index.html y GLTFLoader no puede interpretar el archivo.
      '/models': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
