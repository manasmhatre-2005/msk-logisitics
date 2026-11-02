import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';
  return {
    plugins: [react()],
    build: {
      sourcemap: false, // Strict: Prevent leaking TypeScript source code maps to browser
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/qrcode') || id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
              return 'vendor-utils';
            }
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    esbuild: {
      drop: isProd ? (['console', 'debugger'] as ('console' | 'debugger')[]) : [],
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
