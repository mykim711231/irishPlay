// sf3-generated | PlayerControls: 재생 컨트롤 바 (▶/⏸, ■, 루프, BPM, 트레이 토글, 연습 모드)

import React from 'react';
import { Play, Pause, Square, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import type { PlaybackHandle } from '../hooks/usePlayback';
import type { PracticeMode } from '../hooks/usePracticeMode';
import { PRACTICE_LABELS } from '../hooks/usePracticeMode';

interface PlayerControlsProps {
  playback: PlaybackHandle;
  practiceMode: PracticeMode;
  onPracticeModeChange: (mode: PracticeMode) => void;
}

// §9 빠른속도 칩: 50% / 기본 / 세션×1.15
const BPM_PRESETS: Array<{ label: string; factor: number }> = [
  { label: '50%',       factor: 0.5  },
  { label: '기본',      factor: 1.0  },
  { label: '세션×1.15', factor: 1.15 },
];

const PRACTICE_MODES: PracticeMode[] = ['normal', 'slow', 'gradual'];

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  playback,
  practiceMode,
  onPracticeModeChange,
}) => {
  const {
    playState, bpm, tuneDefaultBpm, isLooping, trayOpen,
    setBpm, toggleLoop, setTrayOpen, play, pause, stop,
  } = playback;

  const isPlaying = playState === 'playing';
  const isLoading = playState === 'loading';

  function handlePlayPause() {
    if (isPlaying) pause();
    else void play();
  }

  const sliderPct = ((bpm - 40) / 160) * 100;

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 flex-shrink-0"
      style={{ background: 'var(--paper)', borderTop: '1px solid var(--line)' }}
    >
      {/* 상단: 버튼 행 + BPM 슬라이더 */}
      <div className="flex items-center gap-3">

        {/* ■ 정지 — §9: 42px 원형 border */}
        <button
          onClick={stop}
          aria-label="정지"
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-colors active:scale-95"
          style={{
            width: 42, height: 42,
            border: '2px solid var(--line)',
            color: 'var(--ink)',
          }}
        >
          <Square size={16} fill="currentColor" />
        </button>

        {/* ▶/⏸ 재생/일시정지 — §9: 54px 원형 teal */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          aria-label={isPlaying ? '일시정지' : '재생'}
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-95"
          style={{
            width: 54, height: 54,
            background: isLoading ? 'var(--dim)' : 'var(--teal)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(31,111,107,.4)',
          }}
        >
          {isPlaying
            ? <Pause size={22} fill="white" />
            : <Play size={22} fill="white" style={{ marginLeft: 2 }} />
          }
        </button>

        {/* ↩ 루프 — §9: 42px 원형 border */}
        <button
          onClick={toggleLoop}
          aria-label={isLooping ? '루프 끄기' : '루프 켜기'}
          aria-pressed={isLooping}
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-colors active:scale-95"
          style={{
            width: 42, height: 42,
            border: isLooping ? '2px solid var(--teal)' : '2px solid var(--line)',
            color: isLooping ? 'var(--teal)' : 'var(--ink)',
            background: isLooping ? 'rgba(31,111,107,.08)' : 'transparent',
          }}
        >
          <RotateCcw size={16} />
        </button>

        {/* BPM 슬라이더 (40~200) */}
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
          <div className="flex justify-between items-center">
            <span className="text-xs" style={{ color: 'var(--dim)' }}>BPM</span>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ color: 'var(--ink)' }}
            >
              {bpm}
            </span>
          </div>
          <input
            type="range"
            min={40}
            max={200}
            value={bpm}
            onChange={e => setBpm(Number(e.target.value))}
            aria-label="템포 조절"
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
              accentColor: 'var(--teal)',
              background: `linear-gradient(to right, var(--teal) ${sliderPct}%, var(--line) ${sliderPct}%)`,
            }}
          />
        </div>

        {/* 🎻 트레이 토글 */}
        <button
          onClick={() => setTrayOpen(!trayOpen)}
          aria-label={trayOpen ? '설정 접기' : '설정 펼치기'}
          aria-expanded={trayOpen}
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-colors active:scale-95"
          style={{
            width: 42, height: 42,
            border: trayOpen ? '2px solid var(--teal)' : '2px solid var(--line)',
            color: trayOpen ? 'var(--teal)' : 'var(--dim)',
          }}
        >
          {trayOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* §9 빠른속도 칩: 50% / 기본 / 세션×1.15 */}
      <div className="flex gap-2 justify-center">
        {BPM_PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => {
              const next = Math.round(tuneDefaultBpm * p.factor);
              setBpm(Math.max(40, Math.min(200, next)));
            }}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* 연습 모드 선택 */}
      <div className="flex items-center gap-1.5">
        <span
          className="text-xs flex-shrink-0"
          style={{ color: 'var(--dim)', width: 28 }}
        >
          연습
        </span>
        {PRACTICE_MODES.map(m => {
          const active = practiceMode === m;
          return (
            <button
              key={m}
              onClick={() => onPracticeModeChange(m)}
              aria-pressed={active}
              className="flex-1 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                background: active ? 'var(--teal)' : 'var(--bg)',
                color:      active ? '#fff' : 'var(--ink)',
                border:     `1px solid ${active ? 'var(--teal)' : 'var(--line)'}`,
              }}
            >
              {PRACTICE_LABELS[m]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
