# 01. SW 업데이트 흐름

> 레퍼런스: `D:\_Git\SMCB\app\src\sw.ts`, `main.tsx`, `stores/useUpdateStore.ts`, `components/UpdateToast.tsx`

---

## 전략 — B 방식 (silent update on next launch)

| 시점 | 동작 |
|------|------|
| 첫 설치 | precache 진행률 토스트 표시 (downloading → installing → 자동 닫힘) |
| 업데이트 감지 | 사용자에게 알리지 않음. 새 SW는 waiting 대기 |
| 다음 앱 실행 | waiting SW가 자연스럽게 활성화 |

"새 버전이 있습니다, 지금 새로고침?" 방식(A)은 사용자를 방해하므로 사용하지 않는다.

---

## 필요 패키지

```json
// package.json devDependencies
"vite-plugin-pwa": "^0.20.5",
"workbox-window":  "^7.1.0"
```

---

## 파일 구성

```
app/src/
├── stores/
│   └── useUpdateStore.ts   ← 업데이트 상태 (Zustand)
├── components/
│   └── UpdateToast.tsx      ← 진행률 토스트 UI
└── main.tsx                 ← registerSW + postMessage 수신
```

---

## Step 1 — vite.config.ts

```typescript
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'prompt',   // 'autoUpdate' 사용 금지 — B방식에서는 'prompt'
  manifest: { /* ... */ },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  },
})
```

---

## Step 2 — useUpdateStore.ts

```typescript
// app/src/stores/useUpdateStore.ts
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

## Step 3 — UpdateToast.tsx

```tsx
// app/src/components/UpdateToast.tsx
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
  idle:        '',
  downloading: '오프라인 데이터 다운로드 중…',
  installing:  '설치 완료',
  error:       '설치 실패',
};

export default function UpdateToast(): JSX.Element | null {
  const ui      = useUpdateStore((s) => s.ui);
  const retrySW = useUpdateStore((s) => s.retrySW);
  const dismiss = useUpdateStore((s) => s.dismiss);

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
          {ui.phase === 'downloading' && (
            <Loader2 size={14} className="animate-spin text-primary" aria-hidden />
          )}
          {ui.phase === 'error' && (
            <AlertTriangle size={14} className="text-accent" aria-hidden />
          )}
          <span className="text-sm text-fg font-medium flex-1">
            {PHASE_LABEL[ui.phase]}
          </span>
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
              className="inline-flex items-center gap-1.5 rounded-full bg-primary
                text-white text-xs font-bold px-4 py-1.5 flex-1 justify-center"
            >
              <RefreshCw size={12} aria-hidden /> 다시 시도
            </button>
            <button
              type="button"
              onClick={() => dismiss()}
              className="rounded-full border border-divider text-muted text-xs
                font-bold px-4 py-1.5"
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

---

## Step 4 — main.tsx (SW 등록)

```typescript
// app/src/main.tsx 에 추가
import { registerSW } from 'virtual:pwa-register';
import { useUpdateStore } from '@/stores/useUpdateStore';

let installTimeout: ReturnType<typeof setTimeout> | null = null;

function clearInstallTimeout(): void {
  if (installTimeout) { clearTimeout(installTimeout); installTimeout = null; }
}

function failInstall(): void {
  clearInstallTimeout();
  useUpdateStore.getState().setError();
}

function watchInstall(worker: ServiceWorker): void {
  useUpdateStore.getState().setPhase('downloading', 0);
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed') {
      clearInstallTimeout();
      useUpdateStore.getState().setPhase('installing', 100);
      setTimeout(() => useUpdateStore.getState().dismiss(), 2000);
    }
    if (worker.state === 'redundant') {
      failInstall();
    }
  });
  // 5분 타임아웃 — 네트워크 이상으로 설치가 멈추는 경우 대비
  installTimeout = setTimeout(() => failInstall(), 5 * 60 * 1000);
}

registerSW({
  onRegisteredSW(_swUrl: string, r?: ServiceWorkerRegistration) {
    if (!r) return;
    if (r.waiting) return;          // 이미 waiting → 다음 실행 시 적용 (B방식)
    if (r.installing) {
      watchInstall(r.installing);
      return;
    }
    r.update().then(() => {
      if (r.installing) watchInstall(r.installing);
    }).catch(() => {});
  },

  onNeedRefresh() {
    // B 방식: 사용자에게 알리지 않음
    clearInstallTimeout();
    useUpdateStore.getState().dismiss();
  },

  onOfflineReady() {},
});

useUpdateStore.getState().setRetryFn(() => window.location.reload());
```

---

## Step 5 — App.tsx에 마운트

```tsx
// app/src/App.tsx
import UpdateToast from '@/components/UpdateToast';

export default function App(): JSX.Element {
  return (
    <>
      <Routes>...</Routes>
      <UpdateToast />
    </>
  );
}
```

---

## 동작 확인

1. `npm run build && npm run preview`
2. DevTools → Application → Service Workers
3. "Update on reload" 체크 → 새로고침 → 토스트 표시 확인
4. 오류 테스트: 네트워크 차단 후 새로고침 → 에러 토스트 + "다시 시도" 확인
