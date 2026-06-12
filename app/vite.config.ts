import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

const isCloudflare = process.env.DEPLOY_TARGET === 'cf';
const base = isCloudflare ? '/' : '/irishPlay/';

export default defineConfig({
  base,
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Foinn Seisiún',
        short_name: 'Foinn',
        description: '아일랜드 세션 튠 연습 앱',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#f5f3ee',
        theme_color: '#1f6f6b',
        lang: 'ko',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  optimizeDeps: {
    include: ['abcjs'],
  },
  build: {
    target: 'es2017',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          abcjs: ['abcjs'],
          tone: ['tone'],
        },
      },
    },
  },
});
