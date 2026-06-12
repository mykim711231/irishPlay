# 05. MP3 생성

> 레퍼런스: `D:\_Git\SMCB\app\scripts\build-tts.ts`, `lib\ttsBulkDownload.ts`

---

## 방식 선택

| 방식 | 적합한 경우 | 오프라인 | 비고 |
|------|------------|---------|------|
| **A. 빌드타임 Neural TTS** | 고품질 음성, 오프라인 필수 | ✅ | `msedge-tts` 사용 |
| **B. 런타임 Web Speech** | 설치 용량 최소화 | ❌ | 기기 음성팩 의존 |
| **C. 런타임 MediaRecorder** | 사용자 직접 녹음 | ✅ | iOS 제한 있음 |

아이리시 전통음악 앱에서 **abcjs + Tone.js 음원을 MP3로 저장**하는 경우는 방식 C.

---

## 방식 A — 빌드타임 Neural TTS (SMCB 방식)

텍스트를 미리 MP3로 합성해 `public/tts/` 에 배포한다.

### 패키지 설치

```bash
npm install -D msedge-tts tsx
```

> **라이선스 주의**: `msedge-tts`는 Edge Read-Aloud 비공개 API 사용.  
> 비영리 프로젝트는 실용적 위험 낮음. 상업 프로젝트는 아래 대안 사용:
> - **Azure Speech Service F0** — 월 500K 자 무료, 공식 라이선스
> - **Piper TTS** (MIT, 로컬 합성): https://github.com/rhasspy/piper

### 파일 구성

```
app/
├── scripts/
│   ├── build-tts.ts    ← MP3 합성 스크립트
│   └── tts-texts.ts    ← 합성 대상 텍스트 수집
├── public/
│   └── tts/
│       └── <sha1-12>.mp3   ← 빌드 생성 파일
└── src/
    └── data/
        └── tts-manifest.json   ← 원문 → 파일명 매핑 (빌드 생성)
```

### scripts/tts-texts.ts

```typescript
// app/scripts/tts-texts.ts
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export const DATA_DIR = join(import.meta.dirname, '..', 'src', 'data');
export const OUT_DIR  = join(import.meta.dirname, '..', 'public', 'tts');
export const MANIFEST_PATH = join(DATA_DIR, 'tts-manifest.json');

export function hashName(text: string): string {
  return createHash('sha1').update(text).digest('hex').slice(0, 12) + '.mp3';
}

// ── 합성 대상 텍스트 수집 ─────────────────────────────────────
// 프로젝트에 맞게 수정
import tunesData from '../src/data/tunes.json' with { type: 'json' };

export function collectTexts(): string[] {
  return (tunesData as any[])
    .flatMap((tune) => [
      tune.title,
      tune.description ?? '',
    ])
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i);  // 중복 제거
}
```

### scripts/build-tts.ts

```typescript
// app/scripts/build-tts.ts
import {
  createWriteStream, existsSync, mkdirSync,
  readFileSync, writeFileSync,
} from 'node:fs';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { OUT_DIR, MANIFEST_PATH, hashName, collectTexts } from './tts-texts';

const VOICE       = 'en-US-JennyNeural';   // 프로젝트 언어에 맞게 변경
const CONCURRENCY = 4;                      // 병렬 합성 수

async function synthesize(voice: string, texts: string[]): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });

  // 기존 매니페스트 로드 (증분 합성 — 이미 있으면 skip)
  let manifest: Record<string, string> = {};
  if (existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  }

  const pending = texts.filter((t) => !manifest[t]);
  console.log(`총 ${texts.length}개 중 ${pending.length}개 합성 예정`);
  if (pending.length === 0) { console.log('✓ 모두 완료됨 (skip)'); return; }

  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  let done = 0;

  // CONCURRENCY 단위로 병렬 합성
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (text) => {
        const filename = hashName(text);
        const outPath  = `${OUT_DIR}/${filename}`;

        const stream = tts.toStream(text);
        await new Promise<void>((resolve, reject) => {
          const file = createWriteStream(outPath);
          stream.pipe(file);
          file.on('finish', resolve);
          file.on('error', reject);
        });

        manifest[text] = filename;
        done++;
        console.log(`[${done}/${pending.length}] ${text} → ${filename}`);
      })
    );
    // 매 배치마다 매니페스트 저장 (중간 중단 대비)
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf-8');
  }

  console.log(`✓ ${done}개 합성 완료. 총 ${Object.keys(manifest).length}개.`);
}

const texts = collectTexts();
const voice = process.argv[2] ?? VOICE;
synthesize(voice, texts).catch((e) => { console.error(e); process.exit(1); });
```

### package.json 스크립트

```json
{
  "scripts": {
    "build:tts":  "tsx scripts/build-tts.ts",
    "build":      "npm run build:tts && tsc -b && vite build"
  }
}
```

```bash
npm run build:tts                           # 기본 음성으로 합성
node --import tsx/esm scripts/build-tts.ts en-US-AriaNeural  # 음성 변경
```

### 런타임 재생 (lib/tts.ts에 추가)

```typescript
// app/src/lib/tts.ts 상단에 추가
import manifest from '@/data/tts-manifest.json';

const TTS_BASE     = `${import.meta.env.BASE_URL}tts/`;
const TTS_MANIFEST = manifest as Record<string, string>;
let   currentAudio: HTMLAudioElement | null = null;

export function speakFromManifest(
  text: string,
  fallbackLang = 'en-US',
  onEnd?: () => void,
): void {
  stopAudio();
  const filename = TTS_MANIFEST[text];

  if (filename) {
    const audio = new Audio(TTS_BASE + filename);
    audio.onended = () => { currentAudio = null; onEnd?.(); };
    audio.onerror = () => {
      currentAudio = null;
      void speak(text, fallbackLang, { onEnd });  // Web Speech fallback
    };
    currentAudio = audio;
    void audio.play();
  } else {
    void speak(text, fallbackLang, { onEnd });     // 매니페스트 miss → fallback
  }
}

export function stopAudio(): void {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}
```

### SW 캐시 워밍업 (오프라인 지원)

```typescript
// app/src/lib/ttsBulkDownload.ts
import manifest from '@/data/tts-manifest.json';

const TTS_BASE  = `${import.meta.env.BASE_URL}tts/`;
const MANIFEST  = manifest as Record<string, string>;
const CACHE_NAME = 'tts-audio';

export async function warmupTtsCache(
  onProgress?: (pct: number) => void
): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(CACHE_NAME);
  const urls  = Object.values(MANIFEST).map((f) => TTS_BASE + f);

  const CONCURRENCY = 6;
  let done = 0;

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (url) => {
        if (await cache.match(url)) { done++; return; }  // 이미 캐시됨
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        } catch { /* 네트워크 오류 — 무시 */ }
        done++;
        onProgress?.(Math.round((done / urls.length) * 100));
      })
    );
  }
}
```

`vite.config.ts` runtimeCaching에 audio CacheFirst 추가:

```typescript
{
  urlPattern: ({ request }) => request.destination === 'audio',
  handler: 'CacheFirst',
  options: {
    cacheName: 'tts-audio',
    expiration: { maxEntries: 5000, maxAgeSeconds: 60 * 60 * 24 * 365 },
    cacheableResponse: { statuses: [200] },
    rangeRequests: true,   // iOS Safari audio 스트리밍 필수
  },
},
```

---

## 방식 C — 런타임 MediaRecorder (Tone.js 오디오 캡처)

abcjs + Tone.js로 재생 중인 오디오를 MP3로 저장하는 방식.

### 필요 패키지

```bash
npm install lamejs    # MP3 인코더
```

### 구현

```typescript
// app/src/lib/audioCapture.ts
import lamejs from 'lamejs';

let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

// Tone.js의 AudioContext를 캡처해서 MediaStream으로 연결
export async function startCapture(
  audioCtx: AudioContext,
  destination: AudioNode,
): Promise<void> {
  const streamDest = audioCtx.createMediaStreamDestination();
  destination.connect(streamDest);

  chunks = [];
  mediaRecorder = new MediaRecorder(streamDest.stream, {
    mimeType: 'audio/webm;codecs=opus',  // 브라우저 기록 형식
  });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  mediaRecorder.start(100);  // 100ms 단위로 청크
}

export function stopCapture(): Promise<Blob> {
  return new Promise((resolve) => {
    if (!mediaRecorder) { resolve(new Blob()); return; }
    mediaRecorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'audio/webm' }));
      chunks = [];
    };
    mediaRecorder.stop();
    mediaRecorder = null;
  });
}

// webm Blob → 다운로드
export function downloadAudio(blob: Blob, filename = 'tune.webm'): void {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

> **참고**: 브라우저에서 WebM → MP3 변환은 `lamejs`로 가능하나 CPU 사용량이 높다.  
> 사용자에게 WebM 파일을 내려받게 하고 변환은 로컬 도구에 맡기는 것도 현실적인 선택.

---

## 방식별 용량 비교 (참고)

| 방식 | 텍스트 1000개 기준 | 서버 비용 |
|------|-----------------|----------|
| A. 빌드타임 Neural TTS (24kHz/48kbps) | ~약 5-15 MB | 없음 (정적 파일) |
| B. Web Speech | 0 MB | 없음 |
| C. MediaRecorder | 사용자 저장 (0 MB 서버) | 없음 |
