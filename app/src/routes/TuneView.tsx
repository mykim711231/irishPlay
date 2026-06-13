// Route: /tune/:id — 곡 플레이어 (lazy chunk)
// abcjs·tone이 이 파일을 통해서만 로드됨 → 초기 번들에서 제외

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';

import tunesData from '../data/tunes.json';
import setsData from '../data/sets.json';

import { TopBar } from '../components/TopBar';
import { ScoreView } from '../components/ScoreView';
import { PlayerControls } from '../components/PlayerControls';
import { ControlTray } from '../components/ControlTray';
import { SetPlayer } from '../components/SetPlayer';

import { usePlayback, type Tune } from '../hooks/usePlayback';
import { useViewMode } from '../hooks/useViewMode';
import { usePracticeMode } from '../hooks/usePracticeMode';

interface SetItem {
  id: string;
  name: string;
}

export default function TuneView(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const tune = useMemo(
    () => (tunesData as Tune[]).find(t => t.id === id) ?? null,
    [id]
  );

  // abcjs로 렌더된 visualObj를 state로 관리
  const [visualObj, setVisualObj] = useState<any>(null);
  const setVisualObjStable = useCallback((obj: any) => setVisualObj(obj), []);

  const { mode, toggleMode } = useViewMode();
  const playback = usePlayback(tune, visualObj);

  // 연습 모드
  const { mode: practiceMode, setMode: setPracticeMode, handleLoopComplete, resetMode } =
    usePracticeMode({
      defaultBpm: tune?.defaultBpm ?? 120,
      bpm:        playback.bpm,
      setBpm:     playback.setBpm,
      isLooping:  playback.isLooping,
      toggleLoop: playback.toggleLoop,
    });

  // 곡이 바뀌면 연습 모드 초기화
  useEffect(() => {
    resetMode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tune?.id]);

  // 루프 완료 감지 (playing → idle 전환, 루프 활성 상태)
  const prevPlayStateRef = useRef(playback.playState);
  useEffect(() => {
    if (
      prevPlayStateRef.current === 'playing' &&
      playback.playState === 'idle' &&
      playback.isLooping
    ) {
      handleLoopComplete();
    }
    prevPlayStateRef.current = playback.playState;
  }, [playback.playState, playback.isLooping, handleLoopComplete]);

  const setName = useMemo(() => {
    if (!tune) return undefined;
    return (setsData as SetItem[]).find(s => s.id === tune.setId)?.name;
  }, [tune]);

  if (!tune) {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* §9 TopBar */}
      <TopBar
        tune={tune}
        setName={setName}
        viewMode={mode}
        onToggleMode={toggleMode}
        onBack={() => {
          playback.stop();
          navigate('/');
        }}
      />

      {/* §10 ScoreView — flex-1로 남은 공간 최대 점유 */}
      <ScoreView tune={tune} onVisualObjReady={setVisualObjStable} />

      {/* 하단 컨트롤 영역 — flex-none으로 고정 높이 유지 */}
      <div className="controls-wrapper flex-none">
        {/* 세트 내 곡 이동 */}
        <SetPlayer setId={tune.setId} currentTuneId={tune.id} />

        {/* §9 PlayerControls */}
        <PlayerControls
          playback={playback}
          practiceMode={practiceMode}
          onPracticeModeChange={setPracticeMode}
        />

        {/* §9 ControlTray */}
        <ControlTray
          open={playback.trayOpen}
          instrumentId={playback.instrumentId}
          onInstrumentChange={playback.setInstrumentId}
          bodhranEnabled={playback.bodhranEnabled}
          spoonEnabled={playback.spoonEnabled}
          onBodhranToggle={playback.setBodhranEnabled}
          onSpoonToggle={playback.setSpoonEnabled}
        />

        {/* §11 저작권 푸터 */}
        <footer className="copyright-footer">
          Tunes sourced from thesession.org (CC BY). Foinn Seisiún &copy; Comhaltas
          Ceoltóirí Éireann.
        </footer>
      </div>
    </div>
  );
}
