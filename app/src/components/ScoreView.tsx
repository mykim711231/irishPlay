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

  // staffwidth를 반응형으로 설정 → PC/태블릿/스마트폰 최적화
  // PC(≥768px): 850px | 태블릿(500-767px): 600px | 스마트폰 가로(≥400px): 350px | 스마트폰 세로(<400px): 280px
  const renderScore = useCallback((containerWidth: number) => {
    if (!tune.abc) return;
    let staffwidth: number;
    if (containerWidth < 400) {
      // 스마트폰 세로 (<400px): 6~8마디 (컨트롤 패널과 악보 균형)
      staffwidth = Math.max(280, containerWidth - 20);
    } else if (containerWidth < 500) {
      // 스마트폰 가로 (400-499px): 8~10마디
      staffwidth = Math.max(350, containerWidth - 20);
    } else if (containerWidth < 768) {
      // 태블릿 (500-767px): 10~12마디
      staffwidth = 600;
    } else {
      // PC/데스크톱 (≥768px): 고정값 850px (좌우 스크롤)
      staffwidth = 850;
    }
    const visualObjs = abcjs.renderAbc(paperId, tune.abc, {
      add_classes: true,
      staffwidth,
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
