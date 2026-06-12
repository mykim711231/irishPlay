# SMCB_13. 학습 진도 & 즐겨찾기

> 레퍼런스: `D:\_Git\SMCB\app\src\stores\progress.ts`, `stores\favorites.ts`

---

## 학습 진도 — useProgress

### stores/useProgress.ts

```typescript
// app/src/stores/useProgress.ts
import { create } from 'zustand';
import { dbGet, dbSet } from '@/lib/db';

// ── 타입 ─────────────────────────────────────────────────────
type ItemProgress = {
  read?:        boolean;      // 완료/읽음 체크마크
  lastVisited?: string;       // ISO 날짜 — 마지막 방문 시각
};

type ProgressState = {
  byId:         Record<string, ItemProgress>;
  lastItemId:   string | null;    // 마지막으로 방문한 항목 id → "이어서" CTA

  markDone:     (id: string, done: boolean) => void;
  visit:        (id: string) => void;
  hydrate:      () => Promise<void>;
};

// ── 버전 키 ─────────────────────────────────────────────────
const KEY = 'progress:v1';

// ── Store ─────────────────────────────────────────────────────
export const useProgress = create<ProgressState>((set, get) => ({
  byId:       {},
  lastItemId: null,

  // 체크마크 토글 (완료/미완료)
  markDone: (id, done) => {
    const next = {
      ...get().byId,
      [id]: { ...get().byId[id], read: done },
    };
    set({ byId: next });
    void dbSet(KEY, { byId: next, lastItemId: get().lastItemId });
  },

  // 방문 기록 — 마지막 방문 시각 갱신 + lastItemId 업데이트
  visit: (id) => {
    const next = {
      ...get().byId,
      [id]: { ...get().byId[id], lastVisited: new Date().toISOString() },
    };
    set({ byId: next, lastItemId: id });
    void dbSet(KEY, { byId: next, lastItemId: id });
  },

  hydrate: async () => {
    const saved = await dbGet<{ byId: Record<string, ItemProgress>; lastItemId: string | null }>(KEY);
    if (saved) set(saved);
  },
}));

// ── 순수 함수 헬퍼 ─────────────────────────────────────────────
export function progressPercent(
  byId: Record<string, ItemProgress>,
  totalItems: number,
): number {
  if (totalItems === 0) return 0;
  const done = Object.values(byId).filter((p) => p.read).length;
  return Math.round((done / totalItems) * 100);
}
```

### 사용 예

```tsx
// 목록 아이템 — 완료 체크마크
import { useProgress } from '@/stores/useProgress';
import { Check } from 'lucide-react';

function TuneListItem({ tune }: { tune: Tune }) {
  const progress = useProgress((s) => s.byId[tune.id]);
  const markDone = useProgress((s) => s.markDone);
  const visit    = useProgress((s) => s.visit);

  return (
    <div className="flex items-center gap-3 p-4">
      <a
        href={`#/tune/${tune.id}`}
        onClick={() => visit(tune.id)}  // 방문 기록
        className="flex-1 text-sm text-fg"
      >
        {tune.title}
      </a>
      {/* 완료 토글 */}
      <button
        type="button"
        onClick={() => markDone(tune.id, !progress?.read)}
        aria-label={progress?.read ? '완료 취소' : '완료 표시'}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
          ${progress?.read
            ? 'bg-primary border-primary text-white'
            : 'border-divider text-transparent'}`}
      >
        <Check size={14} aria-hidden />
      </button>
    </div>
  );
}

// 홈 — "이어서" CTA
function ContinueCTA() {
  const lastItemId = useProgress((s) => s.lastItemId);
  if (!lastItemId) return null;

  return (
    <a
      href={`#/tune/${lastItemId}`}
      className="block bg-primary/10 text-primary text-sm font-semibold
        rounded-2xl px-4 py-3"
    >
      이어서 학습하기 →
    </a>
  );
}

// 진도 바
function ProgressBar({ total }: { total: number }) {
  const byId = useProgress((s) => s.byId);
  const pct  = progressPercent(byId, total);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted">
        <span>학습 진도</span>
        <span>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
        className="h-2 bg-divider rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
```

---

## 즐겨찾기 — useFavorites

### stores/useFavorites.ts

```typescript
// app/src/stores/useFavorites.ts
import { create } from 'zustand';
import { dbGet, dbSet } from '@/lib/db';

// ── 즐겨찾기 키 생성 ───────────────────────────────────────────
// 항목 종류가 여러 개인 경우 복합 키 사용
// 단순 앱은 id만으로도 충분
export function favKey(itemId: string, kind = 'item'): string {
  return `${kind}::${itemId}`;
}

// ── 타입 ─────────────────────────────────────────────────────
type FavoritesState = {
  items:    Record<string, true>;   // value = true만 저장 (Set의 JSON-직렬화 대체)

  toggle:   (key: string) => void;
  has:      (key: string) => boolean;
  hydrate:  () => Promise<void>;
};

const KEY = 'favorites:v1';

// ── Store ─────────────────────────────────────────────────────
export const useFavorites = create<FavoritesState>((set, get) => ({
  items: {},

  toggle: (key) => {
    const next = { ...get().items };
    if (next[key]) delete next[key];
    else next[key] = true;
    set({ items: next });
    void dbSet(KEY, next);
  },

  // ⚠️ has()는 참조가 매번 새로 생성되므로 컴포넌트에서 구독하면 리렌더 과다 발생
  // 컴포넌트에서는 s.items[key]를 직접 구독할 것
  has: (key) => Boolean(get().items[key]),

  hydrate: async () => {
    const saved = await dbGet<Record<string, true>>(KEY);
    if (saved) set({ items: saved });
  },
}));
```

### 사용 예

```tsx
// 즐겨찾기 토글 버튼
import { useFavorites, favKey } from '@/stores/useFavorites';
import { Star } from 'lucide-react';

function FavoriteButton({ tuneId }: { tuneId: string }) {
  const key      = favKey(tuneId, 'tune');

  // ✅ items 객체를 구독 (toggle() 구독은 리렌더 과다)
  const isFav    = useFavorites((s) => Boolean(s.items[key]));
  const toggle   = useFavorites((s) => s.toggle);

  return (
    <button
      type="button"
      onClick={() => toggle(key)}
      aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      aria-pressed={isFav}
      className={`w-10 h-10 flex items-center justify-center rounded-full
        transition active:scale-95
        ${isFav ? 'text-amber-400' : 'text-muted hover:text-fg'}`}
    >
      <Star
        size={20}
        fill={isFav ? 'currentColor' : 'none'}
        aria-hidden
      />
    </button>
  );
}

// 즐겨찾기 목록 필터링
function FavoritesList() {
  const items = useFavorites((s) => s.items);
  const tunes = useTunes();

  const favTunes = tunes.filter((t) => Boolean(items[favKey(t.id, 'tune')]));

  if (favTunes.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">
        즐겨찾기가 없어요. ★ 버튼으로 추가하세요.
      </p>
    );
  }

  return (
    <ul>
      {favTunes.map((t) => <TuneListItem key={t.id} tune={t} />)}
    </ul>
  );
}
```

---

## main.tsx — hydrate 등록

```typescript
// app/src/main.tsx
import { useProgress }   from '@/stores/useProgress';
import { useFavorites }  from '@/stores/useFavorites';

void useProgress.getState().hydrate();
void useFavorites.getState().hydrate();
```

---

## 구조 요약

| 스토어 | 퍼시스트 키 | 핵심 데이터 |
|--------|------------|-----------|
| `useProgress` | `progress:v1` | `byId[id].read` + `lastItemId` |
| `useFavorites` | `favorites:v1` | `items[key] = true` |

- **즐겨찾기**: `Record<string, true>` — Set의 JSON 직렬화 대체 패턴
- **진도**: `read` 불리언 + `lastVisited` ISO 문자열 두 필드만으로 TOC 체크마크 + 홈 "이어서" CTA 모두 구동
- `has()` 함수는 Zustand 구독에 쓰면 리렌더 과다 — 컴포넌트는 `s.items[key]`를 직접 구독
