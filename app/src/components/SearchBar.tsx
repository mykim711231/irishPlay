// sf3-generated | SearchBar: 제목 검색 + 리듬 필터

import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';

const RHYTHMS = [
  'reel',
  'jig',
  'hornpipe',
  'polka',
  'slide',
  'slip jig',
  'mazurka',
  'waltz',
  'barndance',
  'strathspey',
  'march',
];

interface SearchBarProps {
  onSearch: (query: string) => void;
  onRhythmChange: (rhythm: string) => void;
  onBookChange: (book: number) => void;
  resultCount: number;
  totalCount: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onRhythmChange,
  onBookChange,
  resultCount,
  totalCount,
}) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selectedRhythm, setSelectedRhythm] = useState('');
  const [selectedBook, setSelectedBook] = useState(0);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      onSearch(val.toLowerCase());
    },
    [onSearch],
  );

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  const handleRhythm = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setSelectedRhythm(val);
      onRhythmChange(val);
    },
    [onRhythmChange],
  );

  const handleBook = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = Number(e.target.value);
      setSelectedBook(val);
      onBookChange(val);
    },
    [onBookChange],
  );

  const isFiltered = query.length > 0 || selectedRhythm !== '' || selectedBook !== 0;

  return (
    <div
      style={{
        padding: '8px 12px 6px',
        background: 'var(--paper)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {/* Book + 리듬 필터 + 결과 수 (상단) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Book 필터 */}
        <select
          value={selectedBook}
          onChange={handleBook}
          style={{
            flex: '0 0 auto',
            border: `1.5px solid ${selectedBook ? 'var(--teal)' : 'var(--line)'}`,
            borderRadius: '8px',
            padding: '4px 8px',
            fontSize: '0.8rem',
            color: selectedBook ? 'var(--teal)' : 'var(--dim)',
            background: 'var(--bg)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="0">모든 Book</option>
          <option value="1">Book 1</option>
          <option value="2">Book 2</option>
          <option value="3">Book 3</option>
        </select>

        {/* 리듬 필터 */}
        <select
          value={selectedRhythm}
          onChange={handleRhythm}
          style={{
            flex: '0 0 auto',
            border: `1.5px solid ${selectedRhythm ? 'var(--teal)' : 'var(--line)'}`,
            borderRadius: '8px',
            padding: '4px 8px',
            fontSize: '0.8rem',
            color: selectedRhythm ? 'var(--teal)' : 'var(--dim)',
            background: 'var(--bg)',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">모든 리듬</option>
          {RHYTHMS.map(r => (
            <option key={r} value={r} style={{ textTransform: 'capitalize' }}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>

        <span
          style={{
            fontSize: '0.78rem',
            color: isFiltered ? 'var(--teal)' : 'var(--dim)',
            marginLeft: 'auto',
          }}
        >
          {isFiltered
            ? resultCount === 0
              ? '검색 결과 없음'
              : `총 ${totalCount}곡 중 ${resultCount}곡`
            : `전체 ${totalCount}곡`}
        </span>
      </div>

      {/* 검색 입력 (하단) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: focused ? 'var(--bg)' : 'var(--bg)',
          border: `1.5px solid ${focused ? 'var(--teal)' : 'var(--line)'}`,
          borderRadius: '10px',
          padding: '6px 10px',
          transition: 'border-color 0.15s',
        }}
      >
        <Search
          size={15}
          style={{ color: focused ? 'var(--teal)' : 'var(--dim)', flexShrink: 0 }}
        />
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="곡 검색..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.88rem',
            color: 'var(--ink)',
          }}
        />
        {query.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} style={{ color: 'var(--dim)' }} />
          </button>
        )}
      </div>
    </div>
  );
};
