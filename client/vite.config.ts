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
