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
    // abcjs는 CJS 모듈 → ESM 호환을 위해 dev 서버에서 사전 번들링 필요
    include: ['abcjs'],
  },
  build: {
    target: 'es2017',
    // abcjs(~503 kB raw)는 구조상 tree-shake 불가 → 경고 한계 상향
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 공통 React 스택 — 캐시 수명 극대화
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/react-router')
          ) return 'vendor-react';
          // abcjs — CJS 모듈 전체 필요, lazy chunk 의존
          if (id.includes('/node_modules/abcjs/')) return 'vendor-abcjs';
          // tone — named import으로 tree-shake 준비됨.
          // 단, tone v15 package.json에 sideEffects 필드 미설정 → Rollup 보수적 포함
          // (tone 저자가 sideEffects:false 추가 시 자동으로 tree-shake 적용)
          if (id.includes('/node_modules/tone/') || id.includes('/node_modules/@tonejs/')) return 'vendor-tone';
        },
      },
    },
  },
});
