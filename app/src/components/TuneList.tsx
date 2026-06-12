// sf3-generated | TuneList: 곡 목록 화면

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ChevronRight } from 'lucide-react';
import tunesData from '../data/tunes.json';
import setsData from '../data/sets.json';

interface TuneItem {
  id: string;
  title: string;
  book: number;
  page: number;
  rhythm: string;
  meter: string;
  key: string;
  setId: string;
}

interface SetItem {
  id: string;
  name: string;
  rhythm: string;
}

const RHYTHM_COLOR: Record<string, string> = {
  reel:     '#1f6f6b',
  jig:      '#3b5998',
  polka:    '#8b4513',
  hornpipe: '#6b4c9a',
  slipjig:  '#1a7a3c',
  slide:    '#a05c12',
};

export const TuneList: React.FC = () => {
  const navigate = useNavigate();

  const setMap = useMemo(() => {
    const m: Record<string, SetItem> = {};
    (setsData as SetItem[]).forEach(s => { m[s.id] = s; });
    return m;
  }, []);

  const tunes = tunesData as TuneItem[];

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--bg)' }}
    >
      {/* 헤더 */}
      <header
        className="flex items-center gap-3 px-4 pt-safe pb-3 flex-shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 16px)',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">☘️</span>
          <div>
            <h1
              className="font-display font-semibold leading-tight"
              style={{ fontSize: '1.1rem', color: 'var(--ink)' }}
            >
              Foinn Seisiún
            </h1>
            <p className="text-xs" style={{ color: 'var(--dim)' }}>
              {tunes.length}곡 · Book 1
            </p>
          </div>
        </div>
      </header>

      {/* 곡 목록 */}
      <main className="flex-1 overflow-y-auto px-3 py-2">
        <ul className="flex flex-col gap-1">
          {tunes.map(tune => {
            const setInfo = setMap[tune.setId];
            const rhythmColor = RHYTHM_COLOR[tune.rhythm] ?? 'var(--teal)';

            return (
              <li key={tune.id}>
                <button
                  onClick={() => navigate(`/tune/${tune.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white active:scale-[0.99]"
                  style={{ background: 'var(--paper)' }}
                >
                  {/* 아이콘 */}
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0"
                    style={{ background: `${rhythmColor}18` }}
                  >
                    <Music size={18} style={{ color: rhythmColor }} />
                  </div>

                  {/* 곡 정보 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium truncate leading-tight"
                      style={{ color: 'var(--ink)', fontSize: '0.9rem' }}
                    >
                      {tune.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--dim)' }}>
                      <span className="font-semibold" style={{ color: rhythmColor }}>
                        {tune.rhythm}
                      </span>
                      {' · '}
                      {tune.key}
                      {' · '}
                      p.{tune.page}
                      {setInfo && ` · ${setInfo.name}`}
                    </p>
                  </div>

                  <ChevronRight size={16} style={{ color: 'var(--line)', flexShrink: 0 }} />
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      {/* 저작권 푸터 §11 */}
      <footer className="copyright-footer">
        Tunes sourced from thesession.org (CC BY). Foinn Seisiún &copy; Comhaltas Ceoltóirí Éireann.
      </footer>
    </div>
  );
};
