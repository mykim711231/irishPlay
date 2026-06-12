// App: 라우팅 — TuneView는 lazy load (abcjs·tone을 초기 번들에서 제외)

import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TuneList } from './components/TuneList';

// 동적 import → abcjs(503 kB)·tone(247 kB)이 /tune/:id 첫 방문 시에만 로드됨
const TuneView = lazy(() => import('./routes/TuneView'));

// 악보 청크 로딩 중 표시할 최소 스켈레톤
function TuneViewSkeleton(): JSX.Element {
  return (
    <div
      className="flex flex-col h-full items-center justify-center gap-3"
      style={{ background: 'var(--bg)' }}
    >
      <span style={{ fontSize: '2rem' }}>☘️</span>
      <p className="text-sm" style={{ color: 'var(--dim)' }}>악보 불러오는 중…</p>
    </div>
  );
}

// ── 라우터 루트 ──
export default function App(): JSX.Element {
  return (
    <Routes>
      {/* §13 / → TuneList (eager: 초기 번들에 포함) */}
      <Route path="/" element={<TuneList />} />

      {/* §13 /tune/:id → 곡 플레이어 (lazy: 첫 방문 시 로드) */}
      <Route
        path="/tune/:id"
        element={
          <Suspense fallback={<TuneViewSkeleton />}>
            <TuneView />
          </Suspense>
        }
      />

      {/* §13 * → / 리디렉트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
