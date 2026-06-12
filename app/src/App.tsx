// sf3-generated | App: 라우팅 (§13)

import { useState, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';

import tunesData from './data/tunes.json';
import setsData from './data/sets.json';

import { TopBar } from './components/TopBar';
import { ScoreView } from './components/ScoreView';
import { PlayerControls } from './components/PlayerControls';
import { ControlTray } from './components/ControlTray';
import { SetPlayer } from './components/SetPlayer';
import { TuneList } from './components/TuneList';

import { usePlayback, type Tune } from './hooks/usePlayback';
import { useViewMode } from './hooks/useViewMode';

interface SetItem {
  id: string;
  name: string;
}

// ── 곡 플레이어 페이지 ──
function TuneView(): JSX.Element {
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

      {/* §10 ScoreView */}
      <ScoreView tune={tune} onVisualObjReady={setVisualObjStable} />

      {/* 세트 내 곡 이동 */}
      <SetPlayer setId={tune.setId} currentTuneId={tune.id} />

      {/* §9 PlayerControls */}
      <PlayerControls playback={playback} />

      {/* §9 ControlTray */}
      <ControlTray
        open={playback.trayOpen}
        instrumentId={playback.instrumentId}
        onInstrumentChange={playback.setInstrumentId}
        percussionEnabled={playback.percussionEnabled}
        onPercussionToggle={playback.setPercussionEnabled}
      />

      {/* §11 저작권 푸터 */}
      <footer className="copyright-footer">
        Tunes sourced from thesession.org (CC BY). Foinn Seisiún &copy; Comhaltas
        Ceoltóirí Éireann.
      </footer>
    </div>
  );
}

// ── 라우터 루트 ──
export default function App(): JSX.Element {
  return (
    <Routes>
      {/* §13 / → TuneList */}
      <Route path="/" element={<TuneList />} />

      {/* §13 /tune/:id → 곡 플레이어 */}
      <Route path="/tune/:id" element={<TuneView />} />

      {/* §13 * → / 리디렉트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
