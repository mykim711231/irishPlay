# 03. 설치 주소 QR 코드

> 레퍼런스: `D:\_Git\SMCB\app\src\components\InviteQrModal.tsx`

---

## 필요 패키지

```bash
npm install qrcode.react
```

```json
"qrcode.react": "^4.2.0"
```

---

## 파일 구성

```
app/src/
└── components/
    └── QrModal.tsx
```

---

## QrModal.tsx 전체 구현

```tsx
// app/src/components/QrModal.tsx
import { QRCodeSVG } from 'qrcode.react';
import { X, Camera } from 'lucide-react';

// ⚠️ QR 코드는 카메라 인식을 위해 다크모드와 무관하게
//    항상 bgColor="#FFFFFF" fgColor="#000000" 고정
export default function QrModal({
  url,
  title = '앱 설치 주소',
  onClose,
}: {
  url: string;
  title?: string;
  onClose: () => void;
}): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center
        justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-bg rounded-2xl max-w-md w-full p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <h3
            id="qr-modal-title"
            className="text-xl font-bold text-fg inline-flex items-center gap-2"
          >
            <Camera size={22} aria-hidden />
            QR 코드로 설치하기
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-muted hover:text-fg p-1"
          >
            <X size={24} aria-hidden />
          </button>
        </div>

        <p className="text-base text-fg font-semibold">
          휴대폰 카메라로 아래 그림을 비추면 설치 화면이 열려요.
        </p>

        {/* QR — 다크모드 예외: 항상 흰 배경 / 검은 모듈 */}
        <div className="mt-4 flex justify-center">
          <div className="bg-white rounded-2xl p-4 border border-divider">
            <QRCodeSVG
              value={url}
              size={224}
              level="M"
              marginSize={2}
              bgColor="#FFFFFF"
              fgColor="#000000"
              title={title}
            />
          </div>
        </div>

        {/* 사용 안내 */}
        <ol className="mt-5 space-y-3 text-base text-fg">
          {[
            '상대방 휴대폰의 카메라 앱을 켭니다.',
            '카메라로 위의 QR 그림을 비춥니다.',
            '화면에 뜨는 주소(링크)를 누르면 설치 화면이 열립니다.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="flex-none w-7 h-7 rounded-full bg-primary text-white
                  text-sm font-bold flex items-center justify-center"
              >
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {/* URL 직접 표시 (QR 인식 실패 대비) */}
        <div className="mt-4 pt-3 border-t border-divider">
          <p className="text-sm text-muted">QR이 잘 안 되면 이 주소를 직접 알려 주세요</p>
          <p className="text-sm text-fg font-medium break-all mt-1 select-all">{url}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 rounded-full bg-primary text-white text-base
            font-semibold py-3"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
```

---

## 사용 방법

```tsx
// 버튼 클릭 시 QR 모달 열기
import { useState } from 'react';
import { QrCode } from 'lucide-react';
import QrModal from '@/components/QrModal';

// GitHub Pages 배포 URL 자동 결정
const APP_URL = `${window.location.origin}${import.meta.env.BASE_URL}`;
// 예: https://mykim711231.github.io/irishPlay/

function ShareButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-primary/10
          text-primary px-4 py-2 text-sm font-semibold"
      >
        <QrCode size={16} aria-hidden />
        QR로 공유
      </button>

      {open && (
        <QrModal
          url={APP_URL}
          title="앱 설치 QR"
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

---

## QRCodeSVG 주요 props

| prop | 설명 | 권장값 |
|------|------|--------|
| `value` | QR에 인코딩할 URL | 앱 배포 URL |
| `size` | QR 크기 (px) | `224` — 모바일 카메라 최소 인식 크기 |
| `level` | 오류 정정 수준 (L/M/Q/H) | `"M"` — 로고 합성 없을 때 충분 |
| `marginSize` | 여백 (모듈 단위) | `2` |
| `bgColor` | 배경색 | `"#FFFFFF"` **고정** (다크모드 무시) |
| `fgColor` | 모듈(점) 색 | `"#000000"` **고정** |
| `title` | 접근성 제목 (`<title>`) | 앱 이름 + "설치 주소" |

---

## 주의사항

- **다크모드 예외**: QR 이미지 자체는 흰 배경/검은 모듈 고정. 카메라 스캐너가 반전색에서 오인식할 수 있다.
- **카카오톡 QR 스캔**: 기기 기본 브라우저로 직접 열리므로 `?openExternalBrowser=1` 불필요. URL로 직접 카카오 링크를 보낼 때만 해당 파라미터를 붙인다.
- **오프라인 QR**: QRCodeSVG는 SVG를 렌더링하므로 인터넷 연결 없이도 표시된다.
