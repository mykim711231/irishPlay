// Route: /tune/:id — 곡 플레이어 (lazy chunk)
// abcjs·tone이 이 파일을 통해서만 로드됨 → 초기 번들에서 제외

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';

import tunesData from '../data/tunes.json';
import setsData from '../data/sets.json';

import { TopBar } from '../components/TopBar';
import { ScoreView } from '../components/ScoreView';
import { PlayerControls } from '../components/PlayerControls';
import { CompactPlayerControls } from '../components/CompactPlayerControls';
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

  // 메뉴 숨김 상태 (localStorage에 저장, 악보 탭으로 토글)
  const [menuVisible, setMenuVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('irishPlay_menuVisible');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // 컨트롤 펼침/접힘 상태 (localStorage에 저장, 기본 펼침)
  const [controlsExpanded, setControlsExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('irishPlay_controlsExpanded');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const toggleControls = useCallback(() => {
    setControlsExpanded(v => {
      const newVal = !v;
      try {
        localStorage.setItem('irishPlay_controlsExpanded', String(newVal));
      } catch (e) {
        console.error('Failed to save controls state:', e);
      }
      return newVal;
    });
  }, []);

  // 악보 클릭 → 컨트롤 토글 (숨기면 악보+연주 진행 표시만 남아 연주에 몰입)
  // 커서 하이라이트(.cur)는 menuVisible과 무관하게 악보에 계속 표시됨
  const handleScoreClick = useCallback(() => {
    setMenuVisible(v => {
      const newVal = !v;
      try {
        localStorage.setItem('irishPlay_menuVisible', String(newVal));
      } catch (e) {
        console.error('Failed to save menu state:', e);
      }
      return newVal;
    });
  }, []);

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
      className="tune-view flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* §9 TopBar — 메뉴 숨김 시 숨김 */}
      {menuVisible && (
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
      )}

      {/* §10 메인 콘텐츠 영역 — 세로:상하 / 가로:좌우 (CSS 미디어쿼리로 제어) */}
      <div className="tune-content flex flex-1 min-h-0 overflow-hidden">
        {/* 악보 (모든 해상도) */}
        <ScoreView tune={tune} onVisualObjReady={setVisualObjStable} onScoreClick={handleScoreClick} />

        {/* 모바일/태블릿 컨트롤 — 세로:하단 / 가로:우측 (CSS로 표시 제어) */}
        {menuVisible && (
          <div className="mobile-controls flex flex-col">
            <CompactPlayerControls playback={playback} />
          </div>
        )}
      </div>

      {/* PC 전용 하단 컨트롤 영역 (≥1024px, CSS로 표시 제어) */}
      {menuVisible && (
        <div className="controls-wrapper flex-none flex flex-col">
          {/* 펼침/접힘 토글 버튼 */}
          <button
            onClick={toggleControls}
            className="controls-toggle px-4 py-2 flex items-center justify-center text-sm font-medium transition-colors"
            style={{
              background: 'var(--paper)',
              borderTop: '1px solid var(--line)',
              borderBottom: controlsExpanded ? '1px solid var(--line)' : 'none',
              color: 'var(--dim)',
              cursor: 'pointer',
            }}
            aria-expanded={controlsExpanded}
            aria-label={controlsExpanded ? '컨트롤 접기' : '컨트롤 펼치기'}
          >
            {controlsExpanded ? '▼' : '▲'} 컨트롤
          </button>

          {/* 펼침 시에만 표시 */}
          {controlsExpanded && (
            <>
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
            </>
          )}

          {/* §11 저작권 푸터 (PC 전용) */}
          <footer className="copyright-footer">
            튠 데이터: thesession.org (ODbL) · Foinn Seisiún &copy; Comhaltas Ceoltóirí Éireann
          </footer>
        </div>
      )}
    </div>
  );
}
