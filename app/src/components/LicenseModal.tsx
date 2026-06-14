// 정보 & 라이선스 모달 — 앱/데이터/오픈소스 라이선스 고지

import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface LicenseModalProps {
  onClose: () => void;
}

interface OssItem {
  name: string;
  license: string;
  url: string;
}

// 앱이 사용하는 주요 오픈소스 (dependencies 기준)
const OSS: OssItem[] = [
  { name: 'abcjs',            license: 'MIT', url: 'https://github.com/paulrosen/abcjs' },
  { name: 'Tone.js',          license: 'MIT', url: 'https://github.com/Tonejs/Tone.js' },
  { name: 'React / React-DOM', license: 'MIT', url: 'https://github.com/facebook/react' },
  { name: 'React Router',     license: 'MIT', url: 'https://github.com/remix-run/react-router' },
  { name: 'lucide-react',     license: 'ISC', url: 'https://github.com/lucide-icons/lucide' },
  { name: 'zustand',          license: 'MIT', url: 'https://github.com/pmndrs/zustand' },
  { name: 'soundfont-player', license: 'MIT', url: 'https://github.com/danigb/soundfont-player' },
];

const linkStyle: React.CSSProperties = {
  color: 'var(--teal)',
  textDecoration: 'underline',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 2,
};

export const LicenseModal: React.FC<LicenseModalProps> = ({ onClose }) => {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: 'rgba(0,0,0,.55)' }}
      role="dialog"
      aria-modal="true"
      aria-label="정보 및 라이선스"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="rounded-2xl p-5 flex flex-col gap-4 max-w-sm w-full max-h-[80vh] overflow-y-auto"
        style={{ background: 'var(--paper)' }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <span className="font-semibold" style={{ color: 'var(--ink)', fontSize: '1rem' }}>
            정보 &amp; 라이선스
          </span>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex items-center justify-center w-8 h-8 rounded-full"
            style={{ color: 'var(--dim)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 앱 */}
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-bold" style={{ color: 'var(--teal)' }}>앱</h3>
          <p className="text-sm" style={{ color: 'var(--ink)' }}>
            Foinn Seisiún <span style={{ color: 'var(--dim)' }}>(irishPlay)</span>
          </p>
          <p className="text-xs" style={{ color: 'var(--dim)' }}>
            MIT License · 아일랜드 세션 튠 연습 앱
          </p>
        </section>

        {/* 튠 데이터 */}
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-bold" style={{ color: 'var(--teal)' }}>튠 데이터</h3>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink)' }}>
            악보(ABC) 데이터 출처:{' '}
            <a href="https://thesession.org" target="_blank" rel="noopener noreferrer" style={linkStyle}>
              thesession.org <ExternalLink size={11} />
            </a>
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>
            Open Database License (ODbL) — 출처 표기 및 동일 라이선스 공유 조건.
            데이터에는 AI 학습·처리 금지 조항이 포함됩니다.
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>
            「Foinn Seisiún」 곡집 © Comhaltas Ceoltóirí Éireann (CCÉ).
          </p>
        </section>

        {/* 오픈소스 */}
        <section className="flex flex-col gap-1">
          <h3 className="text-xs font-bold" style={{ color: 'var(--teal)' }}>오픈소스 라이브러리</h3>
          <ul className="flex flex-col gap-1 mt-1">
            {OSS.map(o => (
              <li key={o.name} className="flex items-center justify-between text-xs">
                <a href={o.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                  {o.name} <ExternalLink size={10} />
                </a>
                <span style={{ color: 'var(--dim)' }}>{o.license}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[0.65rem] text-center pt-1" style={{ color: 'var(--dim)' }}>
          전통 음악 곡 자체는 퍼블릭 도메인입니다.
        </p>
      </div>
    </div>
  );
};
