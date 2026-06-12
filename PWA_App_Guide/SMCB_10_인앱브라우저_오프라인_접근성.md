# 10. 인앱브라우저 감지 · 오프라인 상태 · 접근성

> 레퍼런스: `D:\_Git\SMCB\app\src\lib\inapp.ts`, `components/RecordedAudioMissingBanner.tsx`, `styles/tokens.css`

---

## 1. 인앱브라우저 감지

카카오톡·네이버·Facebook 등 인앱 브라우저에서는 PWA 설치, SW 등록, Web Speech API가 정상 동작하지 않는다.

### lib/inapp.ts

```typescript
// app/src/lib/inapp.ts
export type InAppKind =
  | 'kakao'
  | 'naver'
  | 'facebook'
  | 'instagram'
  | 'line'
  | null;

export type InAppInfo = {
  kind:  InAppKind;
  label: string | null;
};

export function isInAppBrowser(): InAppInfo {
  if (typeof navigator === 'undefined') return { kind: null, label: null };
  const ua = navigator.userAgent;

  if (/KAKAOTALK|KAKAO/i.test(ua))   return { kind: 'kakao',     label: '카카오톡' };
  if (/NAVER\(inapp/i.test(ua))      return { kind: 'naver',     label: '네이버 앱' };
  if (/FBAN|FBAV/i.test(ua))         return { kind: 'facebook',  label: 'Facebook' };
  if (/Instagram/i.test(ua))         return { kind: 'instagram', label: 'Instagram' };
  if (/Line\//i.test(ua))            return { kind: 'line',      label: 'LINE' };

  return { kind: null, label: null };
}
```

### 사용처 패턴

```tsx
// SW 설치 토스트 — 인앱에서 숨김
import { isInAppBrowser } from '@/lib/inapp';

export default function UpdateToast(): JSX.Element | null {
  if (isInAppBrowser().kind) return null;  // ← 인앱에서 전체 숨김
  // ...
}

// 인앱 브라우저 안내 배너
export function InAppBanner(): JSX.Element | null {
  const { kind, label } = isInAppBrowser();
  if (!kind) return null;

  // 앱 URL (카카오 인앱 우회용)
  const url = `${window.location.href}${
    window.location.href.includes('?') ? '&' : '?'
  }openExternalBrowser=1`;

  return (
    <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 mx-4 mb-4">
      <p className="text-sm text-fg font-semibold">
        {label} 안에서 열려 있어요
      </p>
      <p className="text-xs text-muted mt-1">
        PWA 설치와 일부 기능은 기본 브라우저(Safari·Chrome)에서만 작동합니다.
      </p>
      <a
        href={url}
        className="inline-block mt-3 text-sm font-semibold text-primary underline"
      >
        기본 브라우저로 열기
      </a>
    </div>
  );
}
```

---

## 2. 오프라인 / 네트워크 상태

### useOnlineStatus 훅

```typescript
// app/src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  // navigator.onLine은 false-positive 가능 → false-negative만 신뢰
  const [online, setOnline] = useState<boolean>(navigator.onLine !== false);

  useEffect(() => {
    const onOnline  = (): void => setOnline(true);
    const onOffline = (): void => setOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return online;
}
```

### 오프라인 배너 컴포넌트

```tsx
// app/src/components/OfflineBanner.tsx
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

export function OfflineBanner(): JSX.Element | null {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      className="flex items-center gap-2 bg-accent/10 border-b border-accent/30
        px-4 py-2 text-sm text-fg"
      role="status"
      aria-live="polite"
    >
      <WifiOff size={16} className="flex-none text-accent" aria-hidden />
      <span>오프라인 상태입니다. 저장된 데이터만 사용할 수 있어요.</span>
    </div>
  );
}
```

Layout 상단에 배치:

```tsx
// components/Layout.tsx
import { OfflineBanner } from './OfflineBanner';
import { InAppBanner }   from './InAppBanner';

// ...
<header className="sticky top-0 z-40 ...">
  <InAppBanner />
  <OfflineBanner />
  {/* Header 본체 */}
</header>
```

---

## 3. 접근성 패턴

SMCB 전체에서 반복되는 접근성 구현 패턴을 정리한다.

### 아이콘 처리 규칙

```tsx
{/* ✅ 장식 아이콘 — aria-hidden 필수 */}
<Search size={20} aria-hidden />

{/* ✅ 아이콘만 있는 버튼 — aria-label 필수 */}
<button type="button" aria-label="검색">
  <Search size={20} aria-hidden />
</button>

{/* ✅ 아이콘 + 텍스트 — aria-hidden만 */}
<button type="button">
  <Search size={16} aria-hidden />
  <span>검색</span>
</button>
```

### 모달 패턴

```tsx
{/* role="dialog" + aria-modal + aria-labelledby */}
<div
  className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  onClick={onClose}             // 배경 클릭으로 닫기
>
  <div
    className="bg-bg rounded-2xl p-6 max-w-md w-full"
    onClick={(e) => e.stopPropagation()}  // 이벤트 전파 차단
  >
    <h2 id="modal-title" className="text-lg font-bold text-fg">
      모달 제목
    </h2>
    {/* 내용 */}
    <button
      type="button"
      onClick={onClose}
      aria-label="닫기"
      className="absolute top-4 right-4"
    >
      <X size={20} aria-hidden />
    </button>
  </div>
</div>
```

### 라디오 그룹 패턴

```tsx
{/* role="radiogroup" + role="radio" + aria-checked */}
<div role="radiogroup" aria-label="테마 선택">
  {OPTIONS.map(({ value, label }) => (
    <button
      key={value}
      type="button"
      role="radio"
      aria-checked={current === value}
      onClick={() => setCurrent(value)}
      className={current === value ? 'bg-primary text-white' : 'bg-surface text-fg'}
    >
      {label}
    </button>
  ))}
</div>
```

### 프로그레스바 패턴

```tsx
<div
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuenow={pct}
  aria-label="로딩 중"
  className="w-full h-1.5 bg-divider rounded-full overflow-hidden"
>
  <div
    className="h-full bg-primary rounded-full transition-all"
    style={{ width: `${pct}%` }}
  />
</div>
```

### 로딩 / 동적 컨텐츠

```tsx
{/* aria-live: 스크린리더에 변경 알림 */}
<div aria-live="polite" aria-label="상태">
  {loading ? '로딩 중…' : '완료'}
</div>

{/* 로딩 스피너 */}
<div
  role="status"
  aria-label="로딩 중"
  className="w-8 h-8 rounded-full border-2 border-primary
    border-t-transparent animate-spin"
/>
```

### 탭바 네비게이션

```tsx
<nav aria-label="주요 메뉴">
  <ul role="list" className="flex">
    <li className="flex-1">
      <NavLink to="/" aria-label="홈">
        <Home size={22} aria-hidden />
        <span className="text-xs">홈</span>
      </NavLink>
    </li>
  </ul>
</nav>
```

### 접근성 체크리스트

```
[ ] 모든 <img>에 alt 속성
[ ] 모든 장식 아이콘에 aria-hidden
[ ] 아이콘만 있는 버튼에 aria-label
[ ] 모달에 role="dialog" aria-modal aria-labelledby
[ ] 라디오 그룹에 role="radiogroup" + role="radio" + aria-checked
[ ] 프로그레스바에 role="progressbar" + aria-valuenow/min/max
[ ] 동적 알림에 aria-live="polite"
[ ] 탭바에 <nav aria-label>
[ ] 폼 입력에 <label> 또는 aria-label
[ ] 버튼 min-height: 44px (모바일 탭 타겟)
[ ] :focus-visible 스타일 (tokens.css 포함)
[ ] 키보드 네비게이션 동작 확인
```

---

## 4. 시스템 폰트 스택

웹폰트 없이 모든 OS의 기본 폰트를 활용한다. 추가 다운로드 없이 빠른 초기 렌더링.

```css
/* tokens.css */
--font-sans:
  -apple-system,          /* macOS/iOS: SF Pro */
  BlinkMacSystemFont,     /* Chrome on macOS */
  "Segoe UI",             /* Windows */
  Roboto,                 /* Android */
  "Helvetica Neue",       /* 구형 macOS */
  "Apple SD Gothic Neo",  /* iOS 한국어 */
  "Malgun Gothic",        /* Windows 한국어 */
  "맑은 고딕",              /* Windows 한국어 (한글 이름) */
  sans-serif;
```

Tailwind에 등록:

```javascript
// tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      sans: ['var(--font-sans)'],
    },
  },
},
```

웹폰트가 필요한 경우 — `@font-face`를 `tokens.css` 상단에 추가하고 `--font-sans` 스택에 삽입:

```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap;   /* FOUT 허용, FOIT 방지 */
}

:root {
  --font-sans: 'MyFont', -apple-system, ...;
}
```
