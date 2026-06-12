// sf3-generated | instruments: 멜로디 악기 정의

export interface MelodyInstrument {
  id: string;
  label: string;
  emoji: string;
  /** GM MIDI program number (0-127) */
  program: number;
  /** Octave shift for ABC playback (-1 = 한 옥타브 낮춤) */
  octave: number;
}

export const MELODY_INSTRUMENTS: MelodyInstrument[] = [
  { id: 'fiddle',     label: 'Fiddle',      emoji: '🎻', program: 40, octave: 0  },
  { id: 'tinwhistle', label: 'Tin Whistle', emoji: '🪈', program: 72, octave: 0  },
  { id: 'lowwhistle', label: 'Low Whistle', emoji: '🎵', program: 73, octave: -1 },
  { id: 'flute',      label: 'Flute',       emoji: '🎺', program: 73, octave: 0  },
  { id: 'accordion',  label: 'Accordion',   emoji: '🪗', program: 21, octave: 0  },
  { id: 'bouzouki',   label: 'Bouzouki',    emoji: '🎸', program: 25, octave: 0  },
  { id: 'piano',      label: 'Piano',       emoji: '🎹', program: 0,  octave: 0  },
];

export const getInstrument = (id: string): MelodyInstrument =>
  MELODY_INSTRUMENTS.find(i => i.id === id) ?? MELODY_INSTRUMENTS[0];
