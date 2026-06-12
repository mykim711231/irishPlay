# SMCB_16. 온보딩 & 최초 진입 UX

> 레퍼런스: `D:\_Git\SMCB\app\src\components\OnboardingCard.tsx`

---

## 언제 필요한가

- 앱에 **초기 설정이 필요한 경우** (예: 음성 모드 선택, 언어 선택)
- **사전 다운로드**가 필요한 경우 (오프라인 MP3, 검색 인덱스 등)
- 첫 실행과 재방문을 구분해 **다시 물어보지 않는** 처리가 필요한 경우

---

## 2단계 온보딩 패턴

SMCB는 `step`과 `settingValue !== null` 두 가지 가드를 분리해서 처리한다.

```
step = 'choice'    → 선택 화면 표시 (settingValue === null 일 때)
step = 'download'  → 다운로드 화면 표시 (선택 완료 후)

settingValue !== null → 선택 완료 → 'choice' 화면 숨김
단, 'download' 단계는 settingValue가 채워져도 유지 (진행 중 언마운트 방지)
```

---

## components/OnboardingCard.tsx

```tsx
// app/src/components/OnboardingCard.tsx
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/stores/useSettings';

type Step = 'choice' | 'download';
type DownloadStatus = 'idle' | 'running' | 'done' | 'partial' | 'skipped' | 'error';

export default function OnboardingCard(): JSX.Element | null {
  const hydrated    = useSettings((s) => s.hydrated);    // hydrate 완료 여부
  const choiceValue = useSettings((s) => s.someChoice);  // 설정값 (null = 미설정)
  const setChoice   = useSettings((s) => s.setSomeChoice);

  const [step,           setStep]           = useState<Step>('choice');
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);

  // ── 렌더 가드 ──────────────────────────────────────────────
  // hydrate 완료 전: 깜빡임 방지 (null 반환)
  if (!hydrated) return null;

  // 선택 완료 + 다운로드 단계가 아닌 경우: 온보딩 숨김
  if (step === 'choice' && choiceValue !== null) return null;

  // ── 선택 A ────────────────────────────────────────────────
  const pickOptionA = () => {
    setChoice('optionA');
    // optionA는 다운로드 불필요 → 바로 완료
  };

  // ── 선택 B (다운로드 필요) ──────────────────────────────────
  const pickOptionB = () => {
    setChoice('optionB');  // persist 즉시 (강제종료 시 재온보딩 방지)
    setStep('download');
    startDownload();
  };

  const startDownload = async () => {
    const ac = new AbortController();
    abortRef.current = ac;
    setDownloadStatus('running');

    try {
      await someDownloadFunction({
        signal: ac.signal,
        onProgress: (pct: number) => {
          // 진행률 업데이트 (선택)
        },
      });
      setDownloadStatus(ac.signal.aborted ? 'skipped' : 'done');
    } catch {
      setDownloadStatus('error');
    }
  };

  const handleSkip = () => {
    abortRef.current?.abort();
    setDownloadStatus('skipped');
  };

  // ── 선택 화면 ─────────────────────────────────────────────
  if (step === 'choice') {
    return (
      <div className="bg-surface rounded-2xl border border-divider p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-fg">설정 선택</h2>
          <p className="text-sm text-muted mt-1">앱 사용 방식을 선택해주세요.</p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={pickOptionA}
            className="w-full text-left rounded-xl border border-divider p-4
              hover:border-primary/50 transition"
          >
            <p className="text-sm font-semibold text-fg">옵션 A</p>
            <p className="text-xs text-muted mt-0.5">인터넷 연결이 필요해요.</p>
          </button>

          <button
            type="button"
            onClick={pickOptionB}
            className="w-full text-left rounded-xl border border-divider p-4
              hover:border-primary/50 transition"
          >
            <p className="text-sm font-semibold text-fg">옵션 B (권장)</p>
            <p className="text-xs text-muted mt-0.5">
              처음 한 번만 데이터를 내려받으면 오프라인에서도 사용할 수 있어요.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // ── 다운로드 화면 ─────────────────────────────────────────
  const isDone = downloadStatus === 'done' || downloadStatus === 'partial'
              || downloadStatus === 'skipped';

  return (
    <div className="bg-surface rounded-2xl border border-divider p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold text-fg">
          {isDone ? '준비 완료!' : '데이터 다운로드 중…'}
        </h2>
        <p className="text-sm text-muted mt-1">
          {downloadStatus === 'done'    && '오프라인에서도 사용할 수 있어요.'}
          {downloadStatus === 'partial' && '일부 데이터를 받지 못했어요. 나중에 재시도할 수 있어요.'}
          {downloadStatus === 'skipped' && '나중에 설정에서 다시 받을 수 있어요.'}
          {downloadStatus === 'error'   && '다운로드에 실패했어요.'}
          {downloadStatus === 'running' && '잠시만 기다려 주세요…'}
        </p>
      </div>

      {downloadStatus === 'running' && (
        <div className="h-1.5 bg-divider rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-pulse w-1/2" />
        </div>
      )}

      <div className="flex gap-2">
        {downloadStatus === 'running' && (
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-muted underline"
          >
            나중에 받기
          </button>
        )}
        {downloadStatus === 'error' && (
          <button
            type="button"
            onClick={startDownload}
            className="text-sm text-primary underline"
          >
            다시 시도
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## useSettings에 hydrated 플래그 추가

```typescript
// stores/useSettings.ts — hydrated 필드 추가
type SettingsState = {
  hydrated:    boolean;    // hydrate() 완료 여부 (초기값 false)
  someChoice:  string | null;  // 온보딩 선택값

  hydrate:     () => Promise<void>;
  setSomeChoice: (v: string) => void;
};

export const useSettings = create<SettingsState>((set, get) => ({
  hydrated:   false,
  someChoice: null,

  setSomeChoice: (v) => {
    set({ someChoice: v });
    void get().persist();
  },

  hydrate: async () => {
    const saved = await dbGet<Omit<SettingsState, 'hydrate' | 'setSomeChoice' | 'persist' | 'hydrated'>>(KEY);
    if (saved) set(saved);
    set({ hydrated: true });   // ← hydrate 완료 마킹
  },
}));
```

---

## 온보딩 배치 — 홈 화면

```tsx
// pages/Home.tsx
import OnboardingCard from '@/components/OnboardingCard';

export default function Home(): JSX.Element {
  return (
    <div className="px-4 py-6 space-y-6">
      {/* 온보딩 — 선택 완료 후 자동 숨김 */}
      <OnboardingCard />

      {/* 이하 일반 콘텐츠 */}
      ...
    </div>
  );
}
```

---

## 핵심 패턴 요약

| 패턴 | 이유 |
|------|------|
| `hydrated` 플래그 | hydrate 전에 렌더하면 잘못된 값으로 순간 표시됨 (깜빡임) |
| 선택 즉시 `persist()` | 강제종료 → 재실행 시 다시 물어보는 현상 방지 |
| `step !== null` 가드 분리 | "선택 완료지만 다운로드 중" 케이스 정확히 처리 |
| `AbortController` | 모드 변경/컴포넌트 언마운트 시 백그라운드 다운로드 안전 중단 |
| `animate-pulse` 진행바 | 실제 진행률 모를 때 indeterminate 표현 |
