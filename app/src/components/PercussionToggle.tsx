// sf3-generated | PercussionToggle: 바우런/스푼 퍼커션 토글

import React from 'react';

interface PercussionToggleProps {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}

export const PercussionToggle: React.FC<PercussionToggleProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium" style={{ color: 'var(--dim)' }}>
        바우런 / 스푼
      </span>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className="relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
        style={{
          background: enabled ? 'var(--teal)' : 'var(--line)',
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
          style={{
            transform: enabled ? 'translateX(20px)' : 'translateX(0)',
          }}
        />
        <span className="sr-only">퍼커션 {enabled ? '끄기' : '켜기'}</span>
      </button>
    </div>
  );
};
