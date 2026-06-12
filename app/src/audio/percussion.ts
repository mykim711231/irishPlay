// sf3-generated | percussion: Tone.js 기반 퍼커션 모듈

// [web-review-recommended] Tone.js v15 API:
//   Tone.getTransport(), MembraneSynth, MetalSynth, Sequence 등
//   버전에 따라 import 방식 및 메서드명이 다를 수 있음.

import * as Tone from 'tone';
import { RHYTHM_PATTERNS, getRhythmSubdivision } from './rhythmPatterns';

let bassSynth: Tone.MembraneSynth | null = null;
let hihatSynth: Tone.MetalSynth | null = null;
let sequence: Tone.Sequence<string> | null = null;
let _enabled = false;

function ensureSynths(): void {
  if (!bassSynth) {
    bassSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 6,
      envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
    }).toDestination();
    bassSynth.volume.value = 0;
  }

  if (!hihatSynth) {
    // MetalSynth: frequency는 생성자 옵션이 아닌 Signal 프로퍼티
    hihatSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    }).toDestination();
    hihatSynth.frequency.value = 400;
    hihatSynth.volume.value = -10;
  }
}

/** §15 항목 4: BPM 슬라이더 변경 시 퍼커션·멜로디 둘 다 갱신 */
export function setPercussionBpm(bpm: number): void {
  Tone.getTransport().bpm.value = bpm;
}

export function setPercussionEnabled(enabled: boolean): void {
  _enabled = enabled;
}

/**
 * 퍼커션 시작. rhythm에 맞는 패턴을 Tone.Sequence로 재생.
 * §15 항목 1: AudioContext 시작은 사용자 이벤트 후 호출된 Tone.start()에 의존
 */
export async function startPercussion(rhythm: string, bpm: number): Promise<void> {
  if (!_enabled) return;

  stopPercussion();
  ensureSynths();

  // Tone.start() — AudioContext 활성화 (이미 활성이면 no-op)
  await Tone.start();

  const pattern = RHYTHM_PATTERNS[rhythm] ?? RHYTHM_PATTERNS.reel;
  const subdivision = getRhythmSubdivision(rhythm);

  Tone.getTransport().bpm.value = bpm;

  sequence = new Tone.Sequence<string>(
    (time: number, beat: string) => {
      if (beat === 'D') {
        // C1(약 32Hz)은 일반 스피커로 재생 불가 → C2(약 65Hz)로 상향
        bassSynth?.triggerAttackRelease('C2', '8n', time);
      } else if (beat === 't') {
        // MetalSynth: triggerAttackRelease(note, duration, time) 시그니처.
        // 기존 ('16n', time)은 '16n'을 음정·time을 duration·스케줄시각 누락으로
        // 무음 + "scheduled callbacks should use passed-in time" 경고 유발.
        hihatSynth?.triggerAttackRelease(400, '16n', time);
      }
      // '-' 는 무음
    },
    pattern,
    subdivision
  );

  sequence.loop = true;
  sequence.start(0);
  Tone.getTransport().start();
}

export function stopPercussion(): void {
  if (sequence) {
    sequence.stop();
    sequence.dispose();
    sequence = null;
  }
  Tone.getTransport().stop();
}

export function pausePercussion(): void {
  Tone.getTransport().pause();
}

export function resumePercussion(rhythm: string, bpm: number): void {
  if (!_enabled) return;
  // Tone.js Transport 재개 대신 새로 시작 (더 안정적)
  void startPercussion(rhythm, bpm);
}
