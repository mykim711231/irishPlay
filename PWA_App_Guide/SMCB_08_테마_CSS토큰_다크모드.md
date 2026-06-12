# 08. 테마 & CSS 토큰 & 다크모드

> 레퍼런스: `D:\_Git\SMCB\app\src\styles\tokens.css`, `stores/settings.ts`, `tailwind.config.ts`

---

## 핵심 원칙: `--rgb-XXX: r g b` 포맷

```css
/* ✅ SMCB 방식 — alpha 적용 가능 */
--rgb-primary: 37 99 235;

/* 사용 시: */
background: rgb(var(--rgb-primary));          /* 불투명 */
background: rgb(var(--rgb-primary) / 0.1);   /* 10% 투명 */
```

```css
/* ❌ hex 방식 — Tailwind alpha 적용 불가 */
--color-primary: #2563eb;
```

Tailwind config에서 `<alpha-value>`로 연결해야 `bg-primary/10` 같은 유틸리티가 작동한다:

```typescript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      bg:      'rgb(var(--rgb-bg)      / <alpha-value>)',
      surface: 'rgb(var(--rgb-surface) / <alpha-value>)',
      fg:      'rgb(var(--rgb-text)    / <alpha-value>)',
      muted:   'rgb(var(--rgb-text-muted) / <alpha-value>)',
      primary: 'rgb(var(--rgb-primary) / <alpha-value>)',
      accent:  'rgb(var(--rgb-accent)  / <alpha-value>)',
      divider: 'rgb(var(--rgb-divider) / <alpha-value>)',
    },
  },
},
darkMode: 'class',   // 반드시 'class' — JS에서 html 클래스로 제어
```

---

## tokens.css 전체 구조

```css
/* app/src/styles/tokens.css */

/* ── 라이트 테마 (기본) ──────────────────────────────────────── */
:root {
  --rgb-bg:         250 250 250;
  --rgb-surface:    255 255 255;
  --rgb-text:       23 23 27;
  --rgb-text-muted: 100 100 110;
  --rgb-primary:    37 99 235;    /* ← 프로젝트 브랜드 색상으로 변경 */
  --rgb-accent:     234 88 12;
  --rgb-divider:    226 232 240;

  --font-sans:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;

  --tap-target: 44px;   /* 모바일 최소 탭 타겟 크기 */
}

/* ── 다크 테마 ────────────────────────────────────────────────── */
html.dark {
  --rgb-bg:         15 17 21;
  --rgb-surface:    24 27 34;
  --rgb-text:       230 232 236;
  --rgb-text-muted: 156 163 175;
  --rgb-primary:    96 165 250;   /* 다크에서 primary를 밝게 조정 */
  --rgb-accent:     251 146 60;
  --rgb-divider:    51 55 64;
}

/* ── 세피아 테마 (선택) ────────────────────────────────────────── */
html.theme-sepia {
  --rgb-bg:         245 237 220;
  --rgb-surface:    252 247 236;
  --rgb-text:       55 40 15;
  --rgb-text-muted: 120 100 70;
  --rgb-primary:    160 90 20;
  --rgb-accent:     180 60 10;
  --rgb-divider:    210 195 165;
}

/* ── 글로벌 기본값 ─────────────────────────────────────────────── */
html, body {
  font-family: var(--font-sans);
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

body {
  margin: 0;
  min-height: 100vh;
  min-height: 100dvh;   /* iOS 주소창 포함 높이 대응 */
  background: rgb(var(--rgb-bg));
  color: rgb(var(--rgb-text));
}

/* ── 모바일 탭 타겟 ────────────────────────────────────────────── */
button, [role="button"] {
  min-height: var(--tap-target);
  touch-action: manipulation;   /* 더블탭 줌 방지 */
}

/* ── 접근성 포커스 ─────────────────────────────────────────────── */
:focus-visible {
  outline: 2px solid rgb(var(--rgb-primary));
  outline-offset: 2px;
}

/* ── iOS safe-area ─────────────────────────────────────────────── */
.pb-safe { padding-bottom: max(env(safe-area-inset-bottom), 0.5rem); }
.pt-safe { padding-top:    max(env(safe-area-inset-top), 0px); }
.pl-safe { padding-left:   env(safe-area-inset-left); }
.pr-safe { padding-right:  env(safe-area-inset-right); }

/* ── 접근성 유틸 ───────────────────────────────────────────────── */
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
}
```

---

## styles/index.css

```css
/* app/src/styles/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## main.tsx import 순서 (필수)

```typescript
// tokens.css 반드시 index.css보다 먼저
import './styles/tokens.css';
import './styles/index.css';
```

---

## 다크모드 적용 함수 (stores/useSettings.ts)

```typescript
// app/src/stores/useSettings.ts
export type Theme = 'light' | 'dark' | 'system' | 'sepia' | 'warmdark';

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  const isDark =
    theme === 'dark' ||
    theme === 'warmdark' ||
    (theme === 'system' && prefersDark);

  root.classList.toggle('dark',         isDark);
  root.classList.toggle('theme-sepia',  theme === 'sepia');
  root.classList.toggle('theme-warmdark', theme === 'warmdark');
}

// 시스템 테마 변경 감지 — 앱 부팅 시 1회 등록
export function watchSystemTheme(): void {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useSettings.getState();
    if (theme === 'system') applyTheme('system');
  });
}
```

`main.tsx`에서:

```typescript
import { useSettings, watchSystemTheme } from '@/stores/useSettings';

void useSettings.getState().hydrate();  // 저장된 테마 복원
watchSystemTheme();                      // 시스템 변경 감지 등록
```

---

## 테마 선택 UI (예시)

```tsx
// app/src/components/ThemeSelector.tsx
import { useSettings, type Theme } from '@/stores/useSettings';
import { Sun, Moon, Monitor, BookOpen } from 'lucide-react';

const OPTIONS: { value: Theme; label: string; icon: JSX.Element }[] = [
  { value: 'light',  label: '라이트',   icon: <Sun size={16} /> },
  { value: 'dark',   label: '다크',     icon: <Moon size={16} /> },
  { value: 'system', label: '시스템',   icon: <Monitor size={16} /> },
  { value: 'sepia',  label: '세피아',   icon: <BookOpen size={16} /> },
];

export function ThemeSelector(): JSX.Element {
  const { theme, setTheme } = useSettings();

  return (
    <div role="radiogroup" aria-label="테마 선택" className="flex gap-2 flex-wrap">
      {OPTIONS.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          onClick={() => setTheme(value)}
          className={`
            inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm
            font-medium border transition
            ${theme === value
              ? 'bg-primary text-white border-primary'
              : 'bg-surface text-fg border-divider hover:border-primary/50'}
          `}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
```

---

## Tailwind 클래스 사용 예

```tsx
{/* 색상 */}
<div className="bg-bg text-fg">           배경 + 기본 텍스트 </div>
<div className="bg-surface">              카드/패널 배경 </div>
<p   className="text-muted">              보조 텍스트 </p>
<div className="border-divider">          구분선 </div>
<button className="bg-primary text-white"> 주요 액션 버튼 </button>
<button className="text-accent">          보조 색상 </button>

{/* alpha 활용 */}
<div className="bg-primary/10 text-primary">   연한 primary 배경 </div>
<div className="bg-primary/20">                더 진한 hover 상태 </div>
<div className="border border-primary/30">     연한 primary 테두리 </div>
```

---

## 주의사항

- `bg-white`, `text-black`, `bg-gray-*` 직접 사용 금지 — 테마 전환 시 변하지 않는다.
  항상 `bg-bg`, `bg-surface`, `text-fg`, `text-muted` 등 토큰 클래스 사용.
- `html` 태그에 클래스가 붙으므로 Tailwind `darkMode: 'class'` 설정 필수.
- CSS 변수는 `tokens.css`만 수정 — `index.css`에 색상 직접 정의 금지.
- `--rgb-primary` 값은 hex가 아닌 **공백 구분 RGB 숫자** (`37 99 235`, `#2563eb` ❌).
