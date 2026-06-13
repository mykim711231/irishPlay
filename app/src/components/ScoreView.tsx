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

  // staffwidth를 반응형으로 설정 → 모바일/데스크톱 모두 최적화
  // 모바일: 화면 너비의 90% / 데스크톱: 850px (좌우 스크롤)
  const renderScore = useCallback((containerWidth: number) => {
    if (!tune.abc) return;
    let staffwidth: number;
    if (containerWidth < 500) {
      // 모바일 (스마트폰): 화면 너비에 맞춤 + 여유 20px
      staffwidth = Math.max(280, containerWidth - 20);
    } else {
      // 태블릿/데스크톱: 고정값 (스크롤 가능)
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
