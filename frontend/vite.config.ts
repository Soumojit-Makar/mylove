import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Dev server — proxy to local backend
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws':  { target: 'ws://localhost:8000',   ws: true },
    },
  },

  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    // Inject build metadata for cache busting
    rollupOptions: {
      output: {
        // Content-hashed filenames → safe for immutable CDN caching
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-state':  ['@reduxjs/toolkit', 'react-redux', 'zustand'],
          'vendor-query':  ['@tanstack/react-query', '@tanstack/react-query-devtools'],
          'vendor-charts': ['recharts'],
          'vendor-ui':     ['axios', 'clsx', 'tailwind-merge', 'lucide-react', 'react-hot-toast', 'date-fns'],
        },
      },
    },
    minify: 'esbuild',
    sourcemap: mode === 'production' ? false : true,
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'axios', '@tanstack/react-query'],
  },

  // Inline small assets (<4 KB) as base64 to save round-trips
  assetsInlineLimit: 4096,
}))
