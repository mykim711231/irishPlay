# 신규 프로젝트 구성 가이드 (React + Vite + TailwindCSS + PWA)

> SMCB와 동일한 스택으로 새 프로젝트를 처음부터 세팅하는 단계별 가이드.  
> 이 문서대로 따라가면 로컬 개발 → GitHub 배포까지 완성된다.

---

## 스택 요약

| 항목 | 기술 | 버전 |
|------|------|------|
| UI 프레임워크 | React | 18.x |
| 빌드 도구 | Vite | 5.x |
| 스타일 | TailwindCSS | 3.x |
| 언어 | TypeScript | 5.x |
| 상태 관리 | Zustand | 4.x |
| 라우팅 | react-router-dom | 6.x |
| PWA | vite-plugin-pwa + Workbox | 0.20.x |
| 아이콘 | lucide-react | 0.4x |
| 영구 저장소 | idb-keyval (IndexedDB) | 6.x |
| 배포 | GitHub Pages (GitHub Actions) | — |

---

## 디렉터리 구조

```
프로젝트루트/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 자동 배포
├── app/                        # 실제 앱 소스 (Vite 프로젝트)
│   ├── src/
│   │   ├── components/         # 공통 UI 컴포넌트
│   │   ├── pages/              # 라우트별 페이지
│   │   ├── stores/             # Zustand 상태 스토어
│   │   ├── lib/                # 유틸리티, 비즈니스 로직
│   │   ├── data/               # 정적 JSON 데이터
│   │   ├── styles/
│   │   │   ├── tokens.css      # 디자인 토큰 (색상, 폰트)
│   │   │   └── index.css       # Tailwind 진입점
│   │   ├── App.tsx             # 라우터 설정
│   │   ├── main.tsx            # 앱 진입점 + SW 등록
│   │   └── sw.ts               # 커스텀 Service Worker (선택)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── package.json
├── Docs/                       # 이 가이드 문서들
└── .gitignore
```

---

## 1단계 — GitHub 저장소 준비

### 1-1. 코드 소유 계정(mykim711231)에 저장소 생성
이미 생성되어 있으면 skip.

### 1-2. 배포 계정(gababayo)에 저장소 생성
1. `https://github.com/new` 접속 (gababayo 계정으로 로그인)
2. Repository name: `irishPlay`
3. **Public** 선택 (GitHub Pages는 Public이어야 무료)
4. "Initialize this repository" **체크 안 함**
5. **Create repository** 클릭

### 1-3. 로컬에 클론 및 두 remote 설정

```powershell
# 클론 (mykim 계정이 origin)
git clone https://github.com/mykim711231/irishPlay.git "D:\_Git\irishPlay"
cd "D:\_Git\irishPlay"

# 배포용 remote 추가
git remote add gababayo https://github.com/gababayo/irishPlay.git

# 확인
git remote -v
# origin    https://github.com/mykim711231/irishPlay.git (fetch/push)
# gababayo  https://github.com/gababayo/irishPlay.git (fetch/push)
```

---

## 2단계 — 앱 초기 세팅

### 2-1. 패키지 설치

```powershell
cd "D:\_Git\irishPlay\app"
npm install
```

### 2-2. 로컬 개발 서버 실행

```powershell
npm run dev
# → http://localhost:5173/ 에서 앱 확인
```

### 2-3. 빌드 확인

```powershell
npm run build
# → app/dist/ 폴더에 빌드 결과물 생성

npm run preview
# → http://localhost:4173/irishPlay/ 에서 프로덕션 빌드 확인
```

---

## 3단계 — 핵심 파일 설명

### `vite.config.ts` — 빌드 설정

```typescript
// 배포 경로 분기
// GitHub Pages: /irishPlay/
// Cloudflare Pages: /
const isCloudflare = process.env.DEPLOY_TARGET === 'cf';
const base = isCloudflare ? '/' : '/irishPlay/';
```

- `base` 값이 라우터의 `start_url`, `scope`, PWA manifest에 모두 적용됨
- 저장소 이름이 바뀌면 `/irishPlay/` 부분을 저장소 이름으로 변경

### `src/main.tsx` — 앱 진입점

```typescript
// HashRouter 사용 — GitHub Pages의 SPA 라우팅 문제를 해결
// BrowserRouter는 404가 발생하므로 사용하지 않음
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
);
```

### `src/styles/tokens.css` — 디자인 토큰

```css
/* 모든 색상을 CSS 변수로 관리 — 라이트/다크 모드 전환이 클래스 토글만으로 됨 */
:root {
  --rgb-bg: 250 250 250;
  --rgb-text: 23 23 27;
  --rgb-primary: 37 99 235;
  /* ... */
}

html.dark {
  --rgb-bg: 15 17 21;
  --rgb-text: 230 232 236;
  /* ... */
}
```

Tailwind에서 사용할 때:
```typescript
// tailwind.config.js에 등록 후
// className="bg-bg text-fg text-primary" 처럼 사용
```

### `src/stores/` — Zustand 상태 관리

```typescript
// 기본 패턴: IndexedDB(idb-keyval)에 자동 영속화
import { create } from 'zustand';
import { dbGet, dbSet } from '@/lib/db';

export const useSettings = create<SettingsState>((set, get) => ({
  theme: 'system',
  // ...
  hydrate: async () => {
    const saved = await dbGet('settings:v1');
    if (saved) set({ ...saved });
  },
}));

// 앱 시작 시 hydrate 호출
void useSettings.getState().hydrate();
```

---

## 4단계 — GitHub Pages 배포 설정

### 4-1. 첫 push

```powershell
cd "D:\_Git\irishPlay"
git add .
git commit -m "feat: 프로젝트 초기 세팅"

# 배포용 계정(gababayo)에 push
git push gababayo main

# 코드 소유 계정(mykim)에도 동기화
git push origin main
```

### 4-2. GitHub Pages 활성화

1. `https://github.com/gababayo/irishPlay/settings/pages` 접속
2. Build and deployment → Source: **GitHub Actions** 선택
3. 저장

### 4-3. 이후 배포 흐름

```powershell
# 작업 후 두 remote에 push
git push gababayo main   # → GitHub Actions 자동 실행 → GitHub Pages 배포
git push origin main     # → mykim 계정 동기화 (백업)
```

배포 URL: `https://gababayo.github.io/irishPlay/`  
Actions 상태: `https://github.com/gababayo/irishPlay/actions`

---

## 5단계 — PWA 설치 확인

배포 후 모바일 브라우저에서:

1. `https://gababayo.github.io/irishPlay/` 접속
2. 브라우저 메뉴 → "홈 화면에 추가"
3. 앱 아이콘으로 실행 → 독립 실행형(standalone) 모드로 열리면 성공

---

## 자주 쓰는 명령어

```powershell
# 개발 서버
cd "D:\_Git\irishPlay\app" && npm run dev

# 타입 체크
npm run typecheck

# 프로덕션 빌드
npm run build

# 배포
cd "D:\_Git\irishPlay"
git push gababayo main
git push origin main
```

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| `git push gababayo main` 오류 | gababayo 저장소가 없거나 권한 없음 | GitHub에서 저장소 생성 확인, gababayo 계정으로 로그인 여부 확인 |
| 배포 후 흰 화면 | `base` 경로 불일치 | `vite.config.ts`의 base가 저장소 이름과 일치하는지 확인 |
| 새로고침 시 404 | SPA 라우팅 문제 | `HashRouter` 사용 확인, `dist/404.html` 복사 확인 |
| PWA 설치 안 됨 | HTTPS 필요 | GitHub Pages는 HTTPS 자동 적용 — 로컬(`http://`)에서는 설치 불가 |
| 앱 업데이트 안 됨 | SW 캐시 | 브라우저 개발자 도구 → Application → Service Workers → Update |
