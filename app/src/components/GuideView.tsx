// GuideView: 아일랜드 음악 장식음·리듬 표현 가이드 + 연습법 도움말

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Music, Repeat, Gauge, Hand, Star, Ear } from 'lucide-react';

interface Ornament {
  name: string;
  symbol: string;
  desc: string;
  played: 'yes' | 'partial';
}

const ORNAMENTS: Ornament[] = [
  {
    name: '롤 (Roll)',
    symbol: '~',
    desc: '한 음을 「주음 → 윗음 → 주음 → 아랫음 → 주음」으로 빠르게 굴립니다. 릴·지그의 가장 핵심적인 장식으로, 음을 길게 끌 때 단조로움을 피하고 리듬에 생기를 줍니다.',
    played: 'yes',
  },
  {
    name: '컷 (Cut)',
    symbol: '{음}',
    desc: '주음 바로 앞에 한 음 위를 순간적으로 스쳐 칩니다. 같은 음이 연속될 때 음을 분리하거나 강조하는 역할을 합니다. 매우 짧은 꾸밈음표로 표시됩니다.',
    played: 'partial',
  },
  {
    name: '탭 (Tap / Pat)',
    symbol: '{아랫음}',
    desc: '컷과 반대로, 주음 앞에 한 음 아래를 순간적으로 짚습니다. 음에 악센트를 주는 효과가 있습니다.',
    played: 'partial',
  },
  {
    name: '크란 (Cran)',
    symbol: '연속 컷',
    desc: '주로 낮은 D처럼 아래로 굴릴 수 없는 음에서, 여러 개의 컷을 연속으로 넣는 기법입니다. 일리언 파이프(uilleann pipes)에서 유래했습니다.',
    played: 'partial',
  },
  {
    name: '슬라이드 (Slide)',
    symbol: '↗',
    desc: '목표음보다 약간 아래에서 시작해 미끄러지듯 음정에 도달합니다. 느린 곡(에어)이나 폴카에서 표현력을 더합니다.',
    played: 'partial',
  },
  {
    name: '트리플렛 (Triplet)',
    symbol: '(3',
    desc: '한 박 안에 세 음을 균등하게 빠르게 연주합니다. 짧은 질주감을 만들어 프레이즈를 연결합니다.',
    played: 'yes',
  },
];

interface PracticeTip {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export const GuideView: React.FC = () => {
  const navigate = useNavigate();

  const tips: PracticeTip[] = [
    {
      icon: <Ear size={18} />,
      title: '먼저 귀로 익히기',
      desc: '아일랜드 음악은 구전 전통입니다. 악보를 보기 전에 멜로디를 여러 번 들어 흥얼거릴 수 있을 때 따라 하면 훨씬 자연스럽습니다.',
    },
    {
      icon: <Gauge size={18} />,
      title: '느린 재생 (50%)',
      desc: '연습 모드의 「느린 재생」으로 템포를 절반으로 낮춰, 장식음이 어디에 들어가는지 천천히 눈과 귀로 익히세요.',
    },
    {
      icon: <Gauge size={18} />,
      title: '점진적 템포',
      desc: '「점진적」 모드는 느린 속도에서 시작해 반복할 때마다 조금씩 빨라집니다. 손가락이 패턴을 기억(근육 기억)하게 만드는 가장 효과적인 방법입니다.',
    },
    {
      icon: <Repeat size={18} />,
      title: '어려운 구간 루프',
      desc: '루프(↻) 버튼으로 곡을 반복 재생하며, 막히는 마디를 집중적으로 반복 연습하세요.',
    },
    {
      icon: <Hand size={18} />,
      title: '악보에 집중',
      desc: '악보를 탭하면 컨트롤이 숨겨지고 악보만 크게 보입니다. 재생 진행 표시(현재 음 강조)는 그대로 유지되어 따라 읽기 좋습니다.',
    },
    {
      icon: <Star size={18} />,
      title: '연습곡 모으기',
      desc: '곡 옆 ★ 버튼으로 즐겨찾기에 추가하고, 목록 상단의 ★ 필터로 연습 중인 곡만 모아 보세요.',
    },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 14px)',
          paddingBottom: '12px',
          background: 'var(--paper)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <button
          onClick={() => navigate('/')}
          aria-label="뒤로"
          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
          style={{ color: 'var(--teal)' }}
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">☘️</span>
          <h1
            className="font-display font-semibold"
            style={{ fontSize: '1.05rem', color: 'var(--ink)' }}
          >
            장식음 · 연습 가이드
          </h1>
        </div>
      </header>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {/* 섹션 1: 장식음 */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Music size={18} style={{ color: 'var(--teal)' }} />
            <h2 className="font-semibold" style={{ fontSize: '1rem', color: 'var(--ink)' }}>
              장식음 (Ornamentation)
            </h2>
          </div>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--dim)' }}>
            아일랜드 전통음악의 생명은 장식음입니다. 같은 멜로디라도 어디에 어떤 장식을 넣느냐에 따라
            완전히 다른 곡이 됩니다. 악보의 기호로 위치를 확인하세요.
          </p>
          <div className="flex flex-col gap-2">
            {ORNAMENTS.map(o => (
              <div
                key={o.name}
                className="rounded-xl p-3"
                style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-mono text-sm flex-shrink-0"
                    style={{ background: 'rgba(31,111,107,.1)', color: 'var(--teal)', minWidth: 40 }}
                  >
                    {o.symbol}
                  </span>
                  <span className="font-medium" style={{ color: 'var(--ink)', fontSize: '0.92rem' }}>
                    {o.name}
                  </span>
                  <span
                    className="ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: o.played === 'yes' ? 'rgba(31,111,107,.12)' : 'var(--bg)',
                      color: o.played === 'yes' ? 'var(--teal)' : 'var(--dim)',
                      border: o.played === 'yes' ? 'none' : '1px solid var(--line)',
                    }}
                  >
                    {o.played === 'yes' ? '🔊 소리 표현' : '👁 악보 표시'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>
                  {o.desc}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--dim)' }}>
            ※ 「🔊 소리 표현」은 재생할 때 소리로 들리고, 「👁 악보 표시」는 악보에는 보이지만
            재생 음원에는 빠집니다. 악보를 보며 직접 장식을 넣어 연습하세요.
          </p>
        </section>

        {/* 섹션 2: 리듬 */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Gauge size={18} style={{ color: 'var(--teal)' }} />
            <h2 className="font-semibold" style={{ fontSize: '1rem', color: 'var(--ink)' }}>
              리듬 표현 (Rhythm)
            </h2>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-mono text-sm"
                style={{ background: 'rgba(31,111,107,.1)', color: 'var(--teal)', minWidth: 40 }}
              >
                &gt;
              </span>
              <span className="font-medium" style={{ color: 'var(--ink)', fontSize: '0.92rem' }}>
                브로큰 리듬 (Swing)
              </span>
              <span
                className="ml-auto text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(31,111,107,.12)', color: 'var(--teal)' }}
              >
                🔊 소리 표현
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>
              혼파이프(hornpipe)와 일부 폴카의 특징인 「롱–숏」 스윙입니다. 두 음을 같은 길이로
              치지 않고, 앞 음을 길게·뒤 음을 짧게 연주해 통통 튀는 느낌을 만듭니다. 재생에서도
              이 리듬이 그대로 표현됩니다.
            </p>
          </div>
        </section>

        {/* 섹션 3: 연습법 */}
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Repeat size={18} style={{ color: 'var(--teal)' }} />
            <h2 className="font-semibold" style={{ fontSize: '1rem', color: 'var(--ink)' }}>
              연습법
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {tips.map(t => (
              <div
                key={t.title}
                className="rounded-xl p-3 flex gap-3"
                style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}
              >
                <span
                  className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                  style={{ background: 'rgba(31,111,107,.1)', color: 'var(--teal)' }}
                >
                  {t.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-medium mb-0.5" style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>
                    {t.title}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>
                    {t.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 푸터 */}
        <p className="text-xs text-center py-3" style={{ color: 'var(--dim)' }}>
          ☘️ 천천히, 꾸준히. Tóg go bog é. (편하게 하세요)
        </p>
      </main>
    </div>
  );
};
