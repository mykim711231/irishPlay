// usePracticeMode: 연습 모드 상태 관리 (일반 / 느린 재생 / 점진적 빠르기)

import { useState, useCallback, useRef, useEffect } from 'react';

export type PracticeMode = 'normal' | 'slow' | 'gradual';

export const PRACTICE_LABELS: Record<PracticeMode, string> = {
  normal:  '일반',
  slow:    '느린 재생',
  gradual: '점진적',
};

interface UsePracticeModeOptions {
  defaultBpm: number;
  bpm: number;
  setBpm: (v: number) => void;
  isLooping: boolean;
  toggleLoop: () => void;
}

export function usePracticeMode({
  defaultBpm,
  bpm,
  setBpm,
  isLooping,
  toggleLoop,
}: UsePracticeModeOptions) {
  const [mode, setModeState] = useState<PracticeMode>('normal');

  // stale closure 방지용 ref
  const bpmRef        = useRef(bpm);
  const defaultBpmRef = useRef(defaultBpm);
  const modeRef       = useRef<PracticeMode>('normal');
  const isLoopingRef  = useRef(isLooping);

  useEffect(() => { bpmRef.current        = bpm;        }, [bpm]);
  useEffect(() => { defaultBpmRef.current = defaultBpm; }, [defaultBpm]);
  useEffect(() => { modeRef.current       = mode;       }, [mode]);
  useEffect(() => { isLoopingRef.current  = isLooping;  }, [isLooping]);

  /** 모드 전환 */
  const setMode = useCallback((m: PracticeMode) => {
    setModeState(m);
    const defBpm = defaultBpmRef.current;

    if (m === 'normal') {
      setBpm(defBpm);
    } else if (m === 'slow') {
      setBpm(Math.max(40, Math.round(defBpm / 2)));
    } else if (m === 'gradual') {
      // 60% BPM에서 시작, 루프 자동 활성화
      setBpm(Math.max(40, Math.round(defBpm * 0.6)));
      if (!isLoopingRef.current) toggleLoop();
    }
  }, [setBpm, toggleLoop]);

  /**
   * TuneView에서 루프 1회 완료 시 호출.
   * gradual 모드인 경우 BPM을 10% 씩 증가 (최대 defaultBpm)
   */
  const handleLoopComplete = useCallback(() => {
    if (modeRef.current !== 'gradual') return;
    const current = bpmRef.current;
    const target  = defaultBpmRef.current;
    if (current >= target) return;
    const next = Math.min(Math.round(current * 1.1), target);
    setBpm(next);
  }, [setBpm]);

  /** 곡이 바뀌면 모드 초기화 */
  const resetMode = useCallback(() => {
    setModeState('normal');
  }, []);

  return { mode, setMode, handleLoopComplete, resetMode };
}
