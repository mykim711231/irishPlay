// sf3-generated | ControlTray: 펼침/접힘 악기·퍼커션 트레이

import React from 'react';
import { InstrumentPicker } from './InstrumentPicker';
import { PercussionToggle } from './PercussionToggle';
import { testPercussion, testSpoon } from '../audio/soundTest';

interface ControlTrayProps {
  open: boolean;
  instrumentId: string;
  onInstrumentChange: (id: string) => void;
  bodhranEnabled: boolean;
  spoonEnabled: boolean;
  onBodhranToggle: (v: boolean) => void;
  onSpoonToggle: (v: boolean) => void;
}

export const ControlTray: React.FC<ControlTrayProps> = ({
  open,
  instrumentId,
  onInstrumentChange,
  bodhranEnabled,
  spoonEnabled,
  onBodhranToggle,
  onSpoonToggle,
}) => {
  const handleBodhranToggle = (v: boolean) => {
    void testPercussion(v);
    onBodhranToggle(v);
  };

  const handleSpoonToggle = (v: boolean) => {
    void testSpoon(v);
    onSpoonToggle(v);
  };

  return (
    <div
      className="overflow-hidden transition-all duration-300 ease-in-out"
      style={{
        maxHeight: open ? 160 : 0,
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
          label="🥁 바우런"
          enabled={bodhranEnabled}
          onToggle={handleBodhranToggle}
        />
        <PercussionToggle
          label="🥄 스푼"
          enabled={spoonEnabled}
          onToggle={handleSpoonToggle}
        />
      </div>
    </div>
  );
};
