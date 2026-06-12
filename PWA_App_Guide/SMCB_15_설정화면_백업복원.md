# SMCB_15. 설정 화면 & 데이터 백업/복원

> 레퍼런스: `D:\_Git\SMCB\app\src\pages\Settings.tsx`, `lib\db.ts`, `lib\storage.ts`

---

## 설정 화면 구성 요소

```
Settings
├── 테마 선택        (light / dark / system / sepia)
├── 폰트 크기        (기본 / 크게 / 매우 크게)
├── TTS 설정         (음성 모드 선택)
├── 캐시 관리        (사용량 표시 + 전체 삭제)
├── 데이터 백업      (JSON 파일 다운로드)
└── 데이터 복원      (JSON 파일 업로드)
```

---

## pages/Settings.tsx 핵심 구조

```tsx
// app/src/pages/Settings.tsx
import { useState } from 'react';
import { useSettings } from '@/stores/useSettings';
import { dbExportAll, dbImportAll } from '@/lib/db';
import { getStorageEstimate, clearAllCaches } from '@/lib/storage';
import { ThemeSelector } from '@/components/ThemeSelector';
import { FontSizeSelector } from '@/components/FontSizeSelector';
import { Download, Upload, Trash2 } from 'lucide-react';

export default function Settings(): JSX.Element {
  const [storageInfo, setStorageInfo] = useState<{ used: number; pct: number } | null>(null);
  const [backupState, setBackupState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  // 스토리지 사용량 조회
  const loadStorageInfo = async () => {
    const info = await getStorageEstimate();
    if (info) setStorageInfo(info);
  };

  return (
    <div className="px-4 py-6 space-y-8 max-w-lg mx-auto">

      {/* 테마 */}
      <section aria-labelledby="theme-heading">
        <h2 id="theme-heading" className="text-sm font-semibold text-muted mb-3 uppercase">
          테마
        </h2>
        <ThemeSelector />
      </section>

      {/* 폰트 크기 */}
      <section aria-labelledby="fontsize-heading">
        <h2 id="fontsize-heading" className="text-sm font-semibold text-muted mb-3 uppercase">
          글자 크기
        </h2>
        <FontSizeSelector />
      </section>

      {/* 캐시 관리 */}
      <section aria-labelledby="cache-heading">
        <h2 id="cache-heading" className="text-sm font-semibold text-muted mb-3 uppercase">
          저장 공간
        </h2>
        <StorageCachePanel />
      </section>

      {/* 백업/복원 */}
      <section aria-labelledby="backup-heading">
        <h2 id="backup-heading" className="text-sm font-semibold text-muted mb-3 uppercase">
          데이터 백업/복원
        </h2>
        <BackupRestorePanel />
      </section>

      {/* 버전 */}
      <p className="text-xs text-muted text-center">버전 {__APP_VERSION__}</p>
    </div>
  );
}
```

---

## 폰트 크기 — CSS 클래스 방식

```typescript
// stores/useSettings.ts — 폰트 크기 추가
export type FontSize = 'base' | 'lg' | 'xl';

export function applyFontSize(size: FontSize): void {
  const root = document.documentElement;
  root.classList.toggle('fontsize-lg', size === 'lg');
  root.classList.toggle('fontsize-xl', size === 'xl');
}
```

```css
/* styles/tokens.css */
/* 기본 (base): html font-size = 브라우저 기본 16px */
html.fontsize-lg { font-size: 18px; }
html.fontsize-xl { font-size: 20px; }
```

```tsx
// components/FontSizeSelector.tsx
import { useSettings, type FontSize } from '@/stores/useSettings';

const OPTIONS: { value: FontSize; label: string }[] = [
  { value: 'base', label: '기본' },
  { value: 'lg',   label: '크게' },
  { value: 'xl',   label: '매우 크게' },
];

export function FontSizeSelector(): JSX.Element {
  const { fontSize, setFontSize } = useSettings();

  return (
    <div role="radiogroup" aria-label="글자 크기 선택" className="flex gap-2">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={fontSize === value}
          onClick={() => setFontSize(value)}
          className={`flex-1 rounded-full py-2 text-sm font-medium border transition
            ${fontSize === value
              ? 'bg-primary text-white border-primary'
              : 'bg-surface text-fg border-divider'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
```

---

## 캐시 관리 패널

```tsx
// components/StorageCachePanel.tsx
import { useState } from 'react';
import { HardDrive, Trash2 } from 'lucide-react';
import { getStorageEstimate, clearAllCaches } from '@/lib/storage';
import { dbClearAll } from '@/lib/db';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StorageCachePanel(): JSX.Element {
  const [info,    setInfo]    = useState<{ used: number; pct: number } | null>(null);
  const [cleared, setCleared] = useState(false);

  const loadInfo = async () => {
    const est = await getStorageEstimate();
    if (est) setInfo(est);
  };

  const handleClear = async () => {
    if (!confirm('캐시를 모두 삭제할까요? 오프라인 데이터가 사라집니다.')) return;
    await clearAllCaches();
    await dbClearAll();
    setCleared(true);
    // 삭제 후 앱 재로드 (스토어 재초기화)
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="bg-surface rounded-2xl border border-divider p-4 space-y-3">
      {/* 사용량 조회 버튼 */}
      {!info ? (
        <button
          type="button"
          onClick={loadInfo}
          className="inline-flex items-center gap-2 text-sm text-primary"
        >
          <HardDrive size={16} aria-hidden />
          저장 공간 확인
        </button>
      ) : (
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-fg">사용 중</span>
            <span className="text-muted">{formatBytes(info.used)} ({info.pct}%)</span>
          </div>
          <div className="h-2 bg-divider rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${info.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* 캐시 삭제 */}
      <button
        type="button"
        onClick={handleClear}
        disabled={cleared}
        className="inline-flex items-center gap-2 text-sm text-accent
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Trash2 size={16} aria-hidden />
        {cleared ? '삭제됨 — 재시작 중…' : '캐시 전체 삭제'}
      </button>
    </div>
  );
}
```

---

## 데이터 백업 / 복원

```typescript
// app/src/lib/db.ts — 백업/복원 함수 추가

export type DbBackup = {
  app:        string;    // '{프로젝트명}'
  version:    number;    // 1
  exportedAt: string;    // ISO 날짜
  data:       Record<string, unknown>;
};

const APP_ID = '{프로젝트명}';   // 예: 'irishplay'

// 전체 백업 — JSON 객체 반환
export async function dbExportAll(): Promise<DbBackup> {
  const ks = await dbKeys();
  const entries = await Promise.all(
    ks.map(async (k) => [k, await dbGet(k)] as const)
  );
  return {
    app:        APP_ID,
    version:    1,
    exportedAt: new Date().toISOString(),
    data:       Object.fromEntries(entries),
  };
}

// 복원 — merge 방식 (기존 키 보존, 백업 키 덮어씀)
export async function dbImportAll(backup: DbBackup): Promise<number> {
  if (backup.app !== APP_ID || typeof backup.data !== 'object') {
    throw new Error('이 앱의 백업 파일이 아닙니다.');
  }
  const entries = Object.entries(backup.data);
  await Promise.all(entries.map(([k, v]) => dbSet(k, v)));
  return entries.length;
}
```

```tsx
// components/BackupRestorePanel.tsx
import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { dbExportAll, dbImportAll, type DbBackup } from '@/lib/db';

export function BackupRestorePanel(): JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string>('');

  // ── 백업 다운로드 ──
  const handleExport = async () => {
    try {
      const backup = await dbExportAll();
      const json   = JSON.stringify(backup, null, 2);
      const blob   = new Blob([json], { type: 'application/json' });
      const url    = URL.createObjectURL(blob);
      const a      = document.createElement('a');
      const date   = new Date().toISOString().slice(0, 10);
      a.href       = url;
      a.download   = `backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('백업 파일이 다운로드됐어요.');
    } catch {
      setStatus('백업에 실패했어요.');
    }
  };

  // ── 복원 ──
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text   = await file.text();
      const backup = JSON.parse(text) as DbBackup;
      const count  = await dbImportAll(backup);
      setStatus(`${count}개 항목 복원 완료. 앱을 재시작합니다…`);
      // 복원 후 재로드 (Zustand 스토어 재하이드레이트)
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : '복원에 실패했어요.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-divider p-4 space-y-3">
      {/* 백업 */}
      <button
        type="button"
        onClick={handleExport}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary"
      >
        <Download size={16} aria-hidden />
        학습 데이터 백업 (JSON)
      </button>

      {/* 복원 */}
      <label className="inline-flex items-center gap-2 text-sm font-medium
        text-primary cursor-pointer">
        <Upload size={16} aria-hidden />
        백업 파일로 복원
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImport}
          className="sr-only"
        />
      </label>

      {status && (
        <p className="text-xs text-muted" aria-live="polite">{status}</p>
      )}
    </div>
  );
}
```

---

## 주의사항

- `dbImportAll` 이후 반드시 `window.location.reload()` — Zustand 스토어가 메모리에 구버전 데이터를 들고 있기 때문
- 캐시 삭제 (`clearAllCaches()`)는 SW 캐시만 지움 — IndexedDB(`dbClearAll()`)와 별도로 호출
- 폰트 크기는 `html` 클래스 방식 — Tailwind의 `text-sm`, `text-base` 등이 `rem` 단위이므로 `html font-size` 변경만으로 전체 텍스트 크기 연동됨
