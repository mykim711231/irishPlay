# Foinn Seisiún Interactive App — 통합 구현 명세서 (BUILD SPEC)

> **이 문서 하나로 앱 전체를 구현합니다.**
> 대상: Claude Code 등 자율 코딩 에이전트
> 버전: v4.0 (통합본) · 2026-06
> 이전 v2(기능/데이터) + v3(연습모드 디자인)을 단일 문서로 통합하고 누락분을 보완했습니다.

---

## 0. 에이전트 작업 규칙 (먼저 읽을 것)

1. **Phase 순서대로** 진행한다. Phase N을 끝내기 전에 N+1로 넘어가지 않는다.
2. 각 Phase 끝에는 **완료 기준(Acceptance Criteria)** 이 있다. 그 기준을 모두 충족해야 다음으로 넘어간다.
3. 코드를 작성한 뒤에는 **반드시 `npm run dev`로 빌드가 깨지지 않는지** 확인한다.
4. 이 문서에 **명시된 파일 경로·이름·토큰을 그대로** 사용한다. 임의로 바꾸지 않는다.
5. 외부 데이터(곡 ABC)는 저작권 규칙(§11)을 지킨다. **thesession.org를 주 출처**로 한다.
6. 막히면 추측하지 말고, 해당 섹션의 코드 예시를 우선 사용한다.
7. 커밋은 Phase 단위로 한다. 커밋 메시지: `feat(phaseN): <요약>`.

---

## 1. 프로젝트 개요

**무엇을 만드는가:** 아일랜드 전통 세션 악보집 *Foinn Seisiún* 1·2·3권(총 328곡)을 디지털 인터랙티브 연습 앱으로 만든다. 악보 표시 + 연주(MIDI) + 연주 위치 커서 + 속도 조절 + 악기 선택 + 퍼커션 반주를 제공한다.

**어떻게 배포하는가:** React PWA로 빌드하여 **GitHub Pages**에 올린다. 앱스토어 불필요. iOS·Android·PC 브라우저에서 모두 동작하며, 홈 화면에 추가하면 앱처럼 실행된다.

**핵심 차별점:** 악보가 화면의 주인공인 **연습 중심 레이아웃**. "전체 보기 / 집중 보기" 토글과 집중모드 자동 스크롤을 제공한다.

### 1.1 규모
| 권 | 곡 수 | 세트 수 |
|----|------|--------|
| Book 1 | 116 | 39 |
| Book 2 | 104 | 35 |
| Book 3 | 108 | 38 |
| **합계** | **328** | **112** |

---

## 2. 기술 스택 & 의존성

| 역할 | 패키지 | 설치 |
|------|--------|------|
| 악보 렌더 + 멜로디 재생 | `abcjs` | `npm i abcjs` |
| 악기 음색 (선택적 보강) | `soundfont-player` | `npm i soundfont-player` |
| 퍼커션/오디오 | `tone` | `npm i tone` |
| 프레임워크 | `react`, `react-dom` | (vite 템플릿 포함) |
| 빌드 | `vite`, `@vitejs/plugin-react` | (vite 템플릿 포함) |
| 스타일 | `tailwindcss`, `postcss`, `autoprefixer` | `npm i -D tailwindcss postcss autoprefixer` |
| PWA | `vite-plugin-pwa` | `npm i -D vite-plugin-pwa` |
| 배포 | `gh-pages` | `npm i -D gh-pages` |

> **abcjs 단독으로 악보 렌더 + 음표 커서 + MIDI 재생이 모두 가능**하다. soundfont-player와 tone은 음색 보강과 퍼커션을 위해 사용한다. 멜로디 기본 재생은 abcjs.synth만으로 충분하다.

---

## 3. 폴더 구조 (이대로 생성)

```
foinn-seisiun/
├── public/
│   ├── manifest.webmanifest        # PWA (§12.3)
│   └── icons/                      # 192/512 아이콘 (placeholder 가능)
├── scripts/
│   └── fetch_tunes.mjs             # ABC 수집 스크립트 (§5.2)
├── src/
│   ├── data/
│   │   ├── tunes.json              # 곡 데이터 (§4.1)
│   │   ├── sets.json               # 세트 데이터 (§4.2)
│   │   └── instruments.js          # 악기 매핑 (§6.1)
│   ├── audio/
│   │   ├── melodyPlayer.js         # abcjs 멜로디 재생 (§7.1)
│   │   ├── percussion.js           # 바우런/스푼 엔진 (§7.2)
│   │   ├── rhythmPatterns.js       # 리듬 패턴 (§7.3)
│   │   └── abcTransform.js         # 로휘슬 옥타브 등 ABC 전처리 (§6.2)
│   ├── components/
│   │   ├── TopBar.jsx              # 곡정보 + 모드토글 (§9)
│   │   ├── ScoreView.jsx           # abcjs 악보 + current/peek (§8,§10)
│   │   ├── PlayerControls.jsx      # 재생/정지/BPM/빠른속도 (§9)
│   │   ├── InstrumentPicker.jsx    # 멜로디 악기 (§9)
│   │   ├── PercussionToggle.jsx    # 바우런/스푼 (§9)
│   │   ├── ControlTray.jsx         # 펼침형 트레이 (§9)
│   │   ├── TuneList.jsx            # 곡목록/검색/필터
│   │   └── SetPlayer.jsx           # 세트 연속재생
│   ├── hooks/
│   │   ├── usePlayback.js          # 재생상태 + 커서 + 자동스크롤 (§10)
│   │   └── useViewMode.js          # 전체/집중 토글
│   ├── styles/
│   │   └── tokens.css              # 디자인 토큰 (§8.1)
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js                  # (§12.1)
├── tailwind.config.js              # (§12.2)
├── postcss.config.js
└── package.json                    # (§12.4)
```

---

## 4. 데이터 스키마

### 4.1 `src/data/tunes.json` — 곡 1개 구조
```json
{
  "id": "morning-dew",
  "title": "The Morning Dew",
  "book": 1,
  "page": 12,
  "rhythm": "reel",
  "meter": "4/4",
  "key": "Dmaj",
  "defaultBpm": 110,
  "setId": "set-03",
  "setOrder": 1,
  "abc": "X:1\nT:The Morning Dew\nM:4/4\nL:1/8\nR:reel\nK:Dmaj\n|:DEFA BAFA|DEFA BABd|...:|",
  "source": "thesession.org",
  "sourceUrl": "https://thesession.org/tunes/xxxx"
}
```
- `rhythm` 허용값: `reel | jig | slipjig | hornpipe | polka | slide`
- `abc` 안의 줄바꿈은 반드시 `\n` (JSON 이스케이프). 렌더 시 그대로 abcjs에 전달.
- 파일 최상위는 곡 객체의 **배열**: `[ {...}, {...} ]`

### 4.2 `src/data/sets.json` — 세트 구조
```json
{
  "id": "set-03",
  "book": 1,
  "name": "Kilmaley / St. Anne's / Green Mountain",
  "rhythm": "reel",
  "tuneIds": ["kilmaley", "st-annes", "green-mountain"]
}
```
파일 최상위는 세트 객체의 **배열**.

### 4.3 최소 동작용 시드 데이터 (Phase 2에서 바로 사용)
Phase 1 전체 수집 전에 앱이 돌아가도록, 아래 3곡을 `tunes.json` 초기값으로 넣는다. (ABC는 thesession.org 등에서 받은 실제 곡으로 교체 가능. 아래는 구조 검증용 간단 멜로디.)
```json
[
  {
    "id": "morning-dew", "title": "The Morning Dew", "book": 1, "page": 12,
    "rhythm": "reel", "meter": "4/4", "key": "Dmaj", "defaultBpm": 110,
    "setId": "set-03", "setOrder": 1,
    "abc": "X:1\nT:The Morning Dew\nM:4/4\nL:1/8\nR:reel\nK:Dmaj\n|:D2FA BAFA|DEFA BABd|D2FA BAFA|defe dBAF:|",
    "source": "seed", "sourceUrl": ""
  },
  {
    "id": "out-on-the-ocean", "title": "Out on the Ocean", "book": 1, "page": 20,
    "rhythm": "jig", "meter": "6/8", "key": "Gmaj", "defaultBpm": 120,
    "setId": "set-07", "setOrder": 1,
    "abc": "X:1\nT:Out on the Ocean\nM:6/8\nL:1/8\nR:jig\nK:Gmaj\n|:G3 GAB|AGE EDB,|G3 GAB|AGA BGE:|",
    "source": "seed", "sourceUrl": ""
  },
  {
    "id": "britches-full", "title": "Britches Full of Stitches", "book": 1, "page": 33,
    "rhythm": "polka", "meter": "2/4", "key": "Dmaj", "defaultBpm": 130,
    "setId": "set-11", "setOrder": 1,
    "abc": "X:1\nT:Britches Full of Stitches\nM:2/4\nL:1/8\nR:polka\nK:Dmaj\n|:A>B AF|E2 D2|F>G FE|D2 D2:|",
    "source": "seed", "sourceUrl": ""
  }
]
```
대응 `sets.json` 시드:
```json
[
  { "id": "set-03", "book": 1, "name": "Morning Dew Set", "rhythm": "reel", "tuneIds": ["morning-dew"] },
  { "id": "set-07", "book": 1, "name": "Out on the Ocean Set", "rhythm": "jig", "tuneIds": ["out-on-the-ocean"] },
  { "id": "set-11", "book": 1, "name": "Britches Set", "rhythm": "polka", "tuneIds": ["britches-full"] }
]
```

---

## 5. Phase 1 — ABC 데이터 수집

### 5.1 전략
- **주 출처: thesession.org** (CC BY, 출처 표기 후 사용 가능). 곡명으로 검색 → ABC 받기.
- Foinn Seisiún PDF를 직접 복사하지 않는다. 동일 곡의 thesession 버전을 사용한다.
- thesession.org는 곡별 JSON/ABC API가 있다: `https://thesession.org/tunes/{id}?format=json` 및 검색 `https://thesession.org/tunes/search?q={name}&format=json`.
- 전통 선율 자체는 퍼블릭 도메인. 출처 메타(`source`, `sourceUrl`)는 항상 기록한다.

### 5.2 `scripts/fetch_tunes.mjs` — 수집 스크립트
입력: `scripts/tune_list.json` (곡명 + book/page/set 메타의 목록). 출력: `src/data/tunes.json`.

```js
// scripts/fetch_tunes.mjs
// 사용법: node scripts/fetch_tunes.mjs
// tune_list.json의 각 곡을 thesession.org에서 검색해 ABC를 채운다.
import fs from 'node:fs/promises';

const SLEEP = (ms) => new Promise(r => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function searchTune(name) {
  const url = `https://thesession.org/tunes/search?q=${encodeURIComponent(name)}&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'foinn-seisiun-app/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  return data.tunes?.[0] ?? null; // 첫 결과 사용 (수동 검수 권장)
}

async function fetchAbc(tuneId) {
  const url = `https://thesession.org/tunes/${tuneId}?format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'foinn-seisiun-app/1.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  const setting = data.settings?.[0];
  if (!setting) return null;
  // thesession은 body만 주므로 헤더를 합성한다
  const header = [
    `X:1`, `T:${data.name}`, `M:${data.settings[0].meter || ''}`,
    `L:1/8`, `R:${data.type || ''}`, `K:${setting.key || ''}`
  ].join('\n');
  return { abc: `${header}\n${setting.abc}`, key: setting.key, meter: setting.meter };
}

const list = JSON.parse(await fs.readFile('scripts/tune_list.json', 'utf8'));
const out = [];
for (const item of list) {
  try {
    const hit = await searchTune(item.title);
    if (!hit) { console.warn('MISS:', item.title); out.push({ ...item, abc: '', source: 'manual', sourceUrl: '' }); continue; }
    const detail = await fetchAbc(hit.id);
    out.push({
      id: slug(item.title), title: item.title, book: item.book, page: item.page,
      rhythm: item.rhythm, meter: detail?.meter || item.meter, key: detail?.key || item.key,
      defaultBpm: item.defaultBpm ?? 110, setId: item.setId, setOrder: item.setOrder,
      abc: detail?.abc || '', source: 'thesession.org',
      sourceUrl: `https://thesession.org/tunes/${hit.id}`
    });
    console.log('OK:', item.title);
    await SLEEP(800); // 서버 예의상 딜레이
  } catch (e) { console.error('ERR', item.title, e.message); }
}
await fs.writeFile('src/data/tunes.json', JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} tunes.`);
```

`scripts/tune_list.json` 예시 (Foinn Seisiún 곡 목록을 채워 넣는다):
```json
[
  { "title": "The Morning Dew", "book": 1, "page": 12, "rhythm": "reel", "meter": "4/4", "key": "Dmaj", "setId": "set-03", "setOrder": 1 }
]
```

### 5.3 Phase 1 완료 기준
- [ ] `scripts/fetch_tunes.mjs` 실행 시 에러 없이 `src/data/tunes.json` 생성
- [ ] 각 곡에 `id, title, book, rhythm, abc, source, sourceUrl` 존재
- [ ] `abc`가 빈 곡은 콘솔에 `MISS`로 보고됨 (수동 보완 목록)
- [ ] 최소 시드 3곡(§4.3)은 즉시 사용 가능

> **참고:** 전체 328곡 수집은 곡명 검색의 동명이곡 문제로 수동 검수가 필요하다. Phase 1은 "스크립트 + 시드 데이터"까지 완료로 본다. 전곡 수집은 점진적으로 진행한다.

---

## 6. 악기 시스템

### 6.1 `src/data/instruments.js` — 멜로디 악기 매핑
abcjs.synth는 General MIDI program 번호로 음색을 지정한다.

```js
// src/data/instruments.js
// program: General MIDI 번호, octave: ABC 옥타브 시프트(전처리에 사용)
export const MELODY_INSTRUMENTS = [
  { id: 'fiddle',    label: 'Fiddle',       emoji: '🎻', program: 40, octave: 0 },  // Violin
  { id: 'tinwhistle',label: 'Tin Whistle',  emoji: '🪈', program: 72, octave: 0 },  // Piccolo
  { id: 'lowwhistle',label: 'Low Whistle',  emoji: '🎵', program: 73, octave: -1 }, // Flute, 1옥타브 아래
  { id: 'flute',     label: 'Flute',        emoji: '🎺', program: 73, octave: 0 },  // Flute
  { id: 'accordion', label: 'Accordion',    emoji: '🪗', program: 21, octave: 0 },  // Accordion
  { id: 'bouzouki',  label: 'Bouzouki',     emoji: '🎸', program: 25, octave: 0 },  // Steel guitar
  { id: 'piano',     label: 'Piano',        emoji: '🎹', program: 0,  octave: 0 },
];

export const getInstrument = (id) =>
  MELODY_INSTRUMENTS.find(i => i.id === id) ?? MELODY_INSTRUMENTS[0];
```

### 6.2 `src/audio/abcTransform.js` — 로 휘슬 옥타브 전처리
로 휘슬은 flute 음색을 1옥타브 낮춰 표현한다. ABC의 본문 음표를 옥타브 내린다.
**악보 표시는 원본 ABC**, **재생만 시프트한 ABC**를 쓴다 (보표는 그대로 보이게).

```js
// src/audio/abcTransform.js
// ABC 음표 옥타브를 shift만큼 이동 (재생용). +1=한 옥타브 위, -1=아래.
// 규칙: 대문자 C =낮은옥타브, 소문자 c =높은옥타브, 콤마(,)=내림, 어포스트로피(')=올림
export function shiftAbcOctave(abc, shift) {
  if (!shift) return abc;
  const lines = abc.split('\n');
  return lines.map(line => {
    // 헤더 줄(X: T: M: 등)은 건드리지 않음
    if (/^[A-Za-z]:/.test(line)) return line;
    return line.replace(/([A-Ga-g])([,']*)/g, (m, note, marks) => {
      let oct = (note === note.toLowerCase() ? 1 : 0)
              + (marks.match(/'/g)?.length || 0)
              - (marks.match(/,/g)?.length || 0);
      oct += shift;
      // oct를 다시 표기로 환원
      let base = note.toUpperCase(), suffix = '';
      if (oct >= 1) { base = note.toLowerCase(); for (let i=1;i<oct;i++) suffix += "'"; }
      else { base = note.toUpperCase(); for (let i=0;i<-oct;i++) suffix += ','; }
      return base + suffix;
    });
  }).join('\n');
}
```

### 6.3 퍼커션 악기 (바우런/스푼)
타악기는 음정이 없으므로 **악보를 연주하지 않는다.** 곡의 `rhythm`에 맞는 반주 패턴을 반복 재생한다. 바우런과 스푼은 동일 엔진, 사운드만 다르다(§7.2).

---

## 7. 오디오 엔진

### 7.1 `src/audio/melodyPlayer.js` — 멜로디 재생 (abcjs.synth)
```js
// src/audio/melodyPlayer.js
import abcjs from 'abcjs';
import { getInstrument } from '../data/instruments';
import { shiftAbcOctave } from './abcTransform';

// AudioContext는 사용자 제스처(클릭) 이후에만 생성/resume 가능
let audioContext = null;
export function ensureAudioContext() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

// renderTargetId: 악보를 그릴 DOM id. abc: 원본. instrumentId, bpm.
export async function createMelody({ abc, renderTargetId, instrumentId, bpm, cursorControl }) {
  const inst = getInstrument(instrumentId);
  const playAbc = shiftAbcOctave(abc, inst.octave); // 재생용(시프트)
  // 화면에는 원본 abc를 그린다 (ScoreView가 담당). 여기선 재생용 visualObj 생성.
  const visualObj = abcjs.renderAbc(renderTargetId, abc, {
    add_classes: true, responsive: 'resize'
  })[0];

  const synth = new abcjs.synth.CreateSynth();
  await ensureAudioContextReady();
  await synth.init({
    audioContext: ensureAudioContext(),
    visualObj,
    options: {
      program: inst.program,
      // abcjs는 qpm을 visualObj/Timing에서 받음. bpm은 SynthController로 제어(아래 7.4).
    }
  });
  await synth.prime();
  return { synth, visualObj };
}

async function ensureAudioContextReady() {
  const ctx = ensureAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();
}
```

### 7.2 `src/audio/percussion.js` — 바우런/스푼 (Tone.js)
```js
// src/audio/percussion.js
import * as Tone from 'tone';
import { RHYTHM_PATTERNS } from './rhythmPatterns';

// type: 'bodhran' | 'spoons'
export function createPercussion({ rhythm, bpm, type }) {
  const synth = type === 'bodhran'
    ? new Tone.MembraneSynth({ octaves: 2, pitchDecay: 0.05 }).toDestination()
    : new Tone.MetalSynth({ frequency: 400, envelope: { attack: 0.001, decay: 0.05, release: 0.01 } }).toDestination();

  const pattern = RHYTHM_PATTERNS[rhythm] || RHYTHM_PATTERNS.reel;
  Tone.getTransport().bpm.value = bpm;

  const seq = new Tone.Sequence((time, hit) => {
    if (hit === 'D') synth.triggerAttackRelease(type === 'bodhran' ? 'C2' : 'C4', '8n', time, 1.0);
    else if (hit === 't') synth.triggerAttackRelease(type === 'bodhran' ? 'C2' : 'C4', '16n', time, 0.4);
    // '-' 는 쉼
  }, pattern, '8n');

  return {
    start() { Tone.getTransport().start(); seq.start(0); },
    stop()  { seq.stop(); Tone.getTransport().stop(); },
    setBpm(v) { Tone.getTransport().bpm.value = v; },
    dispose() { seq.dispose(); synth.dispose(); },
  };
}
```

### 7.3 `src/audio/rhythmPatterns.js`
```js
// src/audio/rhythmPatterns.js
// D=강박, t=약박, '-'=쉼. 8분음표 그리드 기준.
export const RHYTHM_PATTERNS = {
  reel:     ['D','t','D','t','D','t','D','t'],            // 4/4
  jig:      ['D','t','t','D','t','t'],                    // 6/8
  slipjig:  ['D','t','t','D','t','t','D','t','t'],         // 9/8
  hornpipe: ['D','-','t','-','D','-','t','-'],             // 4/4 스윙
  polka:    ['D','t','D','t'],                            // 2/4
  slide:    ['D','t','t','t','t','t','D','t','t','t','t','t'], // 12/8
};
```

### 7.4 멜로디 ↔ 퍼커션 동기화
- 멜로디(abcjs)와 퍼커션(Tone.js)의 BPM을 **같은 값**으로 둔다.
- 재생 시작 시 둘을 동시에 트리거한다.
- 정밀 동기화: abcjs `SynthController`/`TimingCallbacks`의 시작 콜백에서 `Tone.getTransport().start()`를 호출한다.
- BPM 슬라이더 변경 시: 멜로디는 재생 중 재생성 또는 `TimingCallbacks` 갱신, 퍼커션은 `setBpm(v)`.

> **주의:** AudioContext와 Tone.start()는 **반드시 사용자 클릭 핸들러 안에서** 최초 호출되어야 한다(브라우저 자동재생 정책). 재생 버튼 onClick에서 `await Tone.start()`와 `ensureAudioContext()`를 먼저 부른다.

---

## 8. 디자인 토큰 (연습모드, 승인본)

### 8.1 `src/styles/tokens.css`
```css
:root{
  --bg:#f5f3ee;        /* 앱 배경 (따뜻한 아이보리) */
  --paper:#ffffff;     /* 악보지·바·카드 */
  --ink:#1d2127;       /* 본문·음표 */
  --line:#e3ded2;      /* 구분선·테두리 */
  --staff:#3a3f47;     /* 5선보·마디선 */
  --note:#1d2127;      /* 음표 */
  --teal:#1f6f6b;      /* 주요 액션(재생) */
  --teal-d:#155551;    /* 선택 칩·버튼 */
  --amber:#e8a33d;     /* 연주 중 음표 커서 */
  --hl:#ffd24a;        /* 현재 줄 하이라이트 */
  --hl-bg:rgba(255,210,74,.30);
  --dim:#7a8088;       /* 보조 텍스트 */
}
```
폰트:
```html
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```
| 역할 | 폰트 | 용도 |
|------|------|------|
| 디스플레이 | Fraunces (serif) | 곡 제목, BPM 숫자 |
| 본문/UI | Inter (sans) | 라벨·버튼·메타 |

타입 스케일: 곡제목 PC 19px/폰 16px(600), 메타 11.5px, BPM 15px(600 teal), 파트라벨 12px(700 teal, 자간1px), 버튼/칩 12.5px(600).

### 8.2 색상 사용 규칙
- 재생 버튼 = `--teal`, 선택된 칩/토글 ON = `--teal-d` 또는 `--teal`.
- 현재 연주 줄(.system.current) 배경 = `--hl-bg`, 현재 음표(.cur) = `--amber`.
- 5선보/마디선 = `--staff`. 악보 음표 = `--note`(기본), 연주 중만 `--amber`.

---

## 9. 레이아웃 & 컴포넌트

### 9.1 전체 레이아웃 (세로 스택, 악보가 주인공)
```
body (flex column, height:100vh, overflow:hidden)
├── TopBar        (flex-shrink:0)   뒤로 + 곡정보 + 모드토글
├── ScoreView     (flex:1, overflow-y:auto)  ← 악보, 화면의 70~80%
└── 하단 영역      (flex-shrink:0)
     ├── PlayerControls  재생·정지·반복·BPM슬라이더·빠른속도칩
     └── ControlTray     (펼침/접힘) InstrumentPicker + PercussionToggle + 반복선택
```

### 9.2 TopBar.jsx
- 왼쪽: 뒤로가기(‹) → 곡목록
- 가운데: 곡 제목(Fraunces) + 메타(`{rhythm} · {key} · Book {book} p.{page} · {setName}`), 리듬명만 teal bold
- 오른쪽: **전체/집중 보기 토글** (세그먼트 컨트롤). 상태는 `useViewMode`.
- 폰(≤640px): 토글은 아이콘만(📄/🔍), 제목 16px.

### 9.3 PlayerControls.jsx
| 요소 | 기능 | 스타일 |
|------|------|--------|
| ▶/⏸ | 재생/일시정지 | 54px 원형 teal, 그림자 |
| ■ | 정지(처음으로) | 42px 원형 보더 |
| ↩ | 현재 구간 루프 | 42px 원형 보더 |
| 슬라이더 | 40~200 BPM | teal 채움 + BPM 숫자 |
| 빠른속도 | 50% / 기본 / 세션 | 칩 3개 (폰 숨김) |
| 🎻 | 트레이 펼치기 | 아이콘 버튼 |

- "50%"=defaultBpm×0.5, "기본"=defaultBpm, "세션"=defaultBpm×1.15 (반올림).
- 재생 onClick에서 **먼저** `await Tone.start()` + `ensureAudioContext()` 호출 (§7.4).

### 9.4 ControlTray.jsx (펼침/접힘)
- `max-height` 0 → 160px 트랜지션.
- 멜로디 드롭다운(InstrumentPicker) + 반주 토글(PercussionToggle) + 반복(A/B/전체).

### 9.5 InstrumentPicker.jsx
- `MELODY_INSTRUMENTS`로 드롭다운 생성. 선택 시 재생 악기 변경(재생 중이면 다음 재생부터 또는 즉시 재생성).

### 9.6 PercussionToggle.jsx
- 바우런 / 스푼 각각 ON·OFF 토글 버튼. ON이면 `createPercussion`을 활성화하고 멜로디와 동기 재생.

### 9.7 반응형 분기
| 화면 | 조건 | 변경 |
|------|------|------|
| PC/태블릿 | 기본 | 토글 텍스트, 빠른속도 노출, 집중확대 1.55배 |
| 폰 | `max-width:640px` | 토글 아이콘만, 빠른속도 숨김, 집중확대 1.15배, 제목 16px |

`.sheet`는 `width:100%; max-width:1000px; margin:0 auto`. 음표 위치는 % 기반이라 화면 크기 무관하게 비율 유지(단, abcjs SVG는 `responsive:'resize'`가 처리).

---

## 10. ScoreView & 집중모드 (핵심 기능)

### 10.1 ScoreView.jsx 책임
1. `abcjs.renderAbc(targetId, abc, { add_classes:true, responsive:'resize' })`로 **원본 ABC** 악보 렌더.
2. 렌더된 SVG의 각 보표 줄(staff system)을 식별해 `.system` 단위로 관리.
3. 현재 연주 줄에 `.current`, 다음 줄에 `.peek` 클래스 부여(집중모드용).
4. `useViewMode`의 모드(`full`/`focus`)를 `body` 또는 루트에 클래스로 반영.

> abcjs는 `add_classes:true`이면 음표/보표에 클래스를 부여한다. 줄 경계는 abcjs의 line 정보(visualObj의 lines) 또는 SVG의 staff group으로 판별한다.

### 10.2 집중모드 CSS (tokens.css 또는 ScoreView 스코프)
```css
/* 전체 보기: 전체 악보 표시, 현재 줄만 띠 강조 */
.system.current{ background:var(--hl-bg); border-radius:10px; box-shadow:0 0 0 8px var(--hl-bg); }

/* 집중 보기: 현재 줄만 크게, 다음 줄 흐리게 */
.focus .system{ display:none; }
.focus .system.current{
  display:block; transform:scale(1.55); transform-origin:top center; margin:40px 0 120px;
}
.focus .system.peek{ display:block; opacity:.32; }

@media (max-width:640px){
  .focus .system.current{ transform:scale(1.15); }
}

/* 연주 중 음표 */
.abcjs-note.cur, .note.cur{ fill:var(--amber); }
```

### 10.3 `src/hooks/usePlayback.js` — 커서 + 자동 스크롤
abcjs `synth.CursorControl` 패턴으로 현재 음표를 추적하고, 집중모드면 현재 줄로 스크롤한다.

```js
// src/hooks/usePlayback.js (요지)
import abcjs from 'abcjs';

export function makeCursorControl({ getMode, onSystemChange }) {
  let currentSystem = -1;
  return {
    onStart() {},
    onEvent(ev) {
      if (!ev || ev.measureStart && ev.left === null) return;
      // 1) 이전 하이라이트 제거 후 현재 음표 강조
      document.querySelectorAll('.abcjs-note.cur').forEach(n => n.classList.remove('cur'));
      (ev.elements || []).flat().forEach(el => el.classList?.add('cur'));

      // 2) 현재 음표가 속한 줄(system) 인덱스
      const line = ev.line ?? 0;
      if (line !== currentSystem) {
        currentSystem = line;
        onSystemChange?.(line); // ScoreView가 .current/.peek 재지정
        // 3) 집중모드면 부드럽게 스크롤
        if (getMode?.() === 'focus') {
          const cur = document.querySelector('.system.current');
          cur?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    onFinished() {
      document.querySelectorAll('.abcjs-note.cur').forEach(n => n.classList.remove('cur'));
      currentSystem = -1;
    }
  };
}
```
재생 연결:
```js
const synthControl = new abcjs.synth.SynthController();
synthControl.load('#audio-controls', cursorControl, {
  displayLoop: true, displayRestart: true, displayPlay: true, displayProgress: true
});
await synthControl.setTune(visualObj, false, { program, qpm: bpm });
```

### 10.4 §10 완료 기준
- [ ] 악보(abcjs SVG)가 화면의 대부분을 차지한다.
- [ ] 재생 시 현재 음표가 amber로 하이라이트된다.
- [ ] 전체/집중 토글이 동작한다.
- [ ] 집중모드에서 현재 줄이 확대되고 다음 줄이 흐리게 보인다.
- [ ] 집중모드 재생 중 줄이 바뀌면 자동 스크롤된다.

---

## 11. 저작권 규칙 (반드시 준수)

| 출처 | 라이선스 | 활용 |
|------|---------|------|
| thesession.org | CC BY | 출처 표기 후 사용 — **주 출처** |
| 전통 선율 자체 | 퍼블릭 도메인 | 자유 사용 |
| Foinn Seisiún PDF | © Comhaltas | **직접 복사 금지**, 동일곡 thesession 대체본 사용 |

- 앱 푸터에 표기: `Tunes sourced from thesession.org (CC BY). Foinn Seisiún © Comhaltas Ceoltóirí Éireann.`
- 각 곡 화면에 `sourceUrl` 원본 링크 제공.
- 비상업·교육용 앱으로 표시.

---

## 12. 설정 파일 (전문)

### 12.1 `vite.config.js`
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/foinn-seisiun/',   // GitHub Pages 레포명과 반드시 일치
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: false, // public/manifest.webmanifest 사용
    }),
  ],
});
```

### 12.2 `tailwind.config.js`
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f5f3ee', paper: '#ffffff', ink: '#1d2127', line: '#e3ded2',
        staff: '#3a3f47', teal: '#1f6f6b', tealD: '#155551',
        amber: '#e8a33d', hl: '#ffd24a', dim: '#7a8088',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```
`postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```
`src/main.jsx` 상단에 `import './styles/tokens.css'`와 Tailwind 디렉티브를 포함한 CSS를 import.

### 12.3 `public/manifest.webmanifest`
```json
{
  "name": "Foinn Seisiún",
  "short_name": "Foinn",
  "description": "아일랜드 세션 튠 연습 앱",
  "start_url": "/foinn-seisiun/",
  "scope": "/foinn-seisiun/",
  "display": "standalone",
  "background_color": "#f5f3ee",
  "theme_color": "#1f6f6b",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```
`index.html` `<head>`에 `<link rel="manifest" href="/foinn-seisiun/manifest.webmanifest">`와 폰트 link 추가.

### 12.4 `package.json` 스크립트
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "fetch": "node scripts/fetch_tunes.mjs",
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```
GitHub Pages 배포: 레포 생성 → `npm run deploy` → Settings > Pages에서 `gh-pages` 브랜치 지정. 접속: `https://<username>.github.io/foinn-seisiun/`.

---

## 13. 구현 Phase 로드맵 (순서대로)

각 Phase는 완료 기준을 모두 충족한 뒤 커밋하고 다음으로 넘어간다.

### Phase 1 — 데이터 (§4, §5)
**작업:** 폴더 생성, 시드 `tunes.json`/`sets.json`(§4.3), `scripts/fetch_tunes.mjs`(§5.2) 작성.
**완료 기준:** §5.3 체크리스트 통과. 시드 3곡으로 앱 데이터 로드 가능.

### Phase 2 — 프로젝트 셋업 (§2, §3, §12)
**작업:** Vite+React 초기화, 의존성 설치, §3 폴더/빈 컴포넌트 생성, §12 설정 파일 전부 작성, tokens.css + 폰트 연결.
**완료 기준:** `npm run dev` 정상 기동. 빈 화면이라도 에러 없음. `base` 경로 설정됨.

### Phase 3 — 악보 렌더 (§10.1)
**작업:** `ScoreView.jsx`에서 시드 곡 ABC를 abcjs로 렌더(`add_classes:true, responsive:'resize'`). §9.1 레이아웃(TopBar/ScoreView/하단) 골격.
**완료 기준:** 시드 3곡 악보가 SVG로 보인다. 악보가 화면 대부분을 차지한다.

### Phase 4 — 멜로디 재생 + 커서 + BPM (§7.1, §7.4, §10.3)
**작업:** `melodyPlayer.js`, `usePlayback.js`, `PlayerControls.jsx`(재생/정지/반복/BPM/빠른속도). AudioContext 사용자 제스처 처리.
**완료 기준:** 재생 시 소리가 나고, 현재 음표가 amber로 하이라이트되며, BPM 슬라이더로 속도가 바뀐다.

### Phase 5 — 멜로디 악기 선택 (§6.1, §6.2)
**작업:** `instruments.js`, `abcTransform.js`, `InstrumentPicker.jsx`. 로 휘슬 옥타브 시프트 적용(재생만, 악보는 원본).
**완료 기준:** 7종 악기 전환 가능. 로 휘슬이 flute보다 1옥타브 낮게 재생. 악보 표기는 변하지 않음.

### Phase 6 — 퍼커션 (§7.2, §7.3, §6.3)
**작업:** `percussion.js`, `rhythmPatterns.js`, `PercussionToggle.jsx`. 곡 `rhythm`에 맞는 패턴 자동 선택, 멜로디와 BPM 동기.
**완료 기준:** 바우런/스푼 ON 시 리듬 반주가 멜로디와 박자 맞춰 재생. OFF 시 멈춤. 리듬 타입별 패턴이 다름.

### Phase 7 — 집중모드 + 토글 + 자동스크롤 (§9.2, §10.2, §10.3)
**작업:** `useViewMode.js`, TopBar 토글, 집중모드 CSS, 자동 스크롤(onSystemChange + scrollIntoView).
**완료 기준:** §10.4 체크리스트 통과.

### Phase 8 — 곡목록·검색·세트 (§4)
**작업:** `TuneList.jsx`(권/리듬 필터+검색), `SetPlayer.jsx`(세트 연속재생).
**완료 기준:** Book 1/2/3 탭, 리듬 필터, 곡명 검색 동작. 세트의 곡들이 이어서 재생.

### Phase 9 — PWA + 배포 (§12.3, §12.4)
**작업:** manifest, 아이콘, `npm run deploy`로 GitHub Pages 배포.
**완료 기준:** 빌드 성공, Pages URL 접속, 홈 화면 추가 시 standalone 실행.

### Phase 10 — 반응형 검증 + 마감 (§9.7, §11)
**작업:** PC(1200)·태블릿(820)·폰(390) 검증, 저작권 푸터/링크, reduced-motion 존중, 키보드 포커스.
**완료 기준:** 세 너비에서 악보 최우선 유지. 푸터 출처 표기. 접근성 기본 충족.

---

## 14. 전역 완료 기준 (최종 점검)

- [ ] 시드 3곡으로 전체 흐름(악보→재생→커서→악기→퍼커션→집중모드)이 동작
- [ ] `npm run build` 무오류, `npm run deploy`로 Pages 배포 성공
- [ ] PC·태블릿·폰 모두 악보가 주인공인 레이아웃 유지
- [ ] 전체/집중 토글 + 집중모드 자동 스크롤 동작
- [ ] 로 휘슬 1옥타브 다운 / 바우런·스푼 리듬 반주 동작
- [ ] 저작권 출처 표기 및 곡별 원본 링크
- [ ] AudioContext/Tone.start가 사용자 클릭 이후에만 시작 (자동재생 정책 준수)

---

## 15. 알려진 함정 (에이전트 주의)

1. **AudioContext 자동재생 정책** — 페이지 로드 시 오디오를 켜면 막힌다. 반드시 재생 버튼 클릭 핸들러 안에서 `await Tone.start()` + `ctx.resume()`.
2. **GitHub Pages base 경로** — `vite.config.js`의 `base`와 manifest의 `start_url/scope`가 레포명과 불일치하면 흰 화면. 셋 다 `/foinn-seisiun/`로 통일.
3. **abcjs 옥타브 시프트는 재생용만** — 악보(ScoreView)는 원본 ABC로 렌더. 시프트한 ABC를 화면에 그리면 보표가 틀려 보인다.
4. **abcjs synth는 init→prime→start 순서** — prime 없이 start하면 소리 안 남.
5. **퍼커션·멜로디 BPM 동기** — 둘 중 하나만 바꾸면 어긋난다. 슬라이더는 양쪽 모두 갱신.
6. **localStorage 직접 사용 시** — 즐겨찾기 등은 try/catch로 감싼다(사파리 프라이빗 모드 예외).
7. **줄(system) 판별** — abcjs `onEvent`의 `ev.line`을 우선 사용. 없으면 visualObj의 lines 매핑.

---

## 16. 빠른 시작 (에이전트 첫 명령 예시)

> "이 문서(§3, §12)에 따라 foinn-seisiun Vite+React+Tailwind PWA를 초기화하고,
> 폴더 구조와 설정 파일을 모두 생성한 뒤 §4.3 시드 데이터를 넣어줘.
> 그다음 §13 Phase 순서대로 진행하되, 각 Phase 완료 기준을 충족하면 알려주고 다음으로 넘어가."

— 문서 끝 —
