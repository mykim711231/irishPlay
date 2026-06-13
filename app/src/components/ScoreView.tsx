// sf3-generated | ScoreView: abcjs 악보 렌더링 컴포넌트

import React, { useEffect, useRef, useId, useCallback } from 'react';
import abcjs from 'abcjs';
import type { Tune } from '../hooks/usePlayback';

interface ScoreViewProps {
  tune: Tune;
  onVisualObjReady: (visualObj: any) => void;
  onScoreClick?: () => void;
}

export const ScoreView: React.FC<ScoreViewProps> = ({
  tune,
  onVisualObjReady,
  onScoreClick,
}) => {
  const uid = useId();
  const paperId = `abc-paper-${uid.replace(/:/g, '')}`;
  const sectionRef = useRef<HTMLElement>(null);

  // staffwidth + wrap 옵션으로 줄당 마디 수를 강제 → 악보 전체가 여러 줄로 표시
  // abcjs는 staffwidth만으로 자동 줄바꿈하지 않으므로 wrap.preferredMeasuresPerLine 필수
  const renderScore = useCallback((containerWidth: number) => {
    if (!tune.abc) return;
    const PADDING = 16;
    let staffwidth: number;
    let measuresPerLine: number;
    if (containerWidth < 768) {
      // 모바일/태블릿: 컨테이너 폭에 맞춰 줄당 마디 수 결정 (세로 스크롤로 전체 악보)
      staffwidth = Math.max(280, containerWidth - PADDING);
      measuresPerLine = containerWidth < 420 ? 4 : 6;
    } else {
      // PC/데스크톱 (≥768px): 고정값 850px, 줄당 8마디
      staffwidth = 850;
      measuresPerLine = 8;
    }
    const visualObjs = abcjs.renderAbc(paperId, tune.abc, {
      add_classes: true,
      staffwidth,
      wrap: {
        minSpacing: 1.5,
        maxSpacing: 2.5,
        preferredMeasuresPerLine: measuresPerLine,
      },
    } as any);
    if (visualObjs && visualObjs[0]) {
      onVisualObjReady(visualObjs[0]);
    }
  }, [tune.abc, paperId, onVisualObjReady]);

  // ResizeObserver: 컨테이너 크기 변경(화면 회전 포함)마다 악보 재렌더
  // renderScore가 tune 변경 시 새로운 참조가 되므로 곡 교체도 자동 처리됨
  useEffect(() => {
    if (!tune.abc) return;
    const el = sectionRef.current;
    if (!el) return;

    const ro = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width ?? 0;
      if (width > 0) renderScore(width);
    });
    ro.observe(el); // observe 즉시 한 번 발화 → 초기 렌더
    return () => ro.disconnect();
  }, [renderScore, tune.abc]);

  return (
    <section
      ref={sectionRef}
      className="score-section flex-1 overflow-auto px-2 py-3 sm:px-3 cursor-pointer"
      style={{
        background: 'var(--bg)',
        minHeight: 0,
        WebkitOverflowScrolling: 'touch', // iOS 부드러운 스크롤
      }}
      onClick={onScoreClick}
    >
      <div
        id={paperId}
        className="abc-paper p-2 sm:p-3 shadow-sm mx-auto"
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      />
    </section>
  );
};
