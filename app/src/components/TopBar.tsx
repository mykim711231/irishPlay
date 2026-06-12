// sf3-generated | TopBar: 상단 네비게이션 바 컴포넌트

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { ViewMode } from '../hooks/useViewMode';
import type { Tune } from '../hooks/usePlayback';

interface TopBarProps {
  tune: Tune;
  setName?: string;
  viewMode: ViewMode;
  onToggleMode: () => void;
  onBack: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  tune,
  setName,
  viewMode,
  onToggleMode,
  onBack,
}) => {
  return (
    <header
      className="flex items-center gap-3 px-3 py-2 flex-shrink-0"
      style={{
        background: 'var(--paper)',
        borderBottom: '1px solid var(--line)',
        minHeight: 52,
      }}
    >
      {/* 뒤로가기 버튼 */}
      <button
        onClick={onBack}
        aria-label="곡 목록으로 이동"
        className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0
                   hover:bg-gray-100 active:bg-gray-200 transition-colors"
        style={{ color: 'var(--teal)' }}
      >
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>

      {/* 곡 정보 */}
      <div className="flex-1 min-w-0">
        <h1
          className="font-display font-semibold truncate leading-tight"
          style={{ fontSize: '1rem', color: 'var(--ink)' }}
        >
          {tune.title}
        </h1>
        <p className="text-xs truncate" style={{ color: 'var(--dim)' }}>
          <span className="font-semibold" style={{ color: 'var(--teal)' }}>
            {tune.rhythm}
          </span>
          {' · '}
          {tune.key}
          {' · '}
          Book {tune.book} p.{tune.page}
          {setName && ` · ${setName}`}
        </p>
      </div>

      {/* 전체 / 집중 토글 세그먼트 */}
      <div
        className="flex flex-shrink-0 rounded-full p-0.5 gap-0.5"
        style={{ background: 'var(--line)' }}
        role="group"
        aria-label="뷰 모드"
      >
        {(['full', 'focus'] as ViewMode[]).map(m => (
          <button
            key={m}
            onClick={() => viewMode !== m && onToggleMode()}
            aria-pressed={viewMode === m}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={
              viewMode === m
                ? {
                    background: 'var(--teal)',
                    color: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,.15)',
                  }
                : { color: 'var(--dim)' }
            }
          >
            {m === 'full' ? '전체' : '집중'}
          </button>
        ))}
      </div>
    </header>
  );
};
