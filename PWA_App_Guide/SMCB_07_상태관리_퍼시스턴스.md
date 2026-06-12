# 07. 상태 관리 & 퍼시스턴스

> 레퍼런스: `D:\_Git\SMCB\app\src\stores\`, `lib/db.ts`, `lib/storage.ts`

---

## 스택

| 역할 | 라이브러리 | 비고 |
|------|-----------|------|
| 전역 상태 | `zustand` | 간결한 API, React 없이도 읽기/쓰기 가능 |
| 영구 저장소 | `idb-keyval` | IndexedDB thin wrapper (localStorage 대체) |
| 스토리지 승격 | `navigator.storage.persist()` | iOS 7일 자동삭제 방지 |

```bash
npm install zustand idb-keyval
```

---

## 패턴 — Zustand + idb-keyval hydrate

SMCB의 모든 store가 동일한 구조를 따른다:

```typescript
// app/src/stores/useSettings.ts (패턴 예시)
import { create } from 'zustand';
import { dbGet, dbSet } from '@/lib/db';

// ── 타입 ─────────────────────────────────────────────────────
export type Theme = 'light' | 'dark' | 'system';

type SettingsState = {
  theme: Theme;
  // ... 기타 설정

  // 액션
  setTheme:  (t: Theme) => void;

  // 퍼시스턴스
  hydrate:   () => Promise<void>;
  persist:   () => Promise<void>;
};

// ── 버전 키 ────────────────────────────────────────────────────
// 스키마 변경 시 v2, v3 ... 올려서 마이그레이션
const KEY = 'settings:v1';

// ── 기본값 ─────────────────────────────────────────────────────
const DEFAULT: Pick<SettingsState, 'theme'> = {
  theme: 'system',
};

// ── Store ──────────────────────────────────────────────────────
export const useSettings = create<SettingsState>((set, get) => ({
  ...DEFAULT,

  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme);          // DOM side-effect 즉시 실행
    void get().persist();       // 비동기 저장 (fire-and-forget)
  },

  hydrate: async () => {
    const saved = await dbGet<typeof DEFAULT>(KEY);
    if (!saved) return;
    set(saved);
    applyTheme(saved.theme);   // 저장된 설정 즉시 적용
  },

  persist: async () => {
    const { theme } = get();
    await dbSet(KEY, { theme });
  },
}));
```

---

## lib/db.ts — IndexedDB 래퍼

```typescript
// app/src/lib/db.ts
import { createStore, get, set, del, keys } from 'idb-keyval';

// 앱 전용 store (다른 앱과 격리)
const store = createStore('{프로젝트명}-db', 'kv');
//                         ↑ 예: 'irishplay-db'

export async function dbGet<T>(key: string): Promise<T | undefined> {
  return get<T>(key, store);
}

export async function dbSet<T>(key: string, value: T): Promise<void> {
  return set(key, value, store);
}

export async function dbDel(key: string): Promise<void> {
  return del(key, store);
}

export async function dbKeys(): Promise<IDBValidKey[]> {
  return keys(store);
}
```

---

## lib/storage.ts — 스토리지 승격 + 캐시 통계

```typescript
// app/src/lib/storage.ts

// iOS는 기본적으로 7일 미사용 시 SW 캐시를 삭제한다.
// persist() 요청이 승인되면 사용자가 명시적으로 삭제할 때까지 유지된다.
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  const granted = await navigator.storage.persist();
  if (!granted) {
    console.info('[storage] persistent storage not granted — iOS may clear cache after 7 days');
  }
  return granted;
}

// 캐시 사용량 확인 (설정 화면 표시용)
export async function getStorageEstimate(): Promise<{
  used: number;
  total: number;
  pct: number;
} | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return {
    used:  usage,
    total: quota,
    pct:   quota > 0 ? Math.round((usage / quota) * 100) : 0,
  };
}

// 캐시 전체 삭제 (설정 > 캐시 초기화)
export async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}
```

---

## main.tsx — hydrate 호출 위치

```typescript
// app/src/main.tsx — 렌더 전에 hydrate (fire-and-forget)
import { useSettings }  from '@/stores/useSettings';
import { requestPersistentStorage } from '@/lib/storage';

// 저장된 설정 복원 (테마, 폰트 등)
void useSettings.getState().hydrate();

// iOS 7일 자동삭제 방지
void requestPersistentStorage();

// 그 다음 createRoot().render(...)
```

---

## 스키마 마이그레이션 패턴

설정 구조가 바뀌면 구버전 키를 읽어 새 키에 마이그레이션:

```typescript
// hydrate() 내부
const KEY_V2 = 'settings:v2';
const KEY_V1 = 'settings:v1';   // 구버전

hydrate: async () => {
  // 신버전 시도
  const saved = await dbGet<SettingsV2>(KEY_V2);
  if (saved) { set(saved); return; }

  // 구버전 마이그레이션
  const old = await dbGet<SettingsV1>(KEY_V1);
  if (old) {
    const migrated: SettingsV2 = {
      ...DEFAULT,
      theme: old.theme,           // 유지할 필드만 매핑
      // 새 필드는 DEFAULT 값 사용
    };
    set(migrated);
    await dbSet(KEY_V2, migrated);
    await dbDel(KEY_V1);          // 구버전 키 삭제
  }
},
```

---

## Store 파일 구성 가이드

```
app/src/stores/
├── useSettings.ts    ← 테마/폰트/사용자 설정 (persist)
├── useProgress.ts    ← 읽음 상태, 진행도 (persist)
├── useFavorites.ts   ← 즐겨찾기 (persist)
└── useUpdateStore.ts ← SW 설치 상태 (메모리만, persist 불필요)
```

**persist가 필요한 store**: 사용자 설정, 진행 상태, 즐겨찾기  
**메모리만 사용하는 store**: UI 상태 (모달 열림, 탭 선택 등)

---

## 주의사항

- `localStorage.setItem`은 사용하지 않는다 — iOS PWA에서 용량 제한(5MB)이 있고, 자동삭제 대상
- `idb-keyval`은 비동기 → hydrate는 반드시 `await` 또는 Promise 처리
- `hydrate()`는 첫 렌더 전 호출하되 렌더를 막지 않는다 (기본값으로 렌더 후 저장값 적용)
- Zustand는 React 없이도 `useSettings.getState().setTheme()` 직접 호출 가능 (sw.ts, 스크립트에서도 사용 가능)
