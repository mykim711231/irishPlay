// sf3-generated | usePlayback: abcjs + Tone.js 재생 상태 통합 훅

import { useState, useRef, useCallback, useEffect } from 'react';
import { melodyPlayer } from '../audio/melodyPlayer';
import {
  startPercussion,
  stopPercussion,
  setPercussionBpm,
  setPercussionEnabled as setPercEnabledAudio,
} from '../audio/percussion';

export type PlayState = 'idle' | 'loading' | 'playing' | 'paused';

export interface Tune {
  id: string;
  title: string;
  abc: string;
  rhythm: string;
  meter: string;
  key: string;
  defaultBpm: number;
  book: number;
  page: number;
  setId: string;
}

export interface PlaybackHandle {
  playState: PlayState;
  bpm: number;
  tuneDefaultBpm: number;
  isLooping: boolean;
  instrumentId: string;
  percussionEnabled: boolean;
  trayOpen: boolean;
  setBpm: (v: number) => void;
  toggleLoop: () => void;
  setInstrumentId: (id: string) => void;
  setPercussionEnabled: (v: boolean) => void;
  setTrayOpen: (v: boolean) => void;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
}

/** §10 CursorControl 패턴 */
function buildCursorControl(
  onEventCb: (ev: any) => void,
  onFinishedCb: () => void
) {
  return {
    beatSubdivisions: 2,
    onStart() {},
    onEvent(ev: any) {
      if (!ev || (ev.measureStart && ev.left === null)) return;
      const flat = ((ev.elements ?? []) as Element[][]).flat();
      // 이전 커서 제거
      document.querySelectorAll('.abcjs-note.cur').forEach(n =>
        n.classList.remove('cur')
      );
      // 현재 음표 하이라이트
      flat.forEach(el => {
        el?.classList?.add('cur');
      });
      onEventCb(ev);
    },
    onFinished() {
      document.querySelectorAll('.abcjs-note.cur').forEach(n =>
        n.classList.remove('cur')
      );
      onFinishedCb();
    },
  };
}

/** 현재 재생 줄 하이라이트 + 자동 스크롤 + focus 모드 cur-line 마킹 */
function markCurrentLine(ev: any): void {
  document.querySelectorAll('.system-hl').forEach(el =>
    el.classList.remove('system-hl')
  );
  document.querySelectorAll('.abcjs-staff-wrapper.cur-line').forEach(el =>
    el.classList.remove('cur-line')
  );

  const lineIdx: number = ev?.line ?? 0;
  // abcjs 실제 DOM 클래스: .abcjs-staff-wrapper (not .abcjs-staff)
  const staves = document.querySelectorAll('.abcjs-staff-wrapper');
  const staff = staves[lineIdx];
  if (staff) {
    staff.classList.add('system-hl');
    staff.classList.add('cur-line');
    staff.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

export function usePlayback(tune: Tune | null, visualObj: any): PlaybackHandle {
  const [playState, setPlayState] = useState<PlayState>('idle');
  const [bpm, setBpmState] = useState(tune?.defaultBpm ?? 120);
  const [isLooping, setIsLooping] = useState(false);
  const [instrumentId, setInstrumentIdState] = useState('fiddle');
  const [percEnabled, setPercEnabledState] = useState(false);
  const [trayOpen, setTrayOpen] = useState(false);

  // 콜백에서 쓸 ref들 (stale closure 방지)
  const loopRef = useRef(false);
  const bpmRef = useRef(bpm);
  const instrRef = useRef(instrumentId);
  const percRef = useRef(false);
  const tuneRef = useRef(tune);
  const visualObjRef = useRef(visualObj);
  const playStateRef = useRef<PlayState>('idle');

  useEffect(() => { loopRef.current = isLooping; },       [isLooping]);
  useEffect(() => { bpmRef.current = bpm; },              [bpm]);
  useEffect(() => { instrRef.current = instrumentId; },   [instrumentId]);
  useEffect(() => { percRef.current = percEnabled; },     [percEnabled]);
  useEffect(() => { tuneRef.current = tune; },            [tune]);
  useEffect(() => { visualObjRef.current = visualObj; },  [visualObj]);
  useEffect(() => { playStateRef.current = playState; },  [playState]);

  // 곡이 바뀌면 정지 + BPM 초기화
  useEffect(() => {
    melodyPlayer.stop();
    stopPercussion();
    setPlayState('idle');
    if (tune) setBpmState(tune.defaultBpm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tune?.id]);

  // percEnabled 변경 → 오디오 모듈에 반영
  useEffect(() => {
    setPercEnabledAudio(percEnabled);
  }, [percEnabled]);

  // ── 내부 재생 시작 (ref 값 사용 → stale closure 없음) ──
  const triggerPlay = useCallback(async () => {
    const t = tuneRef.current;
    const vobj = visualObjRef.current;
    if (!t || !vobj) return;

    setPlayState('loading');

    const cursorControl = buildCursorControl(
      ev => markCurrentLine(ev),
      () => {
        melodyPlayer.stop();
        stopPercussion();
        setPlayState('idle');
        if (loopRef.current) {
          setTimeout(() => { void triggerPlay(); }, 300);
        }
      }
    );

    try {
      // §15 항목 2: init → prime → start 순서 준수
      await melodyPlayer.load(vobj, {
        abc: t.abc,
        instrumentId: instrRef.current,
        bpm: bpmRef.current,
        meter: t.meter,
        onEvent: cursorControl.onEvent,
        onFinished: cursorControl.onFinished,
      });

      melodyPlayer.play();
      setPlayState('playing');

      // §15 항목 4: BPM 슬라이더 변경 시 퍼커션·멜로디 둘 다 갱신
      setPercussionBpm(bpmRef.current);
      if (percRef.current) {
        await startPercussion(t.rhythm, bpmRef.current);
      }
    } catch (err) {
      console.error('[usePlayback] play error:', err);
      setPlayState('idle');
    }
  // triggerPlay는 자기 참조(loop 재시작)가 있어 deps 비워둠 — 모두 ref로 접근
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = useCallback(async () => {
    const cur = playStateRef.current;
    if (cur === 'paused') {
      melodyPlayer.resume();
      const t = tuneRef.current;
      if (percRef.current && t) {
        await startPercussion(t.rhythm, bpmRef.current);
      }
      setPlayState('playing');
    } else if (cur === 'idle') {
      await triggerPlay();
    }
  }, [triggerPlay]);

  const pause = useCallback(() => {
    if (playStateRef.current !== 'playing') return;
    melodyPlayer.pause();
    stopPercussion();
    setPlayState('paused');
  }, []);

  const stop = useCallback(() => {
    melodyPlayer.stop();
    stopPercussion();
    document.querySelectorAll('.abcjs-note.cur').forEach(n =>
      n.classList.remove('cur')
    );
    document.querySelectorAll('.system-hl').forEach(el =>
      el.classList.remove('system-hl')
    );
    setPlayState('idle');
  }, []);

  // §15 항목 4: BPM 변경 → 퍼커션 즉시 반영, 재생 중이면 재시작
  const setBpm = useCallback((v: number) => {
    setBpmState(v);
    setPercussionBpm(v);
    if (playStateRef.current === 'playing') {
      melodyPlayer.stop();
      stopPercussion();
      setPlayState('idle');
      setTimeout(() => { void triggerPlay(); }, 100);
    }
  }, [triggerPlay]);

  const toggleLoop = useCallback(() => setIsLooping(l => !l), []);

  const setInstrumentId = useCallback((id: string) => {
    setInstrumentIdState(id);
    instrRef.current = id;
    if (playStateRef.current === 'playing') {
      melodyPlayer.stop();
      stopPercussion();
      setPlayState('idle');
      setTimeout(() => { void triggerPlay(); }, 100);
    }
  }, [triggerPlay]);

  const handleSetPercussion = useCallback((v: boolean) => {
    setPercEnabledState(v);
    setPercEnabledAudio(v);
    if (!v) {
      stopPercussion();
    } else if (playStateRef.current === 'playing' && tuneRef.current) {
      // 재생 중 퍼커션 활성화 → 즉시 시작
      void startPercussion(tuneRef.current.rhythm, bpmRef.current);
    }
  }, []);

  return {
    playState,
    bpm,
    tuneDefaultBpm: tune?.defaultBpm ?? bpm,
    isLooping,
    instrumentId,
    percussionEnabled: percEnabled,
    trayOpen,
    setBpm,
    toggleLoop,
    setInstrumentId,
    setPercussionEnabled: handleSetPercussion,
    setTrayOpen,
    play,
    pause,
    stop,
  };
}
