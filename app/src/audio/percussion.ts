// sf3-generated | percussion: Tone.js 기반 퍼커션 모듈

// [web-review-recommended] Tone.js v15 API:
//   Tone.getTransport(), MembraneSynth, MetalSynth, Sequence 등
//   버전에 따라 import 방식 및 메서드명이 다를 수 있음.

// named import → Rollup이 미사용 Tone.js 모듈을 tree-shake 가능
import {
  MembraneSynth,
  MetalSynth,
  Sequence,
  getTransport,
  start as toneStart,
} from 'tone';
import { RHYTHM_PATTERNS, getRhythmSubdivision } from './rhythmPatterns';

let bassSynth: MembraneSynth | null = null;
let hihatSynth: MetalSynth | null = null;
let sequence: Sequence<string> | null = null;

// 바우런 / 스푼 개별 활성 플래그
let _bodhranEnabled = false;
let _spoonEnabled = false;

// 바우런 타격음 — C2(65Hz)는 노트북·휴대폰 스피커가 재생하지 못해 무음으로 들림.
// A2(110Hz)로 올리고 타격 스윕이 중역대를 지나가게 하여 작은 스피커에서도 "둠" 펀치가 들리도록 함.
const BODHRAN_NOTE = 'A2';

function ensureSynths(): void {
  if (!bassSynth) {
    bassSynth = new MembraneSynth({
      // 스윕 폭을 줄여(octaves) 펀치가 65Hz로 가라앉지 않고 중역대에 머물게 함
      pitchDecay: 0.03,
      octaves: 4,
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 },
    }).toDestination();
    bassSynth.volume.value = -2;
  }

  if (!hihatSynth) {
    // MetalSynth: frequency는 생성자 옵션이 아닌 Signal 프로퍼티
    hihatSynth = new MetalSynth({
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
  getTransport().bpm.value = bpm;
}

export function setBodhranEnabled(enabled: boolean): void {
  _bodhranEnabled = enabled;
}

export function setSpoonEnabled(enabled: boolean): void {
  _spoonEnabled = enabled;
}

/** 어느 한 악기라도 켜져 있는지 */
function anyEnabled(): boolean {
  return _bodhranEnabled || _spoonEnabled;
}

/**
 * 퍼커션 시작. rhythm에 맞는 패턴을 Tone.Sequence로 재생.
 * 바우런(D)과 스푼(t) 플래그를 각각 확인하여 개별 제어.
 * §15 항목 1: AudioContext 시작은 사용자 이벤트 후 호출된 Tone.start()에 의존
 */
export async function startPercussion(rhythm: string, bpm: number): Promise<void> {
  if (!anyEnabled()) return;

  stopPercussion();
  ensureSynths();

  // toneStart() — AudioContext 활성화 (이미 활성이면 no-op)
  await toneStart();

  const pattern = RHYTHM_PATTERNS[rhythm] ?? RHYTHM_PATTERNS.reel;
  const subdivision = getRhythmSubdivision(rhythm);

  getTransport().bpm.value = bpm;

  sequence = new Sequence<string>(
    (time: number, beat: string) => {
      if (beat === 'D' && _bodhranEnabled) {
        bassSynth?.triggerAttackRelease(BODHRAN_NOTE, '8n', time);
      } else if (beat === 't' && _spoonEnabled) {
        // MetalSynth: triggerAttackRelease(note, duration, time) 시그니처.
        hihatSynth?.triggerAttackRelease(400, '16n', time);
      }
      // '-' 는 무음
    },
    pattern,
    subdivision
  );

  sequence.loop = true;
  sequence.start(0);
  getTransport().start();
}

export function stopPercussion(): void {
  if (sequence) {
    sequence.stop();
    sequence.dispose();
    sequence = null;
  }
  getTransport().stop();
}

export function pausePercussion(): void {
  getTransport().pause();
}

/**
 * 가이드 "들어보기": 리듬 패턴을 enabled 플래그와 무관하게 잠깐 재생한다.
 * 바우런(bass)·스푼(hihat) 소리를 모두 내어 패턴을 들려준다.
 */
export async function previewRhythm(
  rhythm: string,
  bpm: number,
  durationMs = 4000
): Promise<void> {
  stopPercussion();
  ensureSynths();
  await toneStart();

  const pattern = RHYTHM_PATTERNS[rhythm] ?? RHYTHM_PATTERNS.reel;
  const subdivision = getRhythmSubdivision(rhythm);
  getTransport().bpm.value = bpm;

  sequence = new Sequence<string>(
    (time: number, beat: string) => {
      if (beat === 'D') bassSynth?.triggerAttackRelease(BODHRAN_NOTE, '8n', time);
      else if (beat === 't') hihatSynth?.triggerAttackRelease(400, '16n', time);
    },
    pattern,
    subdivision
  );
  sequence.loop = true;
  sequence.start(0);
  getTransport().start();

  setTimeout(() => stopPercussion(), durationMs);
}

export function resumePercussion(rhythm: string, bpm: number): void {
  if (!anyEnabled()) return;
  // Tone.js Transport 재개 대신 새로 시작 (더 안정적)
  void startPercussion(rhythm, bpm);
}
