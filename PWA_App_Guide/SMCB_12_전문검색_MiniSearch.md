# SMCB_12. 전문 검색 — MiniSearch

> 레퍼런스: `D:\_Git\SMCB\app\src\lib\search.ts`, `scripts\build-search-index.ts`

---

## 아키텍처 — 빌드타임 인덱스 + 런타임 검색

```
빌드타임
  src/data/tunes.json (또는 다른 데이터)
    └── scripts/build-search-index.ts
          └── public/search-index.json  ← MiniSearch 직렬화 인덱스

런타임
  사용자 검색어 입력
    └── lib/search.ts
          ├── loadIndex()  ← public/search-index.json 최초 1회 fetch (세션 캐시)
          └── search(query) → SearchHit[]
```

---

## 필요 패키지

```bash
npm install minisearch
npm install -D tsx
```

```json
"minisearch": "^7.x"
```

---

## Step 1 — 인덱스 빌드 스크립트

```typescript
// app/scripts/build-search-index.ts
import MiniSearch from 'minisearch';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ── tokenizer / processTerm ─────────────────────────────────
// 런타임 lib/search.ts와 완전히 동일해야 한다 (검색 결과 일관성)

function tokenize(text: string): string[] {
  // 한자: 1글자씩 분리 (Unicode CJK 범위)
  // 그 외(영문, 한글): 공백 + 구두점 분리
  const tokens: string[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x4e00 && code <= 0x9fff) {
      tokens.push(char);  // CJK 한 글자씩
    }
  }
  const latin = text.replace(/[一-鿿]/g, ' ').split(/[\s,.!?;:'"()\[\]]+/);
  return [...tokens, ...latin.filter(Boolean)];
}

function processTerm(term: string): string | null {
  if (!term) return null;
  // NFD 분해 후 combining 문자(성조·발음기호) 제거 → 무성조/무발음 검색 지원
  return term.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ── 인덱스 필드 정의 ──────────────────────────────────────────
// 프로젝트에 맞게 수정
type SearchDoc = {
  id:    string;   // '::' 구분자로 메타 내장 → storeFields 불필요
  title: string;
  type:  string;   // 예: reel, jig, polka
  tags?: string;
};

// ── 데이터 로드 ────────────────────────────────────────────────
const DATA_DIR = join(import.meta.dirname, '..', 'src', 'data');
const tunes = JSON.parse(readFileSync(join(DATA_DIR, 'tunes.json'), 'utf-8')) as any[];

const docs: SearchDoc[] = tunes.map((tune) => ({
  id:    tune.id,
  title: tune.title,
  type:  tune.type ?? '',
  tags:  (tune.tags ?? []).join(' '),
}));

// ── 인덱스 생성 ────────────────────────────────────────────────
const ms = new MiniSearch<SearchDoc>({
  fields:       ['title', 'type', 'tags'],
  storeFields:  [],            // ← id에 메타를 담아 크기 절감 (SMCB -12%)
  idField:      'id',
  tokenize,
  processTerm,
});
ms.addAll(docs);

// ── 저장 ───────────────────────────────────────────────────────
const OUT = join(import.meta.dirname, '..', 'public', 'search-index.json');
writeFileSync(OUT, JSON.stringify(ms.toJSON()), 'utf-8');
console.log(`✓ search-index.json 생성 — ${docs.length}개 문서`);
```

### package.json 스크립트

```json
{
  "scripts": {
    "build:search": "tsx scripts/build-search-index.ts",
    "build": "npm run build:search && tsc -b && vite build"
  }
}
```

---

## Step 2 — 런타임 검색 모듈

```typescript
// app/src/lib/search.ts
import MiniSearch from 'minisearch';

// ── tokenize / processTerm ──────────────────────────────────
// 빌드 스크립트와 완전히 동일 (복사하여 유지)
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x4e00 && code <= 0x9fff) tokens.push(char);
  }
  const latin = text.replace(/[一-鿿]/g, ' ').split(/[\s,.!?;:'"()\[\]]+/);
  return [...tokens, ...latin.filter(Boolean)];
}

function processTerm(term: string): string | null {
  if (!term) return null;
  return term.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ── 세션 캐시 — 최초 1회만 fetch ────────────────────────────
let msPromise: Promise<MiniSearch> | null = null;

async function loadIndex(): Promise<MiniSearch> {
  if (msPromise) return msPromise;
  msPromise = fetch(`${import.meta.env.BASE_URL}search-index.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`search-index fetch failed: ${r.status}`);
      return r.json();
    })
    .then((json) => MiniSearch.loadJSON(JSON.stringify(json), {
      fields: ['title', 'type', 'tags'],
      tokenize,
      processTerm,
    }))
    .catch((e) => { msPromise = null; throw e; });  // 실패 시 캐시 초기화
  return msPromise;
}

// ── 결과 타입 ─────────────────────────────────────────────────
export type SearchHit = {
  id:    string;
  score: number;
  // 필요한 경우 storeFields로 추가 메타 포함
};

// ── 검색 ──────────────────────────────────────────────────────
export async function search(
  query: string,
  limit = 50,
): Promise<SearchHit[]> {
  if (!query.trim()) return [];

  const ms = await loadIndex();
  const results = ms.search(query, {
    combineWith: 'AND',   // 모든 단어가 포함된 결과만
    prefix:      true,    // 부분 일치 (접두사)
    fuzzy:       0.1,     // 오타 허용 (0~1, 0.1 = 10%)
    boost:       { title: 2 },  // 제목에 가중치
  });

  return results.slice(0, limit).map((r) => ({
    id:    String(r.id),
    score: r.score,
  }));
}

// ── 인덱스 워밍업 (선택) ──────────────────────────────────────
// 앱 시작 시 백그라운드에서 미리 로드 (첫 검색 지연 없애기)
export function warmupSearch(): void {
  void loadIndex().catch(() => {});
}
```

---

## Step 3 — 검색 페이지

```tsx
// app/src/pages/Search.tsx
import { useState, useEffect, useCallback } from 'react';
import { SearchIcon, X } from 'lucide-react';
import { search, type SearchHit } from '@/lib/search';
import { useTunes } from '@/hooks/useTunes';

const DEBOUNCE_MS = 180;

export default function SearchPage(): JSX.Element {
  const [query,   setQuery]   = useState('');
  const [hits,    setHits]    = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const tunes = useTunes();

  // 디바운스 검색
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setHits([]); return; }
    setLoading(true);
    void search(q).then((results) => {
      setHits(results);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  return (
    <div className="flex flex-col h-full">
      {/* 검색 입력창 */}
      <div className="sticky top-0 z-10 bg-bg px-4 py-3 border-b border-divider">
        <div className="relative">
          <SearchIcon
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="곡 제목 검색…"
            autoFocus
            className="w-full bg-surface border border-divider rounded-full
              pl-10 pr-10 py-2 text-sm text-fg placeholder:text-muted
              focus:outline-none focus:border-primary"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색어 지우기"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* 결과 목록 */}
      <div
        className="flex-1 overflow-y-auto"
        role="region"
        aria-label="검색 결과"
        aria-live="polite"
      >
        {loading && (
          <p className="text-center text-sm text-muted py-8">검색 중…</p>
        )}
        {!loading && hits.length === 0 && query && (
          <p className="text-center text-sm text-muted py-8">
            "{query}" 검색 결과가 없어요.
          </p>
        )}
        {hits.map(({ id }) => {
          const tune = tunes.find((t) => t.id === id);
          if (!tune) return null;
          return (
            <a
              key={id}
              href={`#/tune/${id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-divider
                hover:bg-primary/5 active:bg-primary/10"
            >
              <div>
                <p className="text-sm font-medium text-fg">{tune.title}</p>
                <p className="text-xs text-muted">{tune.type}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
```

---

## vite.config.ts — 검색 인덱스 캐시

```typescript
// workbox runtimeCaching에 추가
{
  urlPattern: /search-index\.json$/,
  handler: 'CacheFirst',
  options: {
    cacheName: 'search-index',
    expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 30 },
    cacheableResponse: { statuses: [200] },
  },
},
```

---

## 주의사항

- `tokenize` / `processTerm` 함수는 빌드 스크립트와 **완전히 동일**해야 한다. 두 곳을 같이 수정하거나 공유 모듈로 추출한다.
- `storeFields: []` — id에 메타를 내장하면 인덱스 파일 크기를 약 12% 절감한다.
- 빌드 후 인덱스 파일이 `public/search-index.json`에 있어야 SW precache 대상에 포함된다.
- 검색 인덱스가 클 경우(1MB+) `warmupSearch()`로 앱 시작 시 미리 로드한다.
