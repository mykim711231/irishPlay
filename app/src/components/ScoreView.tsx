// sf3-generated | ScoreView: abcjs 악보 렌더링 컴포넌트

import React, { useEffect, useRef, useId } from 'react';
import abcjs from 'abcjs';
import type { Tune } from '../hooks/usePlayback';

interface ScoreViewProps {
  tune: Tune;
  onVisualObjReady: (visualObj: any) => void;
}

export const ScoreView: React.FC<ScoreViewProps> = ({
  tune,
  onVisualObjReady,
}) => {
  const uid = useId();
  const paperId = `abc-paper-${uid.replace(/:/g, '')}`;
  const prevTuneId = useRef<string | null>(null);

  useEffect(() => {
    if (!tune.abc) return;
    // ABC가 바뀌었을 때만 재렌더
    if (prevTuneId.current === tune.id) return;
    prevTuneId.current = tune.id;

    // §10: renderAbc로 악보 렌더 + visualObj 반환
    const visualObjs = abcjs.renderAbc(paperId, tune.abc, {
      add_classes: true,
      // responsive:'resize' 제거 — abcjs가 SVG를 재렌더링하면 visualObj DOM 참조가
      // stale 되어 TimingCallbacks.onEvent의 ev.elements가 detached element를 가리킴
    } as any);

    if (visualObjs && visualObjs[0]) {
      onVisualObjReady(visualObjs[0]);
    }
  }, [tune.id, tune.abc, paperId, onVisualObjReady]);

  return (
    <section
      className="flex-1 overflow-y-auto px-3 py-3"
      style={{ background: 'var(--bg)' }}
    >
      <div
        id={paperId}
        className="abc-paper p-3 shadow-sm"
        style={{ minHeight: 200 }}
      />
    </section>
  );
};
