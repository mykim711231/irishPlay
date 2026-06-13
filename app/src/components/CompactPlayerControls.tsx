// CompactPlayerControls: 스마트폰 우측 패널용 간단한 재생 컨트롤

import React from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import type { PlaybackHandle } from '../hooks/usePlayback';
import { InstrumentPicker } from './InstrumentPicker';
import { PercussionToggle } from './PercussionToggle';
import { testPercussion, testSpoon } from '../audio/soundTest';

interface CompactPlayerControlsProps {
  playback: PlaybackHandle;
}

export const CompactPlayerControls: React.FC<CompactPlayerControlsProps> = ({
  playback,
}) => {
  const {
    playState, bpm, isLooping,
    setBpm, toggleLoop, play, pause, stop,
    instrumentId, setInstrumentId,
    bodhranEnabled, spoonEnabled,
    setBodhranEnabled, setSpoonEnabled,
  } = playback;

  const isPlaying = playState === 'playing';
  const isLoading = playState === 'loading';

  function handlePlayPause() {
    if (isPlaying) pause();
    else void play();
  }

  const handleBodhranToggle = (v: boolean) => {
    void testPercussion(v);
    setBodhranEnabled(v);
  };

  const handleSpoonToggle = (v: boolean) => {
    void testSpoon(v);
    setSpoonEnabled(v);
  };

  const sliderPct = ((bpm - 40) / 160) * 100;

  return (
    <div
      className="flex flex-col gap-3 px-3 py-4 h-full overflow-y-auto"
      style={{ background: 'var(--paper)', minWidth: '280px' }}
    >
      {/* 재생 컨트롤 버튼 행 */}
      <div className="flex items-center gap-2 justify-center">
        {/* ■ 정지 */}
        <button
          onClick={stop}
          aria-label="정지"
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-colors active:scale-95"
          style={{
            width: 44, height: 44,
            border: '2px solid var(--line)',
            color: 'var(--ink)',
          }}
        >
          <Square size={18} fill="currentColor" />
        </button>

        {/* ▶/⏸ 재생/일시정지 */}
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          aria-label={isPlaying ? '일시정지' : '재생'}
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-all active:scale-95"
          style={{
            width: 56, height: 56,
            background: isLoading ? 'var(--dim)' : 'var(--teal)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(31,111,107,.4)',
          }}
        >
          {isPlaying
            ? <Pause size={24} fill="white" />
            : <Play size={24} fill="white" style={{ marginLeft: 2 }} />
          }
        </button>

        {/* ↩ 루프 */}
        <button
          onClick={toggleLoop}
          aria-label={isLooping ? '루프 끄기' : '루프 켜기'}
          aria-pressed={isLooping}
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-colors active:scale-95"
          style={{
            width: 44, height: 44,
            border: isLooping ? '2px solid var(--teal)' : '2px solid var(--line)',
            color: isLooping ? 'var(--teal)' : 'var(--ink)',
            background: isLooping ? 'rgba(31,111,107,.08)' : 'transparent',
          }}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* BPM 슬라이더 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
            BPM
          </span>
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: 'var(--teal)' }}
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
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            accentColor: 'var(--teal)',
            background: `linear-gradient(to right, var(--teal) ${sliderPct}%, var(--line) ${sliderPct}%)`,
          }}
        />
      </div>

      {/* 악기 선택 */}
      <InstrumentPicker
        value={instrumentId}
        onChange={setInstrumentId}
      />

      {/* 퍼커션 토글 */}
      <div className="flex flex-col gap-2">
        <PercussionToggle
          label="🥁 바우런"
          enabled={bodhranEnabled}
          onToggle={handleBodhranToggle}
        />
        <PercussionToggle
          label="🥄 스푼"
          enabled={spoonEnabled}
          onToggle={handleSpoonToggle}
        />
      </div>
    </div>
  );
};
