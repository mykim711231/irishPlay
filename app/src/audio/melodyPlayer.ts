// sf3-generated | melodyPlayer: abcjs synth 기반 멜로디 재생 모듈

import abcjs from 'abcjs';
import { shiftAbcOctave } from './abcTransform';
import { getInstrument } from '../data/instruments';

// [web-review-recommended] abcjs.synth.CreateSynth / TimingCallbacks API:
//   abcjs 버전 변경에 따라 init/prime/start 시그니처가 바뀔 수 있음.
//   설치 후 실제 타입 확인 필요.

type PlayState = 'idle' | 'playing' | 'paused';

interface LoadOptions {
  abc: string;
  instrumentId: string;
  bpm: number;
  meter: string;
  onEvent: (ev: any) => void;
  onFinished: () => void;
}

/** meter 문자열("4/4", "6/8" 등)에서 한 마디의 밀리초 계산 */
function calcMsPerMeasure(meter: string, bpm: number): number {
  const [num, den] = meter.split('/').map(Number);
  // 온음표(1/1) 길이 = 4 * (60000 / bpm) ms
  // 한 마디 = (num/den) 온음표
  return (num / den) * 4 * (60000 / bpm);
}

class MelodyPlayer {
  private audioContext: AudioContext | null = null;
  private synth: any = null;
  private timingCallbacks: any = null;
  private state: PlayState = 'idle';

  /** §15 항목 1: AudioContext는 반드시 사용자 클릭 핸들러 안에서 시작 */
  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AC =
        window.AudioContext ?? (window as any).webkitAudioContext;
      this.audioContext = new AC();
    }
    if (this.audioContext.state === 'suspended') {
      void this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * §15 항목 2: abcjs synth는 init → prime → start 순서 준수
   * §15 항목 3: 악보는 원본 ABC로 렌더, 재생용만 octave shift 적용
   */
  async load(screenVisualObj: any, opts: LoadOptions): Promise<void> {
    const { abc, instrumentId, bpm, meter, onEvent, onFinished } = opts;
    const instrument = getInstrument(instrumentId);

    // 재생용 ABC — 필요시 옥타브 변환
    const playAbc =
      instrument.octave !== 0
        ? shiftAbcOctave(abc, instrument.octave)
        : abc;

    // abcjs가 DOM을 건드리지 않는 '*' 렌더로 재생용 visualObj 생성
    const playVisualObj = abcjs.renderAbc('*', playAbc, {})[0];

    const ctx = this.ensureAudioContext();
    const msPerMeasure = calcMsPerMeasure(meter, bpm);

    // 기존 재생 정리
    this.cleanup();

    // init → prime
    this.synth = new (abcjs as any).synth.CreateSynth();
    await this.synth.init({
      visualObj: playVisualObj,
      audioContext: ctx,
      millisecondsPerMeasure: msPerMeasure,
      options: { program: instrument.program },
    });
    await this.synth.prime();

    // TimingCallbacks: 화면 visualObj 기준으로 커서 이벤트 발생
    this.timingCallbacks = new (abcjs as any).TimingCallbacks(
      screenVisualObj,
      {
        qpm: bpm,
        beatSubdivisions: 2,
        onEvent,
        onFinished: () => {
          this.state = 'idle';
          onFinished();
        },
      }
    );
  }

  play(): void {
    if (!this.synth || !this.timingCallbacks) return;
    this.synth.start();
    this.timingCallbacks.start();
    this.state = 'playing';
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.synth?.pause();
    this.timingCallbacks?.pause();
    this.state = 'paused';
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.synth?.resume();
    this.timingCallbacks?.resume();
    this.state = 'playing';
  }

  stop(): void {
    this.cleanup();
    this.state = 'idle';
  }

  getState(): PlayState {
    return this.state;
  }

  private cleanup(): void {
    try { this.synth?.stop(); } catch (_) { /* 무시 */ }
    try { this.timingCallbacks?.stop(); } catch (_) { /* 무시 */ }
    this.synth = null;
    this.timingCallbacks = null;
  }
}

/** 싱글턴 플레이어 인스턴스 */
export const melodyPlayer = new MelodyPlayer();
