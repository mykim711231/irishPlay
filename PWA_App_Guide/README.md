# PWA 공통 구현 지침

> 레퍼런스 구현: **SMCB** (`D:\_Git\SMCB\app\src`)  
> React + Vite + TailwindCSS + TypeScript 스택 기반.  
> 신규 프로젝트 생성 시 이 디렉토리를 참조하여 동일한 품질로 구현한다.

---

## 지침 목록

### PWA 기능

| 파일 | 내용 | SMCB 레퍼런스 |
|------|------|-------------|
| [SMCB_01_SW_업데이트_흐름.md](SMCB_01_SW_업데이트_흐름.md) | SW B방식 silent update + 진행률 토스트 | `sw.ts`, `useUpdateStore.ts`, `UpdateToast.tsx` |
| [SMCB_02_기기별_설치_제공.md](SMCB_02_기기별_설치_제공.md) | iOS / Android / Windows / Mac / 삼성 분기 설치 | `InstallPrompt.tsx` |
| [SMCB_03_설치주소_QR_코드.md](SMCB_03_설치주소_QR_코드.md) | qrcode.react QR 모달 (다크모드 예외 포함) | `InviteQrModal.tsx` |
| [SMCB_04_기기_TTS_활용.md](SMCB_04_기기_TTS_활용.md) | Web Speech API + useTTS hook + TTSButton | `tts.ts`, `TTSButton.tsx` |
| [SMCB_05_MP3_생성.md](SMCB_05_MP3_생성.md) | 빌드타임 Neural TTS 합성 / MediaRecorder 캡처 | `build-tts.ts`, `ttsBulkDownload.ts` |

### 아키텍처

| 파일 | 내용 | SMCB 레퍼런스 |
|------|------|-------------|
| [SMCB_06_라우팅_코드스플리팅.md](SMCB_06_라우팅_코드스플리팅.md) | HashRouter + lazy + Suspense + ErrorBoundary | `main.tsx`, `App.tsx`, `ErrorBoundary.tsx` |
| [SMCB_07_상태관리_퍼시스턴스.md](SMCB_07_상태관리_퍼시스턴스.md) | Zustand + idb-keyval hydrate/persist 패턴 | `stores/`, `lib/db.ts`, `lib/storage.ts` |
| [SMCB_08_테마_CSS토큰_다크모드.md](SMCB_08_테마_CSS토큰_다크모드.md) | `--rgb-XXX` 토큰 + Tailwind + 다크/세피아 테마 | `styles/tokens.css`, `stores/settings.ts` |
| [SMCB_09_레이아웃_공통컴포넌트.md](SMCB_09_레이아웃_공통컴포넌트.md) | Layout / Header / BottomNav / Footer 패턴 | `components/Layout.tsx`, `BottomNav.tsx` |
| [SMCB_10_인앱브라우저_오프라인_접근성.md](SMCB_10_인앱브라우저_오프라인_접근성.md) | 인앱 감지 · 오프라인 상태 · ARIA 패턴 | `lib/inapp.ts`, `RecordedAudioMissingBanner.tsx` |
| [SMCB_11_빌드설정_아이콘_MediaSession.md](SMCB_11_빌드설정_아이콘_MediaSession.md) | vite.config 전체 · SVG 아이콘 · 잠금화면 컨트롤 | `vite.config.ts`, `lib/mediaSession.ts` |

### 기능 구현

| 파일 | 내용 | SMCB 레퍼런스 |
|------|------|-------------|
| [SMCB_12_전문검색_MiniSearch.md](SMCB_12_전문검색_MiniSearch.md) | 빌드타임 인덱스 생성 + 런타임 검색 + 디바운스 | `lib/search.ts`, `scripts/build-search-index.ts` |
| [SMCB_13_학습진도_즐겨찾기.md](SMCB_13_학습진도_즐겨찾기.md) | 읽음 체크마크 · 이어서 학습 CTA · 즐겨찾기 토글 | `stores/progress.ts`, `stores/favorites.ts` |
| [SMCB_14_SRS_플래시카드.md](SMCB_14_SRS_플래시카드.md) | Leitner/SM-2 간격 반복 알고리즘 + 채점 UI | `stores/srs.ts`, `components/flashcards/` |
| [SMCB_15_설정화면_백업복원.md](SMCB_15_설정화면_백업복원.md) | 테마·폰트·캐시 관리 + JSON 백업/복원 | `pages/Settings.tsx`, `lib/db.ts` |
| [SMCB_16_온보딩_최초진입.md](SMCB_16_온보딩_최초진입.md) | 2단계 온보딩 · hydrated 가드 · 사전 다운로드 | `components/OnboardingCard.tsx` |

---

## 신규 프로젝트 적용 순서

### Phase 1 — 기반 (필수)
```
[ ] npm install react react-dom react-router-dom zustand idb-keyval lucide-react
[ ] npm install -D vite vite-plugin-pwa workbox-window tailwindcss typescript tsx
[ ] tsconfig.app.json  → "lib": ["WebWorker"], "skipLibCheck": true
[ ] tsconfig.node.json → "skipLibCheck": true
[ ] styles/tokens.css  → --rgb-XXX 포맷 색상 토큰
[ ] tailwind.config.js → darkMode:'class', rgb 토큰 연결
[ ] vite.config.ts     → base, VitePWA(registerType:'prompt'), manualChunks
[ ] public/icons/icon.svg 생성
[ ] main.tsx           → HashRouter, hydrate 호출
[ ] App.tsx            → lazy + Suspense + ErrorBoundary + Routes
```

### Phase 2 — 레이아웃 & 상태
```
[ ] lib/db.ts + lib/storage.ts
[ ] stores/useSettings.ts (테마/폰트 + hydrate/persist)
[ ] components/Layout.tsx, Header.tsx, BottomNav.tsx
[ ] components/ErrorBoundary.tsx
[ ] stores/useUpdateStore.ts + components/UpdateToast.tsx → App.tsx 마운트
```

### Phase 3 — PWA 기능
```
[ ] lib/detectDevice.ts + components/InstallPrompt.tsx
[ ] components/QrModal.tsx
[ ] lib/inapp.ts + components/InAppBanner.tsx
[ ] hooks/useOnlineStatus.ts + components/OfflineBanner.tsx
```

### Phase 4 — 앱 기능 (프로젝트별 선택)
```
[ ] (검색)     npm install minisearch → scripts/build-search-index.ts + lib/search.ts
[ ] (진도)     stores/useProgress.ts + stores/useFavorites.ts
[ ] (플래시카드) stores/useSRS.ts + components/FlashcardPlayer.tsx
[ ] (TTS)      lib/tts.ts + hooks/useTTS.ts + components/TTSButton.tsx
[ ] (MP3)      npm install -D msedge-tts → scripts/build-tts.ts
[ ] (MediaSession) lib/mediaSession.ts
[ ] (설정)     pages/Settings.tsx → 테마/폰트/캐시/백업
[ ] (온보딩)   components/OnboardingCard.tsx
```

### Phase 5 — 검증
```
[ ] npm run typecheck 통과
[ ] npm run build 성공
[ ] 실제 기기 PWA 설치 테스트 (iOS Safari, Android Chrome, Windows Chrome)
[ ] 오프라인 모드 동작 확인
[ ] 다크모드 / 폰트 크기 전환 확인
```

---

## 핵심 의존성

```json
{
  "dependencies": {
    "idb-keyval":       "^6.x",
    "lucide-react":     "^0.453.0",
    "minisearch":       "^7.x",
    "qrcode.react":     "^4.2.0",
    "react":            "^18.3.x",
    "react-dom":        "^18.3.x",
    "react-router-dom": "^6.26.x",
    "zustand":          "^4.5.x"
  },
  "devDependencies": {
    "msedge-tts":       "^2.x",
    "tailwindcss":      "^3.x",
    "tsx":              "^4.x",
    "typescript":       "^5.x",
    "vite":             "^5.x",
    "vite-plugin-pwa":  "^0.20.x",
    "workbox-window":   "^7.x"
  }
}
```
