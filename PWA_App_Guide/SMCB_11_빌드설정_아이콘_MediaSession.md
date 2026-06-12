# 11. 빌드 설정 · PWA 아이콘 · MediaSession

> 레퍼런스: `D:\_Git\SMCB\app\vite.config.ts`, `public/icons/`, `lib/mediaSession.ts`

---

## 1. vite.config.ts 전체 패턴

```typescript
// app/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// package.json에서 버전 읽기 (빌드 상수 주입용)
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string };

// 배포 타겟 분기 — DEPLOY_TARGET=cf 이면 Cloudflare Pages (base: '/')
const isCloudflare = process.env.DEPLOY_TARGET === 'cf';
const base = isCloudflare ? '/' : '/{프로젝트명}/';
//                                   ↑ 예: '/irishPlay/'
//                                   저장소 이름과 대소문자 일치 필수

export default defineConfig({
  base,

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },

  // ── 빌드 상수 주입 ──────────────────────────────────────────
  define: {
    // TypeScript에서 declare const로 타입 선언 필요 (vite-env.d.ts)
    __APP_VERSION__: JSON.stringify(pkg.version),
  },

  plugins: [
    react(),

    VitePWA({
      registerType: 'prompt',       // 'autoUpdate' 사용 금지
      // strategies: 'injectManifest',  // 진행률 표시 필요 시
      // srcDir: 'src',
      // filename: 'sw.ts',

      includeAssets: ['icons/icon.svg'],

      manifest: {
        id:              base,
        name:            '{프로젝트명}',
        short_name:      '{프로젝트명}',
        description:     '{앱설명}',
        start_url:       base,
        scope:           base,
        display:         'standalone',
        orientation:     'portrait',
        background_color:'#FAFAFA',
        theme_color:     '{테마색상}',  // 예: '#1f6f6b'
        lang:            'ko',
        icons: [
          {
            src:     'icons/icon.svg',
            sizes:   'any',             // SVG는 모든 해상도
            type:    'image/svg+xml',
            purpose: 'any maskable',    // maskable 겸용
          },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // 외부 API 캐시 (선택)
          {
            urlPattern: /^https:\/\/api\.example\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // 오디오 파일 캐시 (TTS/MP3 사용 시)
          {
            urlPattern: ({ request }) => request.destination === 'audio',
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-cache',
              expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [200] },
              rangeRequests: true,   // iOS Safari audio streaming 필수
            },
          },
        ],
      },
    }),
  ],

  build: {
    target: 'es2017',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          state: ['zustand', 'idb-keyval'],
          // 무거운 라이브러리는 별도 청크
          // abcjs: ['abcjs'],
          // tone:  ['tone'],
        },
      },
    },
  },
});
```

---

## 2. vite-env.d.ts — 빌드 상수 타입 선언

```typescript
// app/src/vite-env.d.ts
/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// vite.config.ts define에서 주입한 상수
declare const __APP_VERSION__: string;
```

---

## 3. PWA 아이콘 — SVG 단일 파일 전략

PNG 아이콘 여러 개 대신 **SVG 하나로 모든 해상도 대응**. 용량 최소화 + 디자인 변경 용이.

```
public/icons/
└── icon.svg    ← 유일한 실사용 아이콘
```

### icon.svg 조건

```svg
<!-- public/icons/icon.svg -->
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 512 512"       ← viewBox 필수 (크기 조정 가능)
>
  <!-- 아이콘 내용 -->
  <!-- maskable 조건: 중요 내용을 중앙 80% 영역(safe zone) 안에 배치 -->
</svg>
```

### maskable 아이콘 safe zone

```
┌─────────────────┐
│  ░░░░░░░░░░░░░  │  ← 외곽 10% 는 잘릴 수 있음
│  ░┌───────────┐ │
│  ░│           │ │
│  ░│  safe     │ │  ← 중앙 80% 안에 주요 로고/아이콘 배치
│  ░│  zone     │ │
│  ░│           │ │
│  ░└───────────┘ │
│  ░░░░░░░░░░░░░  │
└─────────────────┘
```

### PNG 아이콘이 필요한 경우

iOS 홈 화면, Android Chrome 일부 버전에서 SVG가 렌더링 안 될 수 있다:

```bash
# sharp로 PNG 생성 (선택)
npm install -D sharp

# scripts/generate-icons.ts
import sharp from 'sharp';
const SIZES = [192, 512];
for (const size of SIZES) {
  await sharp('public/icons/icon.svg')
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
}
```

manifest에 추가:

```json
{
  "icons": [
    { "src": "icons/icon.svg",     "sizes": "any",     "type": "image/svg+xml", "purpose": "any maskable" },
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## 4. MediaSession API — 잠금화면 컨트롤

> 레퍼런스: `D:\_Git\SMCB\app\src\lib\mediaSession.ts`

오디오 재생 중 잠금화면·알림 센터에 컨트롤(재생/일시정지/이전/다음)을 표시한다.

```typescript
// app/src/lib/mediaSession.ts

type MediaSessionState = {
  title:    string;
  artist?:  string;
  album?:   string;
  artwork?: string;   // 앱 아이콘 URL
};

export function setupMediaSession(
  state: MediaSessionState,
  handlers: {
    onPlay?:     () => void;
    onPause?:    () => void;
    onPrevious?: () => void;
    onNext?:     () => void;
    onStop?:     () => void;
  }
): void {
  if (!('mediaSession' in navigator)) return;  // 미지원 기기 무시

  // 메타데이터 설정
  navigator.mediaSession.metadata = new MediaMetadata({
    title:  state.title,
    artist: state.artist  ?? '',
    album:  state.album   ?? '',
    artwork: state.artwork
      ? [{ src: state.artwork, sizes: '512x512', type: 'image/svg+xml' }]
      : [],
  });

  // 핸들러 등록
  const { onPlay, onPause, onPrevious, onNext, onStop } = handlers;
  if (onPlay)     navigator.mediaSession.setActionHandler('play',           onPlay);
  if (onPause)    navigator.mediaSession.setActionHandler('pause',          onPause);
  if (onPrevious) navigator.mediaSession.setActionHandler('previoustrack',  onPrevious);
  if (onNext)     navigator.mediaSession.setActionHandler('nexttrack',      onNext);
  if (onStop)     navigator.mediaSession.setActionHandler('stop',           onStop);
}

export function updatePlaybackState(state: 'playing' | 'paused' | 'none'): void {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.playbackState = state;
}

export function clearMediaSession(): void {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = null;
  (['play', 'pause', 'previoustrack', 'nexttrack', 'stop'] as MediaSessionAction[])
    .forEach((action) => {
      try { navigator.mediaSession.setActionHandler(action, null); }
      catch { /* 일부 브라우저에서 null 할당 미지원 */ }
    });
}
```

### 사용 예 — 음악 플레이어

```typescript
// hooks/usePlayback.ts 내부
import { setupMediaSession, updatePlaybackState, clearMediaSession } from '@/lib/mediaSession';
import { useEffect } from 'react';

// 곡 변경 시 MediaSession 갱신
useEffect(() => {
  if (!tune) return;

  setupMediaSession(
    {
      title:   tune.title,
      artist:  tune.composer ?? 'Traditional',
      album:   tune.setName  ?? 'Irish Tunes',
      artwork: `${import.meta.env.BASE_URL}icons/icon.svg`,
    },
    {
      onPlay:     () => play(),
      onPause:    () => pause(),
      onPrevious: () => playPrevious(),
      onNext:     () => playNext(),
    }
  );

  return () => clearMediaSession();
}, [tune?.id]);

// 재생 상태 변경 시 동기화
useEffect(() => {
  updatePlaybackState(isPlaying ? 'playing' : 'paused');
}, [isPlaying]);
```

---

## 5. 빌드 상수 활용 예

```typescript
// 앱 어디서나 사용
console.log('App version:', __APP_VERSION__);

// 설정 화면 표시
<p className="text-xs text-muted">버전 {__APP_VERSION__}</p>

// SW 캐시 버저닝 (sw.ts)
const CACHE_PREFIX = `app-v${__APP_VERSION__}`;
```

---

## 6. Cloudflare Pages 배포 분기

```bash
# GitHub Actions에서 Cloudflare 배포 시
DEPLOY_TARGET=cf npm run build
```

`wrangler.toml` 또는 Cloudflare Pages 설정:

```
pages_build_output_dir = app/dist
build_command = cd app && npm ci && npm run build
```

`public/_redirects` (BrowserRouter 사용 시 SPA 라우팅):

```
/* /index.html 200
```
