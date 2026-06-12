# 06. 라우팅 & 코드 스플리팅

> 레퍼런스: `D:\_Git\SMCB\app\src\main.tsx`, `App.tsx`, `components/ErrorBoundary.tsx`

---

## HashRouter vs BrowserRouter

| 방식 | URL 형태 | GitHub Pages | Cloudflare/Vercel |
|------|---------|-------------|-----------------|
| **HashRouter** | `/#/path` | ✅ 설정 불필요 | ✅ |
| BrowserRouter | `/path` | ❌ 404 발생 | ✅ (`_redirects` 필요) |

**GitHub Pages 배포 기본값은 HashRouter.**

---

## main.tsx — HashRouter 설정

```tsx
// app/src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/tokens.css';
import './styles/index.css';

// Zustand 퍼시스턴스 수화 — 첫 렌더 전에 fire-and-forget
import { useSettings } from '@/stores/settings';
void useSettings.getState().hydrate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
```

---

## App.tsx — lazy + Suspense + ErrorBoundary

```tsx
// app/src/App.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from '@/components/ErrorBoundary';

// 모든 페이지를 lazy import — 초기 번들 크기 최소화
const Home     = lazy(() => import('@/pages/Home'));
const TuneView = lazy(() => import('@/pages/TuneView'));
const Settings = lazy(() => import('@/pages/Settings'));
// ... 추가 페이지

// 페이지 전환 중 표시할 로딩 UI
function PageFallback(): JSX.Element {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh]"
      aria-live="polite"
      aria-label="페이지 로딩 중"
    >
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent
        animate-spin" aria-hidden />
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    // ErrorBoundary: lazy chunk 로드 실패 시 흰 화면 방지
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/tune/:id"  element={<TuneView />} />
          <Route path="/settings"  element={<Settings />} />

          {/* 구 경로 호환 — 리다이렉트 */}
          <Route path="/old-path"  element={<Navigate to="/" replace />} />

          {/* 404 — 홈으로 */}
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## ErrorBoundary.tsx

lazy chunk 로드 실패(오프라인 + 미캐시 라우트 접근) 시 흰 화면 대신 재시도 UI 표시.

```tsx
// app/src/components/ErrorBoundary.tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { RefreshCw } from 'lucide-react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh]
          gap-4 px-4 text-center"
        role="alert"
      >
        <p className="text-fg font-semibold">페이지를 불러오지 못했어요.</p>
        <p className="text-sm text-muted">
          오프라인 상태이거나 앱을 다시 설치해야 할 수 있어요.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-full bg-primary
            text-white text-sm font-semibold px-5 py-2.5"
        >
          <RefreshCw size={16} aria-hidden />
          다시 시도
        </button>
      </div>
    );
  }
}
```

---

## vite.config.ts — manualChunks 설정

```typescript
// app/vite.config.ts
build: {
  target: 'es2017',
  rollupOptions: {
    output: {
      manualChunks: {
        // React 생태계 — 변경 빈도 낮음 → 캐시 효율 높음
        react: ['react', 'react-dom', 'react-router-dom'],
        // 상태 관리
        state: ['zustand', 'idb-keyval'],
        // 무거운 라이브러리는 별도 청크로 (예: abcjs, tone)
        abcjs: ['abcjs'],
        tone:  ['tone'],
      },
    },
  },
},
```

---

## 라우팅 패턴 요약

```
├── /              → 홈 (목록)
├── /tune/:id      → 개별 곡 뷰
├── /settings      → 설정
└── *              → / 로 redirect (404 처리)
```

- 페이지 컴포넌트는 모두 `lazy()` 래핑
- 공통 레이아웃(Header, BottomNav)은 각 페이지 내부 또는 별도 `<Layout>` 컴포넌트로 처리
- 뒤로가기: `useNavigate()` 훅 또는 `<Link>` 컴포넌트 사용 (브라우저 히스토리 활용)
