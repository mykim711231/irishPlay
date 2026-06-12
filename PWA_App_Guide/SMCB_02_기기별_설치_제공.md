# 02. 기기별 설치 제공 방법

> 레퍼런스: `D:\_Git\SMCB\app\src\components\InstallPrompt.tsx`

---

## 기기별 설치 분기 전략

| OS / 브라우저 | beforeinstallprompt | 처리 |
|---|---|---|
| Android Chrome / Edge | ✅ 자동 발화 | `deferredPrompt.prompt()` 직접 호출 |
| Windows Chrome / Edge | ✅ 자동 발화 | `deferredPrompt.prompt()` 직접 호출 |
| macOS Chrome / Edge | ✅ 자동 발화 | `deferredPrompt.prompt()` 직접 호출 |
| macOS Safari 17+ | ❌ 없음 | 파일 메뉴 → "Dock에 추가" 안내 모달 |
| iOS Safari | ❌ 없음 | 공유 버튼 → "홈 화면에 추가" 안내 모달 |
| 삼성 인터넷 | ⚠️ 불안정 | 주소창 + / ⋮ 메뉴 2가지 방법 안내 모달 |

---

## 파일 구성

```
app/src/
├── components/
│   ├── InstallPrompt.tsx   ← 메인 설치 컴포넌트
│   ├── AppleLogo.tsx       ← Apple SVG 로고 (선택)
│   └── AndroidLogo.tsx     ← Android SVG 로고 (선택)
```

---

## Step 1 — 타입 선언

```typescript
// app/src/types/pwa.d.ts  또는 파일 상단에 직접 선언
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
```

---

## Step 2 — OS / 브라우저 감지 유틸

```typescript
// app/src/lib/detectDevice.ts
export type DeviceOS = 'android' | 'ios' | 'windows' | 'mac' | 'other';

export function detectOS(): DeviceOS {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  return 'other';
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return (navigator as any).standalone === true;  // iOS Safari 전용
}

export function isIOSSafari(): boolean {
  if (detectOS() !== 'ios') return false;
  // CriOS = Chrome on iOS, FxiOS = Firefox, EdgiOS = Edge, OPiOS = Opera
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);
}

export function isMacSafari(): boolean {
  if (detectOS() !== 'mac') return false;
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
}

export function isSamsungInternet(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /SamsungBrowser/i.test(navigator.userAgent);
}
```

---

## Step 3 — InstallPrompt.tsx 전체 구현

```tsx
// app/src/components/InstallPrompt.tsx
import { useEffect, useState } from 'react';
import {
  Share, Plus, X, ChevronDown, Download,
  Lightbulb, Monitor, Smartphone,
} from 'lucide-react';
import {
  detectOS, isStandalone, isIOSSafari,
  isMacSafari, isSamsungInternet, type DeviceOS,
} from '@/lib/detectDevice';

// ── 수동 안내 모달 — iOS ────────────────────────────────────
function IOSInstallModal({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center
        justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="ios-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 id="ios-modal-title"
            className="text-lg font-bold text-fg inline-flex items-center gap-2">
            <Smartphone size={18} aria-hidden />
            iPhone에 설치하기
          </h3>
          <button type="button" onClick={onClose} aria-label="닫기"
            className="text-muted hover:text-fg p-1">
            <X size={20} aria-hidden />
          </button>
        </div>
        <p className="text-sm text-muted mb-4">
          iOS는 Safari에서만 PWA 설치가 가능합니다.
        </p>
        <ol className="space-y-3 text-sm text-fg">
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-primary text-white
              text-xs font-bold flex items-center justify-center">1</span>
            <span>
              화면 하단 가운데{' '}
              <Share size={14} className="inline align-text-bottom" aria-hidden />{' '}
              <b>공유 버튼</b>을 누르세요.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-primary text-white
              text-xs font-bold flex items-center justify-center">2</span>
            <span>
              <Plus size={14} className="inline align-text-bottom" aria-hidden />{' '}
              <b>"홈 화면에 추가"</b>를 선택하세요.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-primary text-white
              text-xs font-bold flex items-center justify-center">3</span>
            <span>우측 상단 <b>"추가"</b>를 누르면 완료됩니다.</span>
          </li>
        </ol>
        <p className="text-xs text-muted mt-4 pt-3 border-t border-divider
          inline-flex items-start gap-1.5">
          <Lightbulb size={14} className="flex-none mt-0.5" aria-hidden />
          <span>다른 브라우저로 보고 있다면 Safari에서 이 페이지를 다시 열어주세요.</span>
        </p>
        <button type="button" onClick={onClose}
          className="w-full mt-4 rounded-full bg-primary text-white text-sm
            font-semibold py-2.5">
          확인
        </button>
      </div>
    </div>
  );
}

// ── 수동 안내 모달 — macOS Safari ──────────────────────────
function MacInstallModal({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center
        justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="mac-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 id="mac-modal-title"
            className="text-lg font-bold text-fg inline-flex items-center gap-2">
            <Monitor size={18} aria-hidden />
            Mac에 설치하기
          </h3>
          <button type="button" onClick={onClose} aria-label="닫기"
            className="text-muted hover:text-fg p-1">
            <X size={20} aria-hidden />
          </button>
        </div>
        <ol className="space-y-3 text-sm text-fg">
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-primary text-white
              text-xs font-bold flex items-center justify-center">1</span>
            <span>메뉴바의 <b>파일</b> 메뉴를 엽니다.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-primary text-white
              text-xs font-bold flex items-center justify-center">2</span>
            <span><b>"Dock에 추가"</b>를 선택합니다.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-primary text-white
              text-xs font-bold flex items-center justify-center">3</span>
            <span>이름 확인 후 <b>"추가"</b>를 누르면 Dock에서 실행됩니다.</span>
          </li>
        </ol>
        <p className="text-xs text-muted mt-4 pt-3 border-t border-divider
          inline-flex items-start gap-1.5">
          <Lightbulb size={14} className="flex-none mt-0.5" aria-hidden />
          <span>Chrome·Edge는 주소창 오른쪽 설치 아이콘을 클릭하세요.</span>
        </p>
        <button type="button" onClick={onClose}
          className="w-full mt-4 rounded-full bg-primary text-white text-sm
            font-semibold py-2.5">
          확인
        </button>
      </div>
    </div>
  );
}

// ── 수동 안내 모달 — 삼성 인터넷 ───────────────────────────
function SamsungInstallModal({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center
        justify-center p-4"
      role="dialog" aria-modal="true" aria-labelledby="samsung-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 id="samsung-modal-title"
            className="text-lg font-bold text-fg inline-flex items-center gap-2">
            <Smartphone size={18} aria-hidden />
            삼성 인터넷에 설치하기
          </h3>
          <button type="button" onClick={onClose} aria-label="닫기"
            className="text-muted hover:text-fg p-1">
            <X size={20} aria-hidden />
          </button>
        </div>

        <p className="text-sm font-bold text-fg mb-2">방법 1 — 주소창 + 아이콘</p>
        <ol className="space-y-2 text-sm text-fg mb-4">
          {['주소창 오른쪽 + 아이콘을 누르세요.', '"홈 화면"을 선택하세요.', '"추가"를 누르면 완료됩니다.'].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-primary text-white
                text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <p className="text-sm font-bold text-fg mb-2">방법 2 — ⋮ 메뉴</p>
        <ol className="space-y-2 text-sm text-fg">
          {['화면 오른쪽 아래 ⋮ (더보기) 메뉴를 누르세요.', '"현재 페이지 추가" → "홈 화면"을 선택하세요.', '"추가"를 누르면 완료됩니다.'].map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-none w-6 h-6 rounded-full bg-primary text-white
                text-xs font-bold flex items-center justify-center">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <button type="button" onClick={onClose}
          className="w-full mt-5 rounded-full bg-primary text-white text-sm
            font-semibold py-2.5">
          확인
        </button>
      </div>
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────
type InstallPromptProps = { defaultExpanded?: boolean };

export default function InstallPrompt(
  { defaultExpanded = false }: InstallPromptProps = {}
): JSX.Element | null {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosModal,     setIosModal]     = useState(false);
  const [macModal,     setMacModal]     = useState(false);
  const [samsungModal, setSamsungModal] = useState(false);
  const [installed,    setInstalled]    = useState(false);
  const [expanded,     setExpanded]     = useState(defaultExpanded);
  const [os,           setOs]           = useState<DeviceOS>('other');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setOs(detectOS());
    if (isStandalone()) { setInstalled(true); return; }

    const onBefore = (e: Event): void => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => {
      setDeferredPrompt(null);
      setInstalled(true);
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed) return null;

  const promptAvailable = deferredPrompt !== null;
  const samsungAvailable = isSamsungInternet();

  const handlePromptInstall = async (): Promise<void> => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setInstalled(true);
    }
  };

  const primaryLabel =
    os === 'ios'     ? 'iPhone에 설치'   :
    os === 'android' ? 'Android에 설치'  :
    os === 'windows' ? 'Windows에 설치'  :
    os === 'mac'     ? 'Mac에 설치'      : '이 기기에 설치';

  const primaryDisabled =
    os === 'ios'             ? !isIOSSafari() :
    os === 'mac' && isMacSafari() ? false     : !promptAvailable;

  const onPrimaryClick = (): void => {
    if (os === 'ios')                       { setIosModal(true); return; }
    if (os === 'mac' && isMacSafari() && !promptAvailable) { setMacModal(true); return; }
    if (samsungAvailable && !promptAvailable) { setSamsungModal(true); return; }
    void handlePromptInstall();
  };

  return (
    <>
      <section className="rounded-2xl border border-primary/30 bg-primary/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-between gap-3 p-4 text-left"
        >
          <span>
            <span className="block text-sm font-bold text-fg inline-flex
              items-center gap-1.5">
              <Smartphone size={14} aria-hidden />
              <Monitor size={14} aria-hidden />
              휴대폰·PC에 앱으로 설치
            </span>
            <span className="block text-xs text-muted mt-0.5">
              {expanded ? '접기' : '탭하여 설치 방법 보기'}
            </span>
          </span>
          <ChevronDown
            size={20}
            className={`flex-none text-muted transition-transform duration-200
              ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>

        {expanded && (
          <div className="px-4 pb-4">
            <p className="text-xs text-muted mb-3">
              설치하면 인터넷 없이도 사용할 수 있어요.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onPrimaryClick}
                disabled={primaryDisabled}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary
                  text-white text-sm font-semibold px-4 py-2
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={16} aria-hidden />
                {primaryLabel}
              </button>
            </div>
            {primaryDisabled && os === 'ios' && (
              <p className="text-xs text-muted mt-3">
                iPhone은 Safari로 이 페이지를 열어야 설치할 수 있습니다.
              </p>
            )}
            {samsungAvailable && !promptAvailable && (
              <button
                type="button"
                onClick={() => setSamsungModal(true)}
                className="inline-flex items-center gap-1.5 mt-2 rounded-full
                  bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5"
              >
                <Lightbulb size={12} aria-hidden />
                삼성 인터넷 설치 방법 보기
              </button>
            )}
          </div>
        )}
      </section>

      {iosModal     && <IOSInstallModal     onClose={() => setIosModal(false)} />}
      {macModal     && <MacInstallModal     onClose={() => setMacModal(false)} />}
      {samsungModal && <SamsungInstallModal onClose={() => setSamsungModal(false)} />}
    </>
  );
}
```

---

## Step 4 — 사용 위치

```tsx
// 홈 화면 또는 설정 페이지에 배치
import InstallPrompt from '@/components/InstallPrompt';

<InstallPrompt />                 // 접힌 상태로 시작
<InstallPrompt defaultExpanded /> // 펼친 상태로 시작
```

---

## 동작 확인 체크리스트

- [ ] Android Chrome — "Android에 설치" 버튼 클릭 → 시스템 설치 다이얼로그 표시
- [ ] Windows Chrome — "Windows에 설치" 버튼 클릭 → 설치 다이얼로그
- [ ] iOS Safari — "iPhone에 설치" 클릭 → 3단계 안내 모달
- [ ] macOS Safari 17+ — "Mac에 설치" 클릭 → Dock 안내 모달
- [ ] 이미 설치됨 (`standalone` 모드) — 컴포넌트 전체 숨김
