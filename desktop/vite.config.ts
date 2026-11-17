import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // rutas relativas: necesario para que el build empaquetado de Electron
  // cargue los assets desde dist/index.html (file://), no desde un servidor
  base: './',
  plugins: [react()],
})
