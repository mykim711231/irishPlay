# PWA 공통 구현 지침

> React + Vite + TailwindCSS + TypeScript 스택 기반의 모든 PWA 프로젝트에 적용하는 공통 지침.  
> 레퍼런스 구현: **SMCB** (`D:\_Git\SMCB\app\src`)  
> 아래 5가지 기능을 새 프로젝트에 동일하게 구현하는 방법을 안내한다.

---

## 목차

1. [SW 업데이트 흐름](#1-sw-업데이트-흐름)
2. [기기별 설치 제공](#2-기기별-설치-제공)
3. [설치 주소 QR 코드](#3-설치-주소-qr-코드)
4. [기기 TTS 활용](#4-기기-tts-활용)
5. [MP3 생성 (빌드타임 사전합성)](#5-mp3-생성-빌드타임-사전합성)

---

## 1. SW 업데이트 흐름

### 전략: B 방식 (silent update on next launch)

> 사용자에게 "새 버전이 있습니다, 지금 새로고침?" 을 묻지 않는다.  
> 새 SW는 waiting 상태로 대기하다가 사용자가 앱을 다시 열 때 자연스럽게 활성화된다.  
> **첫 설치 시 precache 진행률만** 토스트로 표시한다.

### 필요 패키지

```json
// package.json devDependencies
"vite-plugin-pwa": "^0.20.5",
"workbox-window": "^7.1.0"

// vite-plugin-pwa를 injectManifest 모드로 쓰면 아래도 추가
// (workbox 런타임 전략을 sw.ts에서 직접 import하기 위해)
"workbox-routing":            "^7.x",
"workbox-strategies":         "^7.x",
"workbox-expiration":         "^7.x",
"workbox-cacheable-response": "^7.x",
"workbox-range-requests":     "^7.x"
```

### 구성 파일

**`app/vite.config.ts`** — generateSW 방식 (권장, 단순):

```typescript
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'prompt',     // ← 'autoUpdate'가 아닌 'prompt' 사용
  // strategies 생략 = generateSW (기본값)
  manifest: { /* ... */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        // 런타임 fetch 캐시 (선택)
        urlPattern: /^https:\/\/cdn\.example\.com\//,
        handler: 'CacheFirst',
        options: { cacheName: 'external-assets', expiration: { maxEntries: 50 } },
      },
    ],
  },
})
```

> **injectManifest 방식** (진행률 postMessage가 필요한 경우 — SMCB 방식):  
> `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'` 추가 후  
> `app/src/sw.ts`를 직접 작성한다. SMCB의 `D:\_Git\SMCB\app\src\sw.ts`를 복사해서 시작.

---

### Zustand 업데이트 상태 스토어

**`app/src/stores/useUpdateStore.ts`** — SMCB에서 그대로 복사 가능:

```typescript
import { create } from 'zustand';

export type UpdatePhase = 'idle' | 'downloading' | 'installing' | 'error';
export type UpdateUI = { phase: UpdatePhase; pct: number };

type UpdateState = {
  ui: UpdateUI;
  retrySW: (() => void) | null;
  setPhase: (phase: UpdatePhase, pct?: number) => void;
  setRetryFn: (fn: () => void) => void;
  setError: () => void;
  dismiss: () => void;
};

export const useUpdateStore = create<UpdateState>((set) => ({
  ui: { phase: 'idle', pct: 0 },
  retrySW: null,
  setPhase: (phase, pct) =>
    set((s) => ({ ui: { phase, pct: pct ?? s.ui.pct } })),
  setRetryFn: (fn) => set({ retrySW: fn }),
  setError: () => set({ ui: { phase: 'error', pct: 0 } }),
  dismiss: () => set({ ui: { phase: 'idle', pct: 0 } }),
}));
```

---

### SW 등록 (main.tsx)

```typescript
// app/src/main.tsx
import { registerSW } from 'virtual:pwa-register';
import { useUpdateStore } from '@/stores/useUpdateStore';

// ── SW 상태 감시 헬퍼 ──────────────────────────────────────
function watchInstall(worker: ServiceWorker): void {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      useUpdateStore.getState().setPhase('installing', 100);
      setTimeout(() => useUpdateStore.getState().dismiss(), 2000);
    }
    if (worker.state === 'redundant') {
      useUpdateStore.getState().setError();
    }
  });
  useUpdateStore.getState().setPhase('downloading', 0);
}

// ── registerSW ─────────────────────────────────────────────
registerSW({
  onRegisteredSW(_swUrl: string, r?: ServiceWorkerRegistration) {
    if (!r) return;
    if (r.waiting) return;          // 이미 waiting → B방식: 다음 실행 시 적용
    if (r.installing) {
      watchInstall(r.installing);
      return;
    }
    r.update().catch(() => {});
  },

  onNeedRefresh() {
    // B 방식: 사용자에게 알리지 않음
    useUpdateStore.getState().dismiss();
  },

  onOfflineReady() { /* 별도 알림 불필요 */ },
});

// ── injectManifest 방식일 때: postMessage 수신 ──────────────
// (generateSW 방식이면 이 블록 불필요)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as { type?: string; phase?: string; pct?: number } | null;
    if (!data || data.type !== 'sw-precache-progress') return;

    if (data.phase === 'error') {
      useUpdateStore.getState().setError();
    } else if (data.phase === 'installed') {
      useUpdateStore.getState().setPhase('installing', 100);
      setTimeout(() => useUpdateStore.getState().dismiss(), 2000);
    } else {
      useUpdateStore.getState().setPhase(
        data.phase as 'downloading' | 'installing',
        data.pct
      );
    }
  });
}
```

---

### 업데이트 토스트 UI

**`app/src/components/UpdateToast.tsx`** — SMCB에서 복사 후 텍스트만 변경:

```tsx
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useUpdateStore, type UpdatePhase } from '@/stores/useUpdateStore';

function ProgressBar({ pct }: { pct: number }): JSX.Element {
  return (
    <div className="w-full h-1.5 rounded-full bg-divider/40 overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

const PHASE_LABEL: Record<UpdatePhase, string> = {
  idle: '',
  downloading: '오프라인 데이터 다운로드 중…',
  installing:  '설치 완료',
  error:       '설치 실패',
};

export default function UpdateToast(): JSX.Element | null {
  const { ui, retrySW, dismiss } = useUpdateStore();
  if (ui.phase === 'idle') return null;

  return (
    <div
      className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className={`
        pointer-events-auto rounded-2xl bg-surface shadow-lg border px-4 py-3
        max-w-sm min-w-[200px] space-y-2
        ${ui.phase === 'error' ? 'border-accent' : 'border-primary'}
      `}>
        <div className="flex items-center gap-2">
          {ui.phase === 'downloading' && <Loader2 size={14} className="animate-spin text-primary" />}
          {ui.phase === 'error' && <AlertTriangle size={14} className="text-accent" />}
          <span className="text-sm text-fg font-medium flex-1">{PHASE_LABEL[ui.phase]}</span>
          {ui.pct > 0 && ui.pct < 100 && (
            <span className="text-xs text-muted tabular-nums">{ui.pct}%</span>
          )}
        </div>

        {ui.pct > 0 && ui.pct < 100 && <ProgressBar pct={ui.pct} />}

        {ui.phase === 'error' && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => retrySW?.()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary text-white text-xs font-bold px-4 py-1.5 flex-1 justify-center"
            >
              <RefreshCw size={12} /> 다시 시도
            </button>
            <button
              type="button"
              onClick={() => dismiss()}
              className="rounded-full border border-divider text-muted text-xs font-bold px-4 py-1.5"
            >
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

`App.tsx` 루트에 `<UpdateToast />` 를 추가한다:

```tsx
import UpdateToast from '@/components/UpdateToast';

export default function App() {
  return (
    <>
      <Routes>...</Routes>
      <UpdateToast />
    </>
  );
}
```

---

## 2. 기기별 설치 제공

### 지원 기기 분기 표

| OS / 브라우저 | 설치 방법 | 구현 |
|---|---|---|
| Android Chrome/Edge | `beforeinstallprompt.prompt()` | 자동 프롬프트 |
| Windows Chrome/Edge | `beforeinstallprompt.prompt()` | 자동 프롬프트 |
| macOS Chrome/Edge | `beforeinstallprompt.prompt()` | 자동 프롬프트 |
| macOS Safari 17+ | 파일 메뉴 → Dock에 추가 | 수동 안내 모달 |
| iOS Safari | 공유 버튼 → 홈 화면에 추가 | 수동 안내 모달 (3단계) |
| 삼성 인터넷 | 주소창 + / ⋮ 메뉴 | 수동 안내 모달 (2가지 방법) |
| 기타 | 브라우저 메뉴 안내 | 텍스트 가이드 |

### 필요 패키지

```bash
npm install lucide-react   # 이미 설치돼 있으면 생략
```

`qrcode.react`는 3번 섹션에서 설치한다.

### 구현

**`app/src/components/InstallPrompt.tsx`** — SMCB 파일을 복사한 후 텍스트만 변경:

```
D:\_Git\SMCB\app\src\components\InstallPrompt.tsx
```

변경 필요한 부분:
- `<title>` 텍스트 (앱 이름)
- 각 모달 내 안내 문구 (앱 설명 관련 부분)
- `<Link to="/help">` 경로 (도움말 페이지가 없으면 제거)
- `AppleLogo`, `AndroidLogo` SVG 컴포넌트 — SMCB에서 복사하거나 lucide-react 아이콘으로 대체

> **AppleLogo / AndroidLogo** 없이 대체하려면:
> ```tsx
> // AppleLogo → Apple 로고 SVG (직접 인라인)
> import { Smartphone } from 'lucide-react';  // 임시 대체
> ```

#### OS 감지 함수 (수정 없이 그대로 사용)

```typescript
type OS = 'android' | 'ios' | 'windows' | 'mac' | 'other';

function detectOS(): OS {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  return 'other';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return (navigator as any).standalone === true;  // iOS Safari
}

function isIOSSafari(): boolean {
  if (detectOS() !== 'ios') return false;
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

function isMacSafari(): boolean {
  if (detectOS() !== 'mac') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
}

function isSamsungInternet(): boolean {
  return /SamsungBrowser/i.test(navigator.userAgent);
}
```

#### beforeinstallprompt 타입 선언

`tsconfig.app.json`의 `lib`에 `"DOM"`이 포함돼 있으면 `BeforeInstallPromptEvent`를 직접 정의한다:

```typescript
// 파일 최상단 또는 types.d.ts
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
```

#### App.tsx에 추가

```tsx
// 설치 프롬프트를 홈 화면이나 설정 페이지에 배치
import InstallPrompt from '@/components/InstallPrompt';

// 홈 화면 내 적당한 위치에:
<InstallPrompt />

// 또는 항상 펼쳐진 상태로:
<InstallPrompt defaultExpanded />
```

---

## 3. 설치 주소 QR 코드

### 필요 패키지

```bash
npm install qrcode.react
```

```json
// package.json (버전 참고)
"qrcode.react": "^4.2.0"
```

### 구현 — QrModal 컴포넌트

**`app/src/components/QrModal.tsx`** — SMCB의 `InviteQrModal.tsx`에서 복사 후 수정:

```tsx
import { QRCodeSVG } from 'qrcode.react';
import { X, Camera } from 'lucide-react';

// ⚠️ 다크모드 대응: QR 코드는 스캐너 인식을 위해
//    항상 bgColor="#FFFFFF" fgColor="#000000" 고정 (다크모드 예외)
export default function QrModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 id="qr-modal-title" className="text-xl font-bold text-fg inline-flex items-center gap-2">
            <Camera size={22} aria-hidden />
            QR 코드로 설치하기
          </h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-muted p-1">
            <X size={24} />
          </button>
        </div>

        <p className="text-base text-fg font-semibold">
          휴대폰 카메라로 아래 그림을 비추면 설치 화면이 열려요.
        </p>

        {/* QR — 항상 흰 배경/검은 모듈 (다크모드 무관) */}
        <div className="mt-4 flex justify-center">
          <div className="bg-white rounded-2xl p-4 border border-divider">
            <QRCodeSVG
              value={url}
              size={224}
              level="M"
              marginSize={2}
              bgColor="#FFFFFF"
              fgColor="#000000"
              title="앱 설치 주소"
            />
          </div>
        </div>

        <ol className="mt-5 space-y-3 text-base text-fg">
          {[
            '상대방 휴대폰의 카메라 앱을 켭니다.',
            '카메라로 위의 QR 그림을 비춥니다.',
            '화면에 뜨는 주소(링크)를 누르면 설치 화면이 열립니다.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-none w-7 h-7 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-4 pt-3 border-t border-divider">
          <p className="text-sm text-muted">QR이 잘 안 되면 이 주소를 직접 알려 주세요</p>
          <p className="text-sm text-fg font-medium break-all mt-1 select-all">{url}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 rounded-full bg-primary text-white text-base font-semibold py-3"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
```

### URL 결정 방법

```typescript
// 배포 URL을 동적으로 구성
const APP_URL = `${window.location.origin}${import.meta.env.BASE_URL}`;
// 예: https://mykim711231.github.io/irishPlay/

// QrModal 사용 예
const [showQr, setShowQr] = useState(false);
// ...
{showQr && <QrModal url={APP_URL} onClose={() => setShowQr(false)} />}
```

### 주의사항

- `level="M"` — 오류 정정 레벨 (L/M/Q/H). 로고 합성 없이는 M으로 충분.
- `size={224}` — 모바일에서 카메라 인식 최소 크기 (px).
- 카카오톡 공유 QR이라면 `?openExternalBrowser=1` 쿼리를 URL에 붙이면 카카오 인앱 브라우저를 우회한다.
  단, **일반 카메라 스캔용 QR에는 불필요** — 카메라는 기기 기본 브라우저로 직접 열기 때문.

---

## 4. 기기 TTS 활용

### 전략: 사전녹음 MP3 우선 + Web Speech API fallback

SMCB 구현 패턴을 그대로 따른다. 두 가지 레벨이 있다:

| 레벨 | 설명 | 음질 | 오프라인 |
|------|------|------|----------|
| A. 단순 TTS | Web Speech API만 사용 | 기기 음성팩 의존 | ❌ (네트워크 필요) |
| B. 사전녹음 우선 | 빌드타임 MP3 생성 + Web Speech fallback | 고품질 Neural TTS | ✅ |

---

### A. 단순 TTS (Web Speech API)

```typescript
// app/src/lib/tts.ts — 단순 버전
export type TTSStatus = 'idle' | 'speaking';

let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, lang = 'ko-KR'): void {
  stop();
  if (!('speechSynthesis' in window)) {
    console.warn('TTS not supported');
    return;
  }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 1.0;

  // 언어에 맞는 음성 선택 (없으면 기본값)
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
  if (voice) u.voice = voice;

  currentUtterance = u;
  window.speechSynthesis.speak(u);
}

export function stop(): void {
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

// ⚠️ iOS 주의사항:
//   - speak()는 반드시 사용자 제스처(click/tap) 핸들러 내부에서 호출해야 한다.
//   - 200자 이상 텍스트는 끊길 수 있으므로 문단 단위로 쪼갠다.
//   - iOS PWA에서 voiceschanged가 발화하지 않을 수 있다 — getVoices() 첫 호출 결과가 비어있으면
//     500ms 후 재시도한다.
```

#### React Hook으로 래핑

```typescript
// app/src/hooks/useTTS.ts
import { useState, useCallback, useEffect } from 'react';
import { speak, stop } from '@/lib/tts';

export function useTTS() {
  const [status, setStatus] = useState<'idle' | 'speaking'>('idle');

  const handleSpeak = useCallback((text: string, lang?: string) => {
    speak(text, lang);
    setStatus('speaking');
  }, []);

  const handleStop = useCallback(() => {
    stop();
    setStatus('idle');
  }, []);

  // 컴포넌트 언마운트 시 정지
  useEffect(() => () => { stop(); }, []);

  return { status, speak: handleSpeak, stop: handleStop };
}
```

#### TTS 버튼 컴포넌트

```tsx
// app/src/components/TTSButton.tsx
import { Volume2, VolumeX } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

export function TTSButton({ text, lang = 'ko-KR' }: { text: string; lang?: string }) {
  const { status, speak, stop } = useTTS();
  const speaking = status === 'speaking';

  return (
    <button
      type="button"
      onClick={() => speaking ? stop() : speak(text, lang)}
      aria-label={speaking ? '중지' : '읽기'}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full
        bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition"
    >
      {speaking ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
```

---

### B. 사전녹음 MP3 우선 + fallback (SMCB 완전 구현)

이 방식은 빌드타임에 MP3를 생성해서 `public/tts/` 에 배포한다.  
런타임에는 매니페스트(JSON) 조회 → `<audio>` 재생 → 실패 시 Web Speech fallback 순서로 동작한다.

참조 파일 목록:

| 파일 | 역할 |
|------|------|
| `D:\_Git\SMCB\app\src\lib\tts.ts` | 런타임 TTS 모듈 (speak, stop, unlock) |
| `D:\_Git\SMCB\app\src\components\TTSButton.tsx` | UI 버튼 |
| `D:\_Git\SMCB\app\src\lib\ttsBulkDownload.ts` | SW 캐시 워밍업 (오프라인 준비) |
| `D:\_Git\SMCB\app\scripts\build-tts.ts` | 빌드타임 MP3 합성 스크립트 |
| `D:\_Git\SMCB\app\scripts\tts-texts.ts` | 합성 대상 텍스트 수집 |
| `D:\_Git\SMCB\app\src\data\zh-tts-manifest.json` | 원문 → 파일명 매핑 (빌드 생성) |

---

### 언어별 권장 음성

| 언어 | Web Speech lang | Edge TTS 음성 (빌드타임) |
|------|----------------|------------------------|
| 한국어 | `ko-KR` | `ko-KR-SunHiNeural` |
| 영어 | `en-US` | `en-US-JennyNeural` |
| 중국어 | `zh-CN` | `zh-CN-XiaoxiaoNeural` |
| 아일랜드어 | `ga-IE` | (Web Speech만 — 음성팩 필요) |
| 일본어 | `ja-JP` | `ja-JP-NanamiNeural` |

> **아일랜드어(ga-IE)**: 대부분의 기기에 음성팩이 없다.  
> 이 경우 Web Speech API는 사용 불가 — 사전 녹음 MP3 또는 텍스트 표시로 대체한다.

---

### iOS AudioContext 제약 (공통 주의사항)

```typescript
// AudioContext / TTS / 오디오 재생은 반드시 사용자 제스처 내부에서 시작
button.addEventListener('click', async () => {
  // Tone.js를 쓰는 경우
  await Tone.start();

  // Web Speech를 쓰는 경우
  speak(text);

  // AudioContext를 직접 쓰는 경우
  const ctx = new AudioContext();
  await ctx.resume();
});
```

---

## 5. MP3 생성 (빌드타임 사전합성)

### 방식 선택

| 방식 | 적합한 경우 | 비고 |
|------|------------|------|
| **빌드타임 Neural TTS** | 품질 높은 음성, 오프라인 지원 필요 | 라이선스 주의 |
| **MediaRecorder (런타임)** | 사용자 녹음 기능 | iOS 지원 제한 |
| **Web Speech 실시간** | 설치 용량 최소화 | 기기 음성팩 의존 |

---

### 빌드타임 MP3 생성 (SMCB 방식)

#### 패키지 설치

```bash
# devDependencies — 빌드타임 전용
npm install -D msedge-tts
```

> **라이선스 주의**: `msedge-tts`는 Microsoft Edge Read-Aloud의 비공식 API를 사용한다.  
> 비영리·개인 프로젝트에는 실용적 위험이 낮으나 상업 배포 시 아래 대안을 검토한다.  
>  
> - **Piper TTS** (MIT, 로컬 합성): https://github.com/rhasspy/piper  
> - **Azure Speech Service F0** (월 500K 자 무료, 공식 라이선스)  
> - **Google Cloud TTS / Amazon Polly**

#### 스크립트 구조

```
app/
├── scripts/
│   ├── build-tts.ts    ← MP3 합성 메인 스크립트
│   └── tts-texts.ts    ← 합성 대상 텍스트 수집 유틸
├── public/
│   └── tts/
│       └── <sha1-12>.mp3   ← 합성된 MP3 파일들
└── src/
    └── data/
        └── tts-manifest.json   ← 원문 → 파일명 매핑
```

#### 핵심 스크립트 (`app/scripts/build-tts.ts`)

```typescript
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

const VOICE = 'ko-KR-SunHiNeural';   // ← 프로젝트에 맞게 변경
const OUT_DIR = join(import.meta.dirname, '..', 'public', 'tts');
const MANIFEST_PATH = join(import.meta.dirname, '..', 'src', 'data', 'tts-manifest.json');

// 텍스트 → SHA1 기반 파일명 (Idempotent)
function hashName(text: string): string {
  return createHash('sha1').update(text).digest('hex').slice(0, 12) + '.mp3';
}

async function synthesize(texts: string[]): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  // 기존 매니페스트 로드 (증분 합성 — 이미 있는 파일 skip)
  let manifest: Record<string, string> = {};
  if (existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  }

  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  let synthesized = 0;
  for (const text of texts) {
    if (manifest[text]) { continue; }  // 이미 있음 → skip

    const filename = hashName(text);
    const outPath = join(OUT_DIR, filename);

    const stream = tts.toStream(text);
    await new Promise<void>((resolve, reject) => {
      const file = createWriteStream(outPath);
      stream.pipe(file);
      file.on('finish', resolve);
      file.on('error', reject);
    });

    manifest[text] = filename;
    synthesized++;
    console.log(`[${synthesized}] ${text} → ${filename}`);
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✓ ${synthesized}개 새로 합성. 총 ${Object.keys(manifest).length}개.`);
}

// ── 합성 대상 텍스트 목록 ─────────────────────────────────
// 프로젝트에 맞게 수정
import tunesData from '../src/data/tunes.json' with { type: 'json' };

const texts: string[] = (tunesData as any[]).flatMap(tune => [
  tune.title,
  tune.description ?? '',
]).filter(Boolean);

synthesize(texts).catch(console.error);
```

#### package.json 스크립트 추가

```json
"scripts": {
  "build:tts": "tsx scripts/build-tts.ts",
  "build": "npm run build:tts && tsc -b && vite build"
}
```

```bash
# 실행
npm run build:tts

# tsx가 없으면 설치
npm install -D tsx
```

---

### 런타임 매니페스트 재생 (tts.ts)

```typescript
// app/src/lib/tts.ts — 매니페스트 기반 간소 버전
import manifest from '@/data/tts-manifest.json';

const TTS_BASE = `${import.meta.env.BASE_URL}tts/`;
const MANIFEST = manifest as Record<string, string>;

let currentAudio: HTMLAudioElement | null = null;

export function speak(text: string, lang = 'ko-KR'): void {
  stop();
  const filename = MANIFEST[text];
  if (filename) {
    // 사전녹음 MP3 재생
    const audio = new Audio(TTS_BASE + filename);
    audio.onerror = () => speakSynth(text, lang);  // 실패 시 fallback
    currentAudio = audio;
    void audio.play();
    return;
  }
  // 매니페스트 miss → Web Speech
  speakSynth(text, lang);
}

function speakSynth(text: string, lang: string): void {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  window.speechSynthesis.speak(u);
}

export function stop(): void {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  window.speechSynthesis.cancel();
}
```

---

### SW 캐시 워밍업 (오프라인 지원)

MP3를 오프라인에서도 재생하려면 Service Worker가 캐싱해야 한다.

```typescript
// app/src/lib/ttsBulkDownload.ts
import manifest from '@/data/tts-manifest.json';

const TTS_BASE = `${import.meta.env.BASE_URL}tts/`;
const MANIFEST = manifest as Record<string, string>;
const CACHE_NAME = 'tts-audio';

export async function warmupTtsCache(): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(CACHE_NAME);

  const urls = Object.values(MANIFEST).map(f => TTS_BASE + f);
  const CONCURRENCY = 6;

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (url) => {
        if (await cache.match(url)) return;  // 이미 캐시됨
        const res = await fetch(url);
        if (res.ok) await cache.put(url, res);
      })
    );
  }
}
```

`vite.config.ts` runtimeCaching에 추가:

```typescript
// workbox runtimeCaching (generateSW 방식)
{
  urlPattern: ({ request }) => request.destination === 'audio',
  handler: 'CacheFirst',
  options: {
    cacheName: 'tts-audio',
    expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 365 },
    cacheableResponse: { statuses: [200] },
    rangeRequests: true,  // iOS Safari audio streaming 지원
  },
}
```

---

## 체크리스트 — 신규 프로젝트 적용 순서

```
[ ] 1. npm install qrcode.react zustand
[ ] 2. npm install -D msedge-tts tsx  (MP3 생성 필요 시)
[ ] 3. tsconfig.app.json — "lib"에 "WebWorker" 포함 확인
[ ] 4. tsconfig.node.json — "skipLibCheck": true 확인
[ ] 5. vite.config.ts — VitePWA registerType: 'prompt' 설정
[ ] 6. stores/useUpdateStore.ts 복사
[ ] 7. components/UpdateToast.tsx 복사 + App.tsx에 마운트
[ ] 8. components/InstallPrompt.tsx 복사 + 텍스트 수정
[ ] 9. components/QrModal.tsx 작성 + 사용처에 연결
[ ] 10. lib/tts.ts 작성 (단순 Web Speech 또는 매니페스트 방식)
[ ] 11. components/TTSButton.tsx 작성
[ ] 12. (MP3 방식) scripts/build-tts.ts 작성 + npm run build:tts
[ ] 13. vite.config.ts runtimeCaching에 audio CacheFirst 추가
[ ] 14. npm run typecheck 통과 확인
[ ] 15. npm run build 성공 확인
[ ] 16. GitHub Pages 배포 후 PWA 설치 테스트 (실제 기기)
```

---

## 공통 tsconfig 설정

PWA + TTS + 오디오를 사용하는 모든 프로젝트에 아래 설정을 반드시 포함한다.

**`tsconfig.app.json`**:
```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable", "WebWorker"],
    "skipLibCheck": true
  }
}
```

**`tsconfig.node.json`**:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

| 옵션 | 이유 |
|------|------|
| `"WebWorker"` in lib | vite-plugin-pwa / workbox 타입이 Service Worker 전역(`ExtendableEvent`, `CacheQueryOptions` 등)을 참조 |
| `"skipLibCheck": true` in app | vite-plugin-pwa가 import되면 node_modules 타입 파일까지 검사하며 오류 발생 |
| `"skipLibCheck": true` in node | vite.config.ts가 PWA 플러그인 import 시 동일 문제 |
