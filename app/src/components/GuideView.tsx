// GuideView: 아일랜드 음악 연주 가이드 (장식음·휘슬·바우런·튠·연습)

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Repeat, Gauge, Hand, Star, Ear, Play } from 'lucide-react';
import { playNote } from '../audio/soundTest';

type TabId = 'ornament' | 'whistle' | 'bodhran' | 'tune' | 'practice';

const TABS: { id: TabId; emoji: string; label: string }[] = [
  { id: 'ornament', emoji: '🎵', label: '장식음' },
  { id: 'whistle',  emoji: '🪈', label: '휘슬' },
  { id: 'bodhran',  emoji: '🥁', label: '타악기' },
  { id: 'tune',     emoji: '🎼', label: '튠' },
  { id: 'practice', emoji: '📖', label: '연습' },
];

// ── 데이터 ──

const ORNAMENTS = [
  { name: '롤 (Roll)', symbol: '~', played: 'yes',
    desc: '한 음을 「주음→윗음→주음→아랫음→주음」으로 빠르게 굴립니다. 릴·지그의 가장 핵심적인 장식으로, 긴 음의 단조로움을 피하고 리듬에 생기를 줍니다.' },
  { name: '컷 (Cut)', symbol: '{음}', played: 'partial',
    desc: '주음 바로 앞에 한 음 위를 순간적으로 스쳐 칩니다. 같은 음이 연속될 때 음을 분리·강조합니다.' },
  { name: '탭 (Tap/Pat)', symbol: '{아랫음}', played: 'partial',
    desc: '컷과 반대로 주음 앞에 한 음 아래를 순간적으로 짚어 악센트를 줍니다.' },
  { name: '크란 (Cran)', symbol: '연속 컷', played: 'partial',
    desc: '낮은 D처럼 아래로 굴릴 수 없는 음에서 여러 컷을 연속으로 넣습니다. 일리언 파이프에서 유래.' },
  { name: '슬라이드 (Slide)', symbol: '↗', played: 'partial',
    desc: '목표음보다 약간 아래에서 미끄러지듯 음정에 도달합니다. 느린 곡·폴카에서 표현력을 더합니다.' },
  { name: '트리플렛 (Triplet)', symbol: '(3', played: 'yes',
    desc: '한 박 안에 세 음을 균등하게 빠르게 연주해 짧은 질주감을 만듭니다.' },
];

// 틴 휘슬(D) 운지: 위→아래 6구멍, ●막음 ○열림 ◐반구멍 / tone = Tone.js 음정
const WHISTLE = [
  { note: 'D',  holes: '●●●●●●', tone: 'D5',  tip: '전부 막음 (최저음)' },
  { note: 'E',  holes: '●●●●●○', tone: 'E5',  tip: '' },
  { note: 'F♯', holes: '●●●●○○', tone: 'F#5', tip: '' },
  { note: 'G',  holes: '●●●○○○', tone: 'G5',  tip: '' },
  { note: 'A',  holes: '●●○○○○', tone: 'A5',  tip: '' },
  { note: 'B',  holes: '●○○○○○', tone: 'B5',  tip: '' },
  { note: 'C♯', holes: '○○○○○○', tone: 'C#6', tip: '전부 열기' },
  { note: "D'", holes: '●●●●●●', tone: 'D6',  tip: '+ 강한 호흡 (2옥타브)' },
];

const BODHRAN = [
  { name: '릴 (Reel) · 4/4', pattern: '↓↑ ↓↑ ↓↑ ↓↑',
    desc: '꾸준한 다운–업 8분음표. 2·4박에 악센트(강한 다운)를 주어 곡을 밀어붙입니다.' },
  { name: '지그 (Jig) · 6/8', pattern: '↓ ↓↑  ↓ ↓↑',
    desc: '「다운–다운–업」 패턴. 1·4박을 강하게 짚어 6/8 특유의 바운스를 만듭니다.' },
  { name: '혼파이프 (Hornpipe) · 4/4', pattern: '↓·↑  롱–숏 스윙',
    desc: '다운에 강세를 두고 통통 튀는 롱–숏 스윙으로 연주합니다.' },
  { name: '폴카 (Polka) · 2/4', pattern: '↓↑ ↓↑',
    desc: '간결하고 경쾌한 다운–업. 1박 강세로 단순하게 시작하기 좋습니다.' },
];

const SPOONS = [
  { title: '잡는 법', desc: '두 스푼을 등을 맞대고 한 손에 쥡니다. 검지를 두 스푼 사이에 방아쇠처럼 끼우고, 엄지를 위쪽 손잡이에 얹습니다. 스푼 바닥 사이에 약 1.5cm 간격을 둬야 부딪칠 때 「딸깍」 소리가 납니다. 너무 꽉 쥐면 소리가 안 나고, 너무 느슨하면 떨어집니다.' },
  { title: '치는 법', desc: '무릎(허벅지)과 반대편 손바닥 사이를 왔다갔다 칩니다. 스푼 쥔 손은 다리 위 10~15cm 높이에서, 손목 스냅으로 가볍게. 세게 치면 금방 아프고 놓치기 쉬우니 살살 연습하세요.' },
  { title: '리듬', desc: '바우런과 같은 다운–업·트리플렛 리듬을 따릅니다. 릴은 ↓↑ 연속, 지그는 다운–다운–업. 위 바우런 패턴을 그대로 적용하면 됩니다.' },
  { title: '손가락 글라이드 (고급)', desc: '스푼을 쥐지 않은 손의 손가락을 펴서 45도로 세우고, 그 손가락 위로 스푼을 빠르게 끌어내리면 트레몰로 같은 연속음(roll)이 납니다.' },
];

const TUNES = [
  { name: '릴 (Reel)', meter: '4/4', feel: '빠르고 흐르듯, 가장 흔함' },
  { name: '지그 (Jig)', meter: '6/8', feel: '바운스, "따다닥" 두 그룹' },
  { name: '슬립 지그 (Slip Jig)', meter: '9/8', feel: '왈츠 같은 3박, 우아함' },
  { name: '폴카 (Polka)', meter: '2/4', feel: '경쾌·단순, 입문에 최적' },
  { name: '슬라이드 (Slide)', meter: '12/8', feel: '빠른 지그류, 미끄러지듯' },
  { name: '혼파이프 (Hornpipe)', meter: '4/4', feel: '통통 튀는 롱–숏 스윙' },
  { name: '마주르카 (Mazurka)', meter: '3/4', feel: '2·3박 강세의 3박자' },
  { name: '왈츠 (Waltz)', meter: '3/4', feel: '느리고 서정적인 3박자' },
  { name: '반스 (Barndance)', meter: '4/4', feel: '느긋한 4박, 스코티시류' },
  { name: '스트라스페이 (Strathspey)', meter: '4/4', feel: '스코틀랜드식 날카로운 점리듬' },
  { name: '마치 (March)', meter: '4/4', feel: '행진곡풍, 또렷한 박' },
];

const PRACTICE_TIPS = [
  { icon: <Ear size={18} />, title: '먼저 귀로 익히기',
    desc: '아일랜드 음악은 구전 전통입니다. 악보 전에 멜로디를 여러 번 들어 흥얼거릴 수 있을 때 따라 하세요.' },
  { icon: <Gauge size={18} />, title: '느린 재생 (50%)',
    desc: '연습 모드의 「느린 재생」으로 템포를 절반으로 낮춰 장식음 위치를 천천히 익히세요.' },
  { icon: <Gauge size={18} />, title: '점진적 템포',
    desc: '「점진적」 모드는 느리게 시작해 반복마다 빨라집니다. 근육 기억을 만드는 가장 효과적인 방법.' },
  { icon: <Repeat size={18} />, title: '어려운 구간 루프',
    desc: '루프(↻)로 곡을 반복하며 막히는 마디를 집중 연습하세요.' },
  { icon: <Hand size={18} />, title: '악보에 집중',
    desc: '악보를 탭하면 컨트롤이 숨겨지고 악보만 크게 보입니다. 재생 진행 표시는 유지됩니다.' },
  { icon: <Star size={18} />, title: '연습곡 모으기',
    desc: '곡 옆 ★로 즐겨찾기하고, 목록 상단 ★ 필터로 연습 중인 곡만 모아 보세요.' },
];

const STARTER_TIPS = [
  { title: '입문 악기는 틴 휘슬', desc: '저렴하고 휴대가 쉬우며 가장 빨리 소리를 낼 수 있어 입문 1순위입니다. 이후 피들·플루트로 넓혀가세요.' },
  { title: '첫 곡은 폴카부터', desc: '폴카는 구조가 단순해 입문에 좋습니다. 세션의 빠른 속도에 맞추려 하지 말고 자기 속도로 연습하세요.' },
  { title: '쉬운 키 A major', desc: '낮은 D를 피할 수 있어 휘슬 입문자에게 수월합니다.' },
  { title: '세션 매너', desc: '모르는 곡은 무리해서 끼지 말고 듣고 익히세요. 아는 곡이 나오면 조용히 합류하면 됩니다.' },
];

// ── 컴포넌트 ──

export const GuideView: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('ornament');

  const card = {
    background: 'var(--paper)',
    border: '1px solid var(--line)',
  } as const;

  const playBadge = (played: string) => (
    <span
      className="ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0"
      style={{
        background: played === 'yes' ? 'rgba(31,111,107,.12)' : 'var(--bg)',
        color: played === 'yes' ? 'var(--teal)' : 'var(--dim)',
        border: played === 'yes' ? 'none' : '1px solid var(--line)',
      }}
    >
      {played === 'yes' ? '🔊 소리' : '👁 악보'}
    </span>
  );

  const symbolBadge = (s: string) => (
    <span
      className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-mono text-sm flex-shrink-0"
      style={{ background: 'rgba(31,111,107,.1)', color: 'var(--teal)', minWidth: 44 }}
    >
      {s}
    </span>
  );

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* 헤더 */}
      <header
        className="flex items-center gap-2 px-3 flex-shrink-0"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 14px)',
          paddingBottom: '10px',
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
        <span className="text-xl">☘️</span>
        <h1 className="font-display font-semibold" style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
          연주 가이드
        </h1>
      </header>

      {/* 탭 바 (가로 스크롤) */}
      <div
        className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0"
        style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)' }}
      >
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors"
              style={{
                background: active ? 'var(--teal)' : 'var(--bg)',
                color: active ? '#fff' : 'var(--ink)',
                border: `1px solid ${active ? 'var(--teal)' : 'var(--line)'}`,
              }}
            >
              <span>{t.emoji}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 본문 */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {/* 장식음 */}
        {tab === 'ornament' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs mb-1 leading-relaxed" style={{ color: 'var(--dim)' }}>
              같은 멜로디라도 어디에 어떤 장식을 넣느냐에 따라 곡이 달라집니다. 악보 기호로 위치를 확인하세요.
              「🔊 소리」는 재생에 들리고, 「👁 악보」는 악보에만 표시됩니다.
            </p>
            {ORNAMENTS.map(o => (
              <div key={o.name} className="rounded-xl p-3" style={card}>
                <div className="flex items-center gap-2 mb-1">
                  {symbolBadge(o.symbol)}
                  <span className="font-medium" style={{ color: 'var(--ink)', fontSize: '0.92rem' }}>{o.name}</span>
                  {playBadge(o.played)}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>{o.desc}</p>
              </div>
            ))}
            <div className="rounded-xl p-3" style={card}>
              <div className="flex items-center gap-2 mb-1">
                {symbolBadge('>')}
                <span className="font-medium" style={{ color: 'var(--ink)', fontSize: '0.92rem' }}>브로큰 리듬 (Swing)</span>
                {playBadge('yes')}
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>
                혼파이프·일부 폴카의 「롱–숏」 스윙. 두 음을 같은 길이로 치지 않고 앞을 길게·뒤를 짧게 연주해 통통 튀는 느낌을 만듭니다.
              </p>
            </div>
          </div>
        )}

        {/* 틴 휘슬 운지표 */}
        {tab === 'whistle' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs mb-1 leading-relaxed" style={{ color: 'var(--dim)' }}>
              D 틴 휘슬 운지표입니다. 위→아래 6개 구멍을 <b>●</b>(막음) <b>○</b>(열림)으로 표시합니다.
              구멍을 많이 막을수록 낮은 음이 납니다. 윗 옥타브는 같은 운지에 호흡을 더 강하게 붑니다.
            </p>
            {WHISTLE.map(w => (
              <div key={w.note} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={card}>
                <button
                  onClick={() => void playNote(w.tone)}
                  aria-label={`${w.note} 음 듣기`}
                  className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-transform active:scale-90"
                  style={{ background: 'var(--teal)', color: '#fff' }}
                >
                  <Play size={14} fill="white" style={{ marginLeft: 1 }} />
                </button>
                <span
                  className="font-semibold flex-shrink-0 text-center"
                  style={{ color: 'var(--teal)', fontSize: '1.05rem', width: 28 }}
                >
                  {w.note}
                </span>
                <span className="font-mono tracking-widest" style={{ color: 'var(--ink)', fontSize: '1.05rem' }}>
                  {w.holes}
                </span>
                {w.tip && (
                  <span className="ml-auto text-xs text-right" style={{ color: 'var(--dim)' }}>{w.tip}</span>
                )}
              </div>
            ))}
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--dim)' }}>
              ※ 왼손이 위 3구멍, 오른손이 아래 3구멍을 잡습니다. C♯은 모두 열고, C 내추럴 등 반음은 크로스 운지·반구멍(◐)이 필요합니다.
            </p>
          </div>
        )}

        {/* 바우런 리듬 패턴 */}
        {tab === 'bodhran' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs mb-1 leading-relaxed" style={{ color: 'var(--dim)' }}>
              팁퍼(beater)의 <b>↓</b>(다운) <b>↑</b>(업) 스트로크 패턴입니다. 다운·업이 똑같이 고르게 날 때까지 연습한 뒤, 일부 다운에 악센트를 넣으세요.
            </p>
            {BODHRAN.map(b => (
              <div key={b.name} className="rounded-xl p-3" style={card}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-medium" style={{ color: 'var(--ink)', fontSize: '0.92rem' }}>{b.name}</span>
                </div>
                <div
                  className="font-mono text-center py-1.5 rounded-md mb-1.5"
                  style={{ background: 'rgba(31,111,107,.08)', color: 'var(--teal)', fontSize: '1rem', letterSpacing: '0.15em' }}
                >
                  {b.pattern}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>{b.desc}</p>
              </div>
            ))}
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--dim)' }}>
              ※ 이 앱의 바우런(🥁) 토글을 켜면 곡의 리듬에 맞춰 패턴이 자동 재생됩니다. 함께 따라 쳐보세요.
            </p>

            {/* 스푼 */}
            <div className="flex items-center gap-2 mt-4 mb-1">
              <span className="text-lg">🥄</span>
              <h2 className="font-semibold" style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>스푼 (Spoons)</h2>
            </div>
            <p className="text-xs mb-1 leading-relaxed" style={{ color: 'var(--dim)' }}>
              두 개의 숟가락만 있으면 되는 가장 소박한 타악기입니다. 바우런과 같은 리듬을 더 가볍고 또렷한 「딸깍」 소리로 연주합니다.
            </p>
            {SPOONS.map(s => (
              <div key={s.title} className="rounded-xl p-3" style={card}>
                <p className="font-medium mb-0.5" style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{s.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>{s.desc}</p>
              </div>
            ))}
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--dim)' }}>
              ※ 이 앱의 스푼(🥄) 토글로 소리를 켤 수 있습니다.
            </p>
          </div>
        )}

        {/* 튠 종류 & 박자 */}
        {tab === 'tune' && (
          <div className="flex flex-col gap-2">
            <p className="text-xs mb-1 leading-relaxed" style={{ color: 'var(--dim)' }}>
              아일랜드 음악은 곡(tune) 중심입니다. 종류마다 박자와 느낌이 달라 같은 악기라도 표현이 달라집니다.
              목록의 리듬 필터로 종류별 곡을 모아 들어보세요.
            </p>
            {TUNES.map(t => (
              <div key={t.name} className="rounded-xl px-3 py-2.5 flex items-center gap-3" style={card}>
                <span
                  className="font-mono text-xs px-2 py-1 rounded-md flex-shrink-0 text-center"
                  style={{ background: 'rgba(31,111,107,.1)', color: 'var(--teal)', minWidth: 44 }}
                >
                  {t.meter}
                </span>
                <div className="min-w-0">
                  <span className="font-medium" style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{t.name}</span>
                  <p className="text-xs" style={{ color: 'var(--dim)' }}>{t.feel}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 연습 + 입문 */}
        {tab === 'practice' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-semibold mb-2" style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>연습법</h2>
              <div className="flex flex-col gap-2">
                {PRACTICE_TIPS.map(t => (
                  <div key={t.title} className="rounded-xl p-3 flex gap-3" style={card}>
                    <span
                      className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0"
                      style={{ background: 'rgba(31,111,107,.1)', color: 'var(--teal)' }}
                    >
                      {t.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium mb-0.5" style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{t.title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="font-semibold mb-2" style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>입문 팁</h2>
              <div className="flex flex-col gap-2">
                {STARTER_TIPS.map(t => (
                  <div key={t.title} className="rounded-xl p-3" style={card}>
                    <p className="font-medium mb-0.5" style={{ color: 'var(--ink)', fontSize: '0.9rem' }}>{t.title}</p>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--dim)' }}>{t.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-center py-4" style={{ color: 'var(--dim)' }}>
          ☘️ 천천히, 꾸준히. Tóg go bog é.
        </p>
      </main>
    </div>
  );
};
