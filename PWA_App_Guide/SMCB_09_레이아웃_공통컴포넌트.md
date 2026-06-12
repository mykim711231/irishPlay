# 09. 레이아웃 & 공통 컴포넌트

> 레퍼런스: `D:\_Git\SMCB\app\src\components\Layout.tsx`, `BottomNav.tsx`, `Header.tsx`, `Footer.tsx`

---

## 레이아웃 구조

```
┌─────────────────────────────┐
│  Header (sticky top)        │  ← 뒤로가기, 제목, 액션 버튼
├─────────────────────────────┤
│                             │
│  <main>  (flex-1, scroll)   │  ← 페이지 콘텐츠
│                             │
├─────────────────────────────┤
│  Footer (선택)               │  ← 저작권 등
├─────────────────────────────┤
│  BottomNav (fixed bottom)   │  ← 탭 네비게이션
└─────────────────────────────┘
```

---

## Layout.tsx

```tsx
// app/src/components/Layout.tsx
import { type ReactNode } from 'react';
import Header, { type HeaderProps } from './Header';
import BottomNav from './BottomNav';

type LayoutProps = HeaderProps & {
  children: ReactNode;
  hideNav?: boolean;    // 전체화면 뷰에서 하단 탭바 숨김
  hideHeader?: boolean;
};

export default function Layout({
  children,
  hideNav = false,
  hideHeader = false,
  ...headerProps
}: LayoutProps): JSX.Element {
  return (
    <div className="flex flex-col min-h-dvh bg-bg">
      {!hideHeader && <Header {...headerProps} />}

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {!hideNav && <BottomNav />}
    </div>
  );
}
```

---

## Header.tsx

```tsx
// app/src/components/Header.tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export type HeaderProps = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: ReactNode;    // 우측 버튼 슬롯
};

export default function Header({
  title,
  showBack = false,
  onBack,
  actions,
}: HeaderProps): JSX.Element {
  const navigate = useNavigate();

  const handleBack = (): void => {
    if (onBack) { onBack(); return; }
    navigate(-1);
  };

  return (
    <header className="sticky top-0 z-40 bg-bg/95 backdrop-blur
      border-b border-divider pt-safe">
      <div className="flex items-center gap-2 px-4 h-14">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="뒤로 가기"
            className="flex-none -ml-2 w-10 h-10 flex items-center justify-center
              rounded-full text-fg hover:bg-primary/10 active:scale-95 transition"
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
        )}

        {title && (
          <h1 className="flex-1 text-base font-semibold text-fg truncate">
            {title}
          </h1>
        )}

        {actions && (
          <div className="flex-none flex items-center gap-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
```

---

## BottomNav.tsx

```tsx
// app/src/components/BottomNav.tsx
import { NavLink } from 'react-router-dom';
import { Home, Music, Settings, type LucideIcon } from 'lucide-react';

type NavItem = {
  to:    string;
  label: string;
  Icon:  LucideIcon;
};

// 프로젝트에 맞게 탭 수정
const NAV_ITEMS: NavItem[] = [
  { to: '/',         label: '홈',   Icon: Home     },
  { to: '/tunes',    label: '곡목', Icon: Music    },
  { to: '/settings', label: '설정', Icon: Settings },
];

export default function BottomNav(): JSX.Element {
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 inset-x-0 z-40 bg-bg/95 backdrop-blur
        border-t border-divider pb-safe"
    >
      <ul className="flex" role="list">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) => `
                flex flex-col items-center justify-center gap-1
                py-2 w-full text-xs font-medium transition-colors
                ${isActive ? 'text-primary' : 'text-muted hover:text-fg'}
              `}
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    aria-hidden
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

---

## Footer.tsx (저작권)

```tsx
// app/src/components/Footer.tsx
export default function Footer(): JSX.Element {
  return (
    <footer className="text-xs text-muted text-center py-4 px-4 border-t border-divider">
      {/* 프로젝트에 맞게 수정 */}
      © {new Date().getFullYear()} {'{프로젝트명}'}. All rights reserved.
    </footer>
  );
}
```

---

## SectionHeader.tsx (목록 섹션 제목)

```tsx
// app/src/components/SectionHeader.tsx
type SectionHeaderProps = {
  title: string;
  count?: number;
  action?: React.ReactNode;
};

export function SectionHeader({
  title,
  count,
  action,
}: SectionHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
        {title}
        {count !== undefined && (
          <span className="ml-1.5 text-muted/60">{count}</span>
        )}
      </h2>
      {action}
    </div>
  );
}
```

---

## 페이지에서 Layout 사용 예

```tsx
// app/src/pages/TuneView.tsx
import Layout from '@/components/Layout';
import { ShareButton } from '@/components/ShareButton';

export default function TuneView(): JSX.Element {
  return (
    <Layout
      title="Morning Dew"
      showBack
      hideNav          // 플레이어 페이지는 하단 탭 숨김
      actions={<ShareButton />}
    >
      <div className="px-4 pb-20">
        {/* 콘텐츠 */}
      </div>
    </Layout>
  );
}
```

---

## 공통 컴포넌트 파일 목록 (체크리스트)

```
app/src/components/
├── Layout.tsx           ← Header + main + BottomNav 래퍼
├── Header.tsx           ← sticky 헤더, 뒤로가기, 액션 슬롯
├── BottomNav.tsx        ← 하단 탭바 (NavLink)
├── Footer.tsx           ← 저작권 푸터
├── SectionHeader.tsx    ← 섹션 제목 + 카운트
├── ErrorBoundary.tsx    ← lazy 청크 실패 처리 (06번 파일 참조)
├── UpdateToast.tsx      ← SW 설치 진행 (01번 파일 참조)
├── InstallPrompt.tsx    ← PWA 설치 안내 (02번 파일 참조)
└── QrModal.tsx          ← QR 코드 모달 (03번 파일 참조)
```

---

## 스타일 패턴 — 카드 컴포넌트

```tsx
// 일반적인 카드 UI 패턴
<div className="bg-surface rounded-2xl border border-divider p-4 shadow-sm">
  <h3 className="text-base font-semibold text-fg">제목</h3>
  <p className="text-sm text-muted mt-1">설명</p>
</div>

// 탭 타겟 (44px) 보장 버튼 행
<button
  type="button"
  className="w-full flex items-center justify-between p-4 min-h-[44px]
    hover:bg-primary/5 active:bg-primary/10 transition rounded-xl"
>
  <span className="text-sm text-fg">항목 이름</span>
  <ChevronRight size={16} className="text-muted" aria-hidden />
</button>
```
