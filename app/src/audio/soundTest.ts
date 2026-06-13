// soundTest: 악기 선택·퍼커션 토글 시 청각 피드백용 단음 재생 모듈
//
// 설계 원칙:
//  - abcjs synth(멜로디 재생)와 완전히 분리된 Tone.js 인스턴스 사용
//  - Tone.start()는 사용자 이벤트(onChange/onClick) 안에서만 호출
//  - testInstrument: 동시 재생 방지 (이전 테스트 진행 중이면 무시)
//  - testPercussion: ON 시에만 타격음, OFF 시 무음
//  - testSpoon: ON 시에만 하이햇음, OFF 시 무음

import {
  Synth,
  MembraneSynth,
  MetalSynth,
  start as toneStart,
  now as toneNow,
} from 'tone';
import { getInstrument } from '../data/instruments';

// ─── 상태 ────────────────────────────────────────────────────────────────────

let testSynth: Synth | null = null;
let testPercSynth: MembraneSynth | null = null;
let testSpoonSynth: MetalSynth | null = null;
let testInProgress = false;

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

/**
 * GM program number에 따라 대략적인 음색을 결정.
 * 정확한 재현보다는 "다른 악기임을 알 수 있는" 수준으로 충분.
 */
type BasicOscType = 'sine' | 'triangle' | 'sawtooth' | 'square';

function oscTypeForProgram(program: number): BasicOscType {
  if (program >= 40 && program <= 47) return 'sawtooth';  // 현악기 (fiddle 등)
  if (program >= 16 && program <= 23) return 'square';    // 오르간·아코디언 계열
  if (program === 0)                  return 'triangle';  // 피아노
  // 목관악기(72-79), 기타(24-31), 기타 → triangle
  return 'triangle';
}

/** 기존 testSynth가 없거나 disposed 상태면 새로 생성, 있으면 음색만 갱신 */
function ensureTestSynth(program: number): Synth {
  const oscType = oscTypeForProgram(program);

  if (!testSynth) {
    testSynth = new Synth({
      oscillator: { type: oscType },
      envelope: { attack: 0.01, decay: 0.12, sustain: 0.2, release: 0.15 },
    }).toDestination();
    testSynth.volume.value = -12;
  } else {
    // Tone.js v15: oscillator.type은 직접 대입 가능
    (testSynth.oscillator as any).type = oscType;
  }

  return testSynth;
}

/** MembraneSynth 싱글턴 (testPercussion 전용 — percussion.ts의 것과 별개) */
function ensureTestPercSynth(): MembraneSynth {
  if (!testPercSynth) {
    testPercSynth = new MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
    }).toDestination();
    testPercSynth.volume.value = 0;
  }
  return testPercSynth;
}

/** MetalSynth 싱글턴 (testSpoon 전용) */
function ensureTestSpoonSynth(): MetalSynth {
  if (!testSpoonSynth) {
    testSpoonSynth = new MetalSynth({
      envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    testSpoonSynth.frequency.value = 400;
    testSpoonSynth.volume.value = -10;
  }
  return testSpoonSynth;
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 악기 선택 시 해당 악기의 음색으로 C4 단음(16분음표 길이) 재생.
 * 이전 테스트가 진행 중이면 무시한다.
 */
export async function testInstrument(instrumentId: string): Promise<void> {
  if (testInProgress) return;
  testInProgress = true;

  try {
    // 사용자 이벤트(onChange) 내부이므로 Tone.start() 호출 가능
    await toneStart();

    const instrument = getInstrument(instrumentId);
    const synth = ensureTestSynth(instrument.program);

    // lowwhistle처럼 octave < 0인 악기는 C3로, 나머지는 C4로
    const note = instrument.octave < 0 ? 'C3' : 'C4';
    synth.triggerAttackRelease(note, '16n', toneNow());
  } finally {
    // 16분음표(≒150ms@100bpm) + envelope 여유 포함 500ms 후 해제
    setTimeout(() => { testInProgress = false; }, 500);
  }
}

/**
 * 바우런 토글 시 피드백음 재생 (MembraneSynth 베이스 타격).
 * - enabled = true  → 타격음 (C2, 8분음표)
 * - enabled = false → 무음
 */
export async function testPercussion(enabled: boolean): Promise<void> {
  if (!enabled) return;

  // 사용자 이벤트(onClick) 내부
  await toneStart();

  const synth = ensureTestPercSynth();
  synth.triggerAttackRelease('C2', '8n', toneNow());
}

/**
 * 스푼 토글 시 피드백음 재생 (MetalSynth 하이햇).
 * - enabled = true  → 하이햇 틱음
 * - enabled = false → 무음
 */
export async function testSpoon(enabled: boolean): Promise<void> {
  if (!enabled) return;

  await toneStart();

  const synth = ensureTestSpoonSynth();
  synth.triggerAttackRelease(400, '16n', toneNow());
}
