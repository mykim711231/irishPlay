# SMCB_14. SRS 플래시카드 — Leitner / SM-2

> 레퍼런스: `D:\_Git\SMCB\app\src\stores\srs.ts`, `lib\srs-stats.ts`, `components\flashcards\`

---

## 개념 — 간격 반복 학습 (Spaced Repetition)

카드를 채점(again / hard / good / easy)하면 다음 복습 일정이 자동 계산된다.  
SMCB는 두 알고리즘을 지원:

| 알고리즘 | 특징 | 적합한 경우 |
|---------|------|-----------|
| **Leitner** | 5단계 박스, 간단한 규칙 | 입문자, 카드 수 적음 |
| **SM-2** | Ease Factor + 동적 간격 | 장기 학습, 카드 수 많음 |

---

## 채점 단계

```
again  → 다시 (틀림)
hard   → 어려웠음
good   → 맞음
easy   → 쉬움
```

---

## stores/useSRS.ts — 핵심 구현

```typescript
// app/src/stores/useSRS.ts
import { create } from 'zustand';
import { dbGet, dbSet } from '@/lib/db';

// ── 타입 ─────────────────────────────────────────────────────
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export type CardRecord = {
  box:             number;    // Leitner 박스 1~5 (SM-2에서도 표시용 유지)
  intervalDays:    number;    // 다음 복습까지 일수
  ease:            number;    // SM-2 Ease Factor (1.3~2.8)
  reps:            number;    // 연속 정답 횟수
  dueAt:           string;    // 다음 복습 ISO 날짜
  lastReviewedAt?: string;
  correctCount:    number;
  wrongCount:      number;
};

type SRSState = {
  cards:   Record<string, CardRecord>;  // 카드id → 기록
  grade:   (id: string, g: Grade, algorithm: 'leitner' | 'sm2') => void;
  isDue:   (id: string) => boolean;
  hydrate: () => Promise<void>;
};

const KEY = 'srs:v1';

// ── 기본 카드 ─────────────────────────────────────────────────
function newCard(): CardRecord {
  return {
    box: 1, intervalDays: 1, ease: 2.5, reps: 0,
    dueAt: new Date().toISOString(),
    correctCount: 0, wrongCount: 0,
  };
}

// ── Leitner 채점 ─────────────────────────────────────────────
// 박스별 간격: 1→1일, 2→3일, 3→7일, 4→14일, 5→30일
const LEITNER_INTERVALS = [0, 1, 3, 7, 14, 30];

function applyLeitner(card: CardRecord, g: Grade): Partial<CardRecord> {
  let box = card.box;
  if (g === 'again')       box = 1;
  else if (g === 'hard')   box = Math.max(1, box - 1);
  else if (g === 'good')   box = Math.min(5, box + 1);
  else if (g === 'easy')   box = Math.min(5, box + 2);

  const intervalDays = LEITNER_INTERVALS[box];
  const dueAt = addDays(new Date(), intervalDays).toISOString();
  return { box, intervalDays, dueAt };
}

// ── SM-2 채점 ────────────────────────────────────────────────
function applySM2(card: CardRecord, g: Grade): Partial<CardRecord> {
  let { ease, reps, intervalDays } = card;

  if (g === 'again') {
    reps = 0; intervalDays = 1; ease = Math.max(1.3, ease - 0.2);
  } else if (g === 'hard') {
    intervalDays = Math.round(intervalDays * 1.2);
    ease = Math.max(1.3, ease - 0.15);
  } else if (g === 'good') {
    if      (reps === 0) intervalDays = 1;
    else if (reps === 1) intervalDays = 6;
    else                 intervalDays = Math.round(intervalDays * ease);
    reps += 1;
  } else if (g === 'easy') {
    intervalDays = Math.round(intervalDays * ease * 1.3);
    ease = Math.min(2.8, ease + 0.15);
    reps += 1;
  }

  // box는 표시용 — intervalDays 역매핑
  const box = intervalDays <= 1 ? 1
            : intervalDays <= 3 ? 2
            : intervalDays <= 7 ? 3
            : intervalDays <= 14 ? 4 : 5;

  const dueAt = addDays(new Date(), intervalDays).toISOString();
  return { box, intervalDays, ease, reps, dueAt };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ── Store ─────────────────────────────────────────────────────
export const useSRS = create<SRSState>((set, get) => ({
  cards: {},

  grade: (id, g, algorithm) => {
    const cur  = get().cards[id] ?? newCard();
    const diff = algorithm === 'sm2' ? applySM2(cur, g) : applyLeitner(cur, g);

    const updated: CardRecord = {
      ...cur,
      ...diff,
      lastReviewedAt: new Date().toISOString(),
      correctCount: g !== 'again' ? cur.correctCount + 1 : cur.correctCount,
      wrongCount:   g === 'again' ? cur.wrongCount   + 1 : cur.wrongCount,
    };

    const cards = { ...get().cards, [id]: updated };
    set({ cards });
    void dbSet(KEY, cards);
  },

  isDue: (id) => {
    const card = get().cards[id];
    if (!card) return true;  // 새 카드 = 즉시 복습
    return new Date(card.dueAt) <= new Date();
  },

  hydrate: async () => {
    const saved = await dbGet<Record<string, CardRecord>>(KEY);
    if (saved) set({ cards: saved });
  },
}));
```

---

## 플래시카드 덱 빌드 — 필터 종류

```typescript
// 복습 대상 카드 필터링
export function buildDeck(
  allIds:  string[],
  cards:   Record<string, CardRecord>,
  filter:  'due' | 'all' | 'new' | 'lapses',
): string[] {
  return allIds.filter((id) => {
    const card = cards[id];
    if (!card)                                return filter !== 'lapses';
    if (filter === 'due')                     return new Date(card.dueAt) <= new Date();
    if (filter === 'new')                     return card.reps === 0;
    if (filter === 'lapses')                  return card.wrongCount > 0;
    return true;  // 'all'
  });
}
```

---

## FlashcardPlayer.tsx — 핵심 구조

```tsx
// app/src/components/FlashcardPlayer.tsx
import { useState } from 'react';
import { useSRS } from '@/stores/useSRS';

type Props = {
  deck:       string[];    // 카드 id 배열
  algorithm:  'leitner' | 'sm2';
  renderCard: (id: string, revealed: boolean) => JSX.Element;
  onFinish?:  () => void;
};

export function FlashcardPlayer({ deck, algorithm, renderCard, onFinish }: Props) {
  const [idx,      setIdx]      = useState(0);
  const [revealed, setRevealed] = useState(false);
  const grade = useSRS((s) => s.grade);

  if (idx >= deck.length) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-lg font-bold text-fg">완료! 🎉</p>
        <p className="text-sm text-muted">{deck.length}장 복습했어요.</p>
        <button
          type="button"
          onClick={onFinish}
          className="rounded-full bg-primary text-white px-6 py-2.5 text-sm font-semibold"
        >
          닫기
        </button>
      </div>
    );
  }

  const id = deck[idx];

  const handleGrade = (g: 'again' | 'hard' | 'good' | 'easy') => {
    grade(id, g, algorithm);
    setRevealed(false);
    setIdx((v) => v + 1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 진행 표시 */}
      <div className="px-4 py-2">
        <div
          role="progressbar"
          aria-valuemin={0} aria-valuemax={deck.length} aria-valuenow={idx}
          className="h-1.5 bg-divider rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(idx / deck.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted mt-1">{idx} / {deck.length}</p>
      </div>

      {/* 카드 */}
      <div className="flex-1 flex items-center justify-center px-4">
        {renderCard(id, revealed)}
      </div>

      {/* 버튼 */}
      {!revealed ? (
        <div className="px-4 pb-8">
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="w-full rounded-2xl bg-surface border border-divider
              text-fg font-semibold py-4"
          >
            정답 보기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 px-4 pb-8">
          {(['again', 'hard', 'good', 'easy'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleGrade(g)}
              className={`rounded-2xl py-3 text-sm font-bold ${
                g === 'again' ? 'bg-red-500/10 text-red-500' :
                g === 'hard'  ? 'bg-amber-500/10 text-amber-500' :
                g === 'good'  ? 'bg-primary/10 text-primary' :
                                'bg-green-500/10 text-green-600'
              }`}
            >
              {g === 'again' ? '다시' :
               g === 'hard'  ? '어려움' :
               g === 'good'  ? '맞음' : '쉬움'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## SRS 통계 계산

```typescript
// app/src/lib/srs-stats.ts
import type { CardRecord } from '@/stores/useSRS';

export type SRSStats = {
  total:    number;
  new:      number;   // 한 번도 복습 안 한 카드
  due:      number;   // 오늘 복습 대상
  learned:  number;   // 1회 이상 복습 완료
  lapses:   number;   // 틀린 적 있는 카드
};

export function calcStats(
  allIds: string[],
  cards:  Record<string, CardRecord>,
): SRSStats {
  const now = new Date();
  return allIds.reduce<SRSStats>(
    (acc, id) => {
      const c = cards[id];
      acc.total++;
      if (!c || c.reps === 0)           acc.new++;
      if (!c || new Date(c.dueAt) <= now) acc.due++;
      if (c  && c.reps > 0)             acc.learned++;
      if (c  && c.wrongCount > 0)       acc.lapses++;
      return acc;
    },
    { total: 0, new: 0, due: 0, learned: 0, lapses: 0 }
  );
}
```
