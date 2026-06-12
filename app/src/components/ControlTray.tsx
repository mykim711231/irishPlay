// sf3-generated | ControlTray: 펼침/접힘 악기·퍼커션 트레이

import React from 'react';
import { InstrumentPicker } from './InstrumentPicker';
import { PercussionToggle } from './PercussionToggle';
import { testPercussion } from '../audio/soundTest';

interface ControlTrayProps {
  open: boolean;
  instrumentId: string;
  onInstrumentChange: (id: string) => void;
  percussionEnabled: boolean;
  onPercussionToggle: (v: boolean) => void;
}

export const ControlTray: React.FC<ControlTrayProps> = ({
  open,
  instrumentId,
  onInstrumentChange,
  percussionEnabled,
  onPercussionToggle,
}) => {
  const handlePercussionToggle = (v: boolean) => {
    void testPercussion(v);
    onPercussionToggle(v);
  };

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        maxHeight: open ? 120 : 0,
        borderTop: open ? '1px solid var(--line)' : 'none',
      }}
      aria-hidden={!open}
    >
      <div
        className="flex flex-col gap-3 px-4 py-3"
        style={{ background: 'var(--paper)' }}
      >
        <InstrumentPicker
          value={instrumentId}
          onChange={onInstrumentChange}
        />
        <PercussionToggle
          enabled={percussionEnabled}
          onToggle={handlePercussionToggle}
        />
      </div>
    </div>
  );
};
