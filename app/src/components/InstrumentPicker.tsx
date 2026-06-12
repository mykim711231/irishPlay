// sf3-generated | InstrumentPicker: 멜로디 악기 선택 드롭다운

import React from 'react';
import { MELODY_INSTRUMENTS } from '../data/instruments';

interface InstrumentPickerProps {
  value: string;
  onChange: (id: string) => void;
}

export const InstrumentPicker: React.FC<InstrumentPickerProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="instrument-select"
        className="text-xs font-medium flex-shrink-0"
        style={{ color: 'var(--dim)' }}
      >
        악기
      </label>
      <select
        id="instrument-select"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 text-sm rounded-lg px-2 py-1.5 border appearance-none"
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--line)',
          color: 'var(--ink)',
        }}
      >
        {MELODY_INSTRUMENTS.map(inst => (
          <option key={inst.id} value={inst.id}>
            {inst.emoji} {inst.label}
          </option>
        ))}
      </select>
    </div>
  );
};
