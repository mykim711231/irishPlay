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
        // PWA 설치 프롬프트 개선
        categories: ['music', 'education', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          // purpose: 'any maskable' → 어댑티브 아이콘 지원 (Android)
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // ── Precache: 필수 셸만 (대용량 lazy 청크 제외) ──────────
        // 기본값: ['**/*.{js,css,html,ico,png,svg}'] 에서 아래 제외
        globIgnores: [
          '**/vendor-abcjs-*.js',  // ~492 kB — TuneView 악보 렌더링 시만 필요
          '**/vendor-tone-*.js',   // ~242 kB — 악기 연주 기능 진입 시만 필요
          '**/TuneView-*.js',      // ~17 kB  — 악보 페이지 진입 시 lazy 로드
        ],
        // SPA 오프라인 폴백 — 네비게이션 요청은 index.html로
        navigateFallback: `${base}index.html`,
        navigateFallbackDenylist: [/^\/(api|_)\//],

        // ── Runtime Cache 규칙 ───────────────────────────────────
        runtimeCaching: [
          // 1. 대용량 vendor 청크 (abcjs · tone) — CacheFirst, 30일
          //    해시 변경 전까지 네트워크 불필요 → 오프라인 완전 지원
          {
            urlPattern: /\/assets\/vendor-(abcjs|tone)-[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'vendor-heavy-v1',
              expiration: { maxEntries: 4, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 2. 앱 코드 / lazy 청크 (TuneView 등) — CacheFirst, 7일
          //    방문한 페이지는 오프라인에서 재사용 가능
          {
            urlPattern: /\/assets\/[^/]+\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-chunks-v1',
              expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 3. CSS — CacheFirst, 30일 (해시 기반 캐시 무효화)
          {
            urlPattern: /\/assets\/[^/]+\.css$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-styles-v1',
              expiration: { maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // 4. 아이콘 / 이미지 — CacheFirst, 60일
          {
            urlPattern: /\.(png|svg|ico|webp)(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-images-v1',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
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
