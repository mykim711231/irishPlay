# 04. 기기 TTS 활용

> 레퍼런스: `D:\_Git\SMCB\app\src\lib\tts.ts`, `components/TTSButton.tsx`

---

## 전략 선택

| 레벨 | 방식 | 음질 | 오프라인 | 구현 난이도 |
|------|------|------|----------|------------|
| A | Web Speech API (기기 TTS) | 기기 음성팩 의존 | ❌ | 낮음 |
| B | 사전녹음 MP3 우선 + Web Speech fallback | Neural TTS 수준 | ✅ | 높음 |

아일랜드 전통음악 앱의 경우 **영어 텍스트 낭독(레벨 A)** 이면 충분하다.  
언어별로 기기 TTS 음성팩이 없는 경우(예: 아일랜드어 `ga-IE`)는 레벨 B 필요.

---

## 언어별 Web Speech 지원 현황

| 언어 | lang 코드 | 지원 기기 |
|------|-----------|----------|
| 한국어 | `ko-KR` | Android/iOS/Windows/macOS 기본 탑재 |
| 영어 | `en-US` / `en-GB` | 모든 기기 기본 탑재 |
| 아일랜드어 | `ga-IE` | 대부분 미탑재 — 사전녹음 필요 |
| 중국어 | `zh-CN` | Android/iOS 기본, Windows는 팩 설치 필요 |

---

## 레벨 A — Web Speech API (단순 구현)

### lib/tts.ts

```typescript
// app/src/lib/tts.ts
export type TTSStatus = 'idle' | 'speaking' | 'unsupported';

let currentUtterance: SpeechSynthesisUtterance | null = null;
let speakEpoch = 0;  // stop() 후 비동기 콜백을 무시하기 위한 epoch

export function isTTSSupported(): boolean {
  return 'speechSynthesis' in window;
}

// ── 음성 선택 ────────────────────────────────────────────────
// 동기 getVoices()가 비어있을 수 있으므로 voiceschanged 이벤트도 대기한다.
function getVoice(lang: string): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    const pick = (): SpeechSynthesisVoice | null =>
      window.speechSynthesis.getVoices().find(
        (v) => v.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0])
      ) ?? null;

    const voice = pick();
    if (voice) { resolve(voice); return; }

    // Chrome/Edge는 voiceschanged 이후에 getVoices()가 채워진다
    const handler = (): void => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(pick());
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // 500ms 안에 이벤트가 안 오면 null로 resolve (기기 음성팩 없음)
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(pick());
    }, 500);
  });
}

// ── speak ────────────────────────────────────────────────────
export async function speak(
  text: string,
  lang = 'en-US',
  opts?: { rate?: number; onEnd?: () => void; onError?: () => void }
): Promise<void> {
  stop();
  if (!isTTSSupported()) { opts?.onError?.(); return; }

  const epoch = ++speakEpoch;
  const voice = await getVoice(lang);
  if (epoch !== speakEpoch) return;  // stop()이 호출됨

  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = opts?.rate ?? 1.0;
  if (voice) u.voice = voice;

  u.onend  = () => { if (epoch === speakEpoch) opts?.onEnd?.(); };
  u.onerror = () => { if (epoch === speakEpoch) opts?.onError?.(); };

  // iOS PWA 워치독: 4초 내 음성이 시작되지 않으면 오류 처리
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  u.onstart = () => { if (watchdog) { clearTimeout(watchdog); watchdog = null; } };
  watchdog = setTimeout(() => { stop(); opts?.onError?.(); }, 4000);

  currentUtterance = u;
  window.speechSynthesis.speak(u);
}

// ── stop ────────────────────────────────────────────────────
export function stop(): void {
  speakEpoch++;
  if (typeof window !== 'undefined') window.speechSynthesis.cancel();
  currentUtterance = null;
}

// ── iOS AudioContext 언락 ────────────────────────────────────
// iOS에서 최초 speak()는 반드시 사용자 제스처(click) 내부에서 호출해야 한다.
// 이후에는 언락된 상태가 유지된다.
let unlocked = false;

export function unlockTTS(): void {
  if (unlocked || !('speechSynthesis' in window)) return;
  // 빈 utterance로 AudioContext 언락
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  window.speechSynthesis.speak(u);
  unlocked = true;
}
```

---

### hooks/useTTS.ts

```typescript
// app/src/hooks/useTTS.ts
import { useState, useCallback, useEffect } from 'react';
import { speak, stop, unlockTTS, isTTSSupported } from '@/lib/tts';

export function useTTS(lang = 'en-US') {
  const [status, setStatus] = useState<'idle' | 'speaking' | 'error'>('idle');
  const supported = isTTSSupported();

  const handleSpeak = useCallback((text: string) => {
    unlockTTS();  // iOS 첫 번째 호출 언락
    setStatus('speaking');
    void speak(text, lang, {
      onEnd:   () => setStatus('idle'),
      onError: () => setStatus('error'),
    });
  }, [lang]);

  const handleStop = useCallback(() => {
    stop();
    setStatus('idle');
  }, []);

  // 컴포넌트 언마운트 시 자동 정지
  useEffect(() => () => { stop(); }, []);

  return { status, supported, speak: handleSpeak, stop: handleStop };
}
```

---

### components/TTSButton.tsx

```tsx
// app/src/components/TTSButton.tsx
import { Volume2, VolumeX, VolumeOff } from 'lucide-react';
import { useTTS } from '@/hooks/useTTS';

type TTSButtonProps = {
  text: string;
  lang?: string;
  size?: number;
  className?: string;
};

export function TTSButton({
  text,
  lang = 'en-US',
  size = 18,
  className = '',
}: TTSButtonProps): JSX.Element | null {
  const { status, supported, speak, stop } = useTTS(lang);

  if (!supported) return null;  // TTS 미지원 기기에서는 버튼 숨김

  const speaking = status === 'speaking';
  const error    = status === 'error';

  return (
    <button
      type="button"
      onClick={() => speaking ? stop() : speak(text)}
      aria-label={speaking ? '읽기 중지' : '소리로 듣기'}
      title={error ? 'TTS 오류 — 다시 시도' : undefined}
      className={`
        inline-flex items-center justify-center rounded-full
        w-10 h-10 transition active:scale-95
        ${error
          ? 'bg-accent/10 text-accent'
          : speaking
            ? 'bg-primary/20 text-primary'
            : 'bg-primary/10 text-primary hover:bg-primary/20'}
        ${className}
      `}
    >
      {error    ? <VolumeOff size={size} aria-hidden /> :
       speaking ? <VolumeX   size={size} aria-hidden /> :
                  <Volume2   size={size} aria-hidden />}
    </button>
  );
}
```

---

### 사용 예

```tsx
// 카드 컴포넌트에서 제목 읽기
import { TTSButton } from '@/components/TTSButton';

function TuneCard({ tune }: { tune: Tune }) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex-1">
        <h3>{tune.title}</h3>
        <p className="text-sm text-muted">{tune.type}</p>
      </div>
      {/* 곡 제목을 영어로 읽어준다 */}
      <TTSButton text={tune.title} lang="en-US" />
    </div>
  );
}
```

---

## 레벨 B — 사전녹음 MP3 우선 (SMCB 완전 구현)

파일이 많고 언어별 음성팩이 없는 경우 사용한다.  
`D:\_Git\SMCB\app\src\lib\tts.ts` 를 복사해서 아래 부분만 프로젝트에 맞게 수정:

| 수정 위치 | SMCB 값 | 변경 |
|---|---|---|
| `ZH_LANGS` | `['zh-CN', ...]` | 사용 언어로 변경 |
| `TTS_BASE_URL` | `${BASE_URL}tts/` | 동일 사용 가능 |
| manifest import | `zh-tts-manifest.json` | 프로젝트 manifest 파일명으로 변경 |

---

## iOS 주의사항 요약

```
❶ speak()는 반드시 click/tap 이벤트 핸들러 내부에서 호출
❷ 200자 이상 텍스트는 중간에 끊길 수 있음 → 문단 단위로 분할
❸ PWA 설치 후(standalone) 첫 실행에서 voiceschanged가 발화 안 될 수 있음
   → unlockTTS()로 AudioContext 선제 언락
❹ iOS 17.4 미만: Web Speech가 PWA에서 완전히 작동 안 함 → 사전녹음 필수
```
