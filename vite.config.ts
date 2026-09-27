import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relative assets work both at a custom domain and under GitHub Pages /Eco-map/.
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2018',
    cssTarget: 'safari13',
    sourcemap: false,
  },
})
