// sf3-generated | TuneList: 곡 목록 화면 (즐겨찾기 기능 포함)

import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ChevronRight, Star, BookOpen, QrCode, X, Info } from 'lucide-react';
import tunesData from '../data/tunes.json';
import setsData from '../data/sets.json';
import { SearchBar } from './SearchBar';
import { LicenseModal } from './LicenseModal';
import { useFavorites } from '../hooks/useFavorites';

interface TuneItem {
  id: string;
  title: string;
  book: number;
  page: number;
  rhythm: string;
  meter: string;
  key: string;
  setId: string;
  setOrder?: number;
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
  const [searchQuery, setSearchQuery]     = useState('');
  const [selectedRhythm, setSelectedRhythm] = useState('');
  const [selectedBook, setSelectedBook]   = useState(0);
  const [favOnly, setFavOnly]             = useState(false);
  const [showQr, setShowQr]               = useState(false);
  const [showLicense, setShowLicense]     = useState(false);

  const { isFavorite, toggleFavorite, count: favCount } = useFavorites();

  const handleSearch = useCallback((q: string) => setSearchQuery(q), []);
  const handleRhythm = useCallback((r: string) => setSelectedRhythm(r), []);
  const handleBook = useCallback((b: number) => setSelectedBook(b), []);

  const setMap = useMemo(() => {
    const m: Record<string, SetItem> = {};
    (setsData as SetItem[]).forEach(s => { m[s.id] = s; });
    return m;
  }, []);

  const allTunes = tunesData as TuneItem[];

  const filteredTunes = useMemo(() => {
    return allTunes.filter(t => {
      const titleMatch  = t.title.toLowerCase().includes(searchQuery);
      const rhythmMatch = !selectedRhythm || t.rhythm === selectedRhythm;
      const bookMatch   = !selectedBook || t.book === selectedBook;
      const favMatch    = !favOnly || isFavorite(t.id);
      return titleMatch && rhythmMatch && bookMatch && favMatch;
    });
  }, [allTunes, searchQuery, selectedRhythm, selectedBook, favOnly, isFavorite]);

  const groupedByBook = useMemo(() => {
    const groups: Record<number, TuneItem[]> = { 1: [], 2: [], 3: [] };
    filteredTunes.forEach(t => {
      if (t.book >= 1 && t.book <= 3) groups[t.book].push(t);
    });
    // setId "b1-s03" → 세트 번호 3, setOrder로 세트 내 순서 정렬
    const setNum = (setId: string) => {
      const m = setId.match(/-s(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    };
    ([1, 2, 3] as const).forEach(book => {
      groups[book].sort((a, b) => {
        const sd = setNum(a.setId) - setNum(b.setId);
        if (sd !== 0) return sd;
        return (a.setOrder ?? 0) - (b.setOrder ?? 0);
      });
    });
    return groups;
  }, [filteredTunes]);

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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl">☘️</span>
          <div className="flex-1 min-w-0">
            <h1
              className="font-display font-semibold leading-tight"
              style={{ fontSize: '1.1rem', color: 'var(--ink)' }}
            >
              Foinn Seisiún
            </h1>
            <p className="text-xs" style={{ color: 'var(--dim)' }}>
              {allTunes.length}곡 · Book 1–3
            </p>
          </div>
        </div>

        {/* QR 공유 */}
        <button
          onClick={() => setShowQr(true)}
          aria-label="QR 코드로 공유"
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-all"
          style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', color: 'var(--teal)' }}
        >
          <QrCode size={16} />
        </button>

        {/* 정보·라이선스 */}
        <button
          onClick={() => setShowLicense(true)}
          aria-label="정보 및 라이선스"
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-all"
          style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', color: 'var(--teal)' }}
        >
          <Info size={16} />
        </button>

        {/* 장식음·연습 가이드 */}
        <button
          onClick={() => navigate('/guide')}
          aria-label="장식음·연습 가이드"
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 transition-all"
          style={{ background: 'var(--bg)', border: '1.5px solid var(--line)', color: 'var(--teal)' }}
        >
          <BookOpen size={16} />
        </button>

        {/* 즐겨찾기만 보기 토글 */}
        <button
          onClick={() => setFavOnly(v => !v)}
          aria-label={favOnly ? '전체 보기' : '즐겨찾기만 보기'}
          aria-pressed={favOnly}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all"
          style={{
            background:  favOnly ? '#fef3c7' : 'var(--bg)',
            border:      `1.5px solid ${favOnly ? '#f59e0b' : 'var(--line)'}`,
            color:       favOnly ? '#b45309' : 'var(--dim)',
          }}
        >
          <Star
            size={13}
            fill={favOnly ? '#f59e0b' : 'none'}
            stroke={favOnly ? '#f59e0b' : 'currentColor'}
          />
          {favOnly ? `${favCount}` : '★'}
        </button>
      </header>

      {/* 검색 바 */}
      <SearchBar
        onSearch={handleSearch}
        onRhythmChange={handleRhythm}
        onBookChange={handleBook}
        resultCount={filteredTunes.length}
        totalCount={favOnly ? favCount : allTunes.length}
      />

      {/* 곡 목록 */}
      <main className="flex-1 overflow-y-auto px-3 py-2">
        {filteredTunes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-2"
            style={{ color: 'var(--dim)' }}
          >
            <Music size={36} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>
              {favOnly ? '즐겨찾기가 없습니다' : '검색 결과 없음'}
            </p>
            {favOnly && (
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                곡 옆 ★ 버튼으로 추가하세요
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {([1, 2, 3] as const).map(book => {
              const tunes = groupedByBook[book];
              if (tunes.length === 0) return null;
              return (
                <section key={`book-${book}`}>
                  {/* Book 헤더 — sticky */}
                  <div
                    className="sticky top-0 z-10 flex items-center gap-2 px-1 py-1.5"
                    style={{
                      background: 'var(--bg)',
                      borderBottom: '1.5px solid var(--line)',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: 'var(--teal, #1f6f6b)',
                        color: '#fff',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Book {book}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--dim)' }}>
                      {tunes.length}곡
                    </span>
                  </div>

                  <ul className="flex flex-col gap-1">
                    {tunes.map(tune => {
                      const setInfo     = setMap[tune.setId];
                      const rhythmColor = RHYTHM_COLOR[tune.rhythm] ?? 'var(--teal)';
                      const starred     = isFavorite(tune.id);

                      return (
                        <li key={`${tune.id}-${tune.setId}`}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/tune/${tune.id}`)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                navigate(`/tune/${tune.id}`);
                              }
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white active:scale-[0.99] cursor-pointer"
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

                            {/* ★ 즐겨찾기 버튼 */}
                            <button
                              onClick={e => { e.stopPropagation(); toggleFavorite(tune.id, e); }}
                              aria-label={starred ? '즐겨찾기 제거' : '즐겨찾기 추가'}
                              aria-pressed={starred}
                              className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all active:scale-90"
                              style={{
                                background: starred ? '#fef3c7' : 'transparent',
                                border: 'none',
                              }}
                            >
                              <Star
                                size={16}
                                fill={starred ? '#f59e0b' : 'none'}
                                stroke={starred ? '#f59e0b' : 'var(--line)'}
                              />
                            </button>

                            <ChevronRight size={16} style={{ color: 'var(--line)', flexShrink: 0 }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </main>

      {/* 저작권 푸터 §11 — 자세한 고지는 ⓘ 라이선스 모달 참고 */}
      <footer className="copyright-footer">
        <button
          onClick={() => setShowLicense(true)}
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          튠 데이터: thesession.org (ODbL) · Foinn Seisiún &copy; Comhaltas Ceoltóirí Éireann · 라이선스
        </button>
      </footer>

      {/* QR 공유 모달 */}
      {showQr && (
        <div
          onClick={() => setShowQr(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,.55)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="rounded-2xl p-5 flex flex-col items-center gap-3 max-w-xs w-full"
            style={{ background: 'var(--paper)' }}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold" style={{ color: 'var(--ink)', fontSize: '1rem' }}>
                앱 공유
              </span>
              <button
                onClick={() => setShowQr(false)}
                aria-label="닫기"
                className="flex items-center justify-center w-8 h-8 rounded-full"
                style={{ color: 'var(--dim)' }}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={`${import.meta.env.BASE_URL}qr.png`}
              alt="앱 주소 QR 코드"
              width={220}
              height={220}
              className="rounded-lg"
              style={{ background: '#fff', padding: 8 }}
            />
            <p className="text-xs text-center" style={{ color: 'var(--dim)' }}>
              휴대폰 카메라로 스캔하면 앱이 열립니다.<br />
              「홈 화면에 추가」하면 앱처럼 사용할 수 있어요.
            </p>
          </div>
        </div>
      )}

      {/* 정보·라이선스 모달 */}
      {showLicense && <LicenseModal onClose={() => setShowLicense(false)} />}
    </div>
  );
};
