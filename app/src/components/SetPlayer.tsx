// sf3-generated | SetPlayer: 세트(여러 곡) 순차 재생 컴포넌트

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import tunesData from '../data/tunes.json';
import setsData from '../data/sets.json';

interface SetPlayerProps {
  setId: string;
  currentTuneId: string;
}

interface TuneItem {
  id: string;
  title: string;
  rhythm: string;
  key: string;
}

interface SetItem {
  id: string;
  name: string;
  rhythm: string;
  tuneIds: string[];
}

export const SetPlayer: React.FC<SetPlayerProps> = ({
  setId,
  currentTuneId,
}) => {
  const navigate = useNavigate();

  const setInfo = (setsData as SetItem[]).find(s => s.id === setId);
  // 세로 모드 (< 400px)에서는 숨김
  if (!setInfo || setInfo.tuneIds.length <= 1 || (typeof window !== 'undefined' && window.innerWidth < 400)) return null;

  const tunesInSet = setInfo.tuneIds
    .map(tid => (tunesData as TuneItem[]).find(t => t.id === tid))
    .filter(Boolean) as TuneItem[];

  return (
    <div
      className="set-player px-4 py-2 flex-shrink-0"
      style={{ borderTop: '1px solid var(--line)', background: 'var(--bg)' }}
    >
      <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--dim)' }}>
        이 세트의 곡들
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tunesInSet.map((tune, idx) => {
          const isActive = tune.id === currentTuneId;
          return (
            <button
              key={tune.id}
              onClick={() => navigate(`/tune/${tune.id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0 transition-colors"
              style={{
                background: isActive ? 'var(--teal)' : 'var(--paper)',
                color: isActive ? '#fff' : 'var(--ink)',
                border: `1px solid ${isActive ? 'var(--teal)' : 'var(--line)'}`,
              }}
            >
              <span>{idx + 1}</span>
              <span className="font-medium">{tune.title}</span>
              {idx < tunesInSet.length - 1 && !isActive && (
                <ChevronRight size={10} style={{ color: 'var(--dim)' }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
