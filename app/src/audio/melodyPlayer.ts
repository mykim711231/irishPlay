// sf3-generated | melodyPlayer: abcjs synth 기반 멜로디 재생 모듈

import abcjs from 'abcjs';
import { shiftAbcOctave, expandRolls } from './abcTransform';
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
  // 커서 시작 지연 타이머 (오디오 출력 레이턴시 보정용)
  private startTimer: number | null = null;

  /** §15 항목 1: AudioContext는 반드시 사용자 클릭 핸들러 안에서 시작
   *  싱크: resume()을 await하여 오디오 준비 완료 후 커서를 시작 (커서 선행 방지) */
  private async ensureAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      const AC =
        window.AudioContext ?? (window as any).webkitAudioContext;
      this.audioContext = new AC();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  private clearStartTimer(): void {
    if (this.startTimer !== null) {
      clearTimeout(this.startTimer);
      this.startTimer = null;
    }
  }

  /**
   * §15 항목 2: abcjs synth는 init → prime → start 순서 준수
   * §15 항목 3: 악보는 원본 ABC로 렌더, 재생용만 octave shift 적용
   */
  async load(screenVisualObj: any, opts: LoadOptions): Promise<void> {
    const { abc, instrumentId, bpm, meter, onEvent, onFinished } = opts;
    const instrument = getInstrument(instrumentId);

    // 재생용 ABC — 옥타브 변환 후 롤(~) 펼침 (악보는 원본 유지, 재생만 장식음 표현)
    const shifted =
      instrument.octave !== 0
        ? shiftAbcOctave(abc, instrument.octave)
        : abc;
    const playAbc = expandRolls(shifted);

    // abcjs가 DOM을 건드리지 않는 '*' 렌더로 재생용 visualObj 생성
    const playVisualObj = abcjs.renderAbc('*', playAbc, {})[0];

    const ctx = await this.ensureAudioContext();
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
    // ⚠️ abcjs 실제 옵션명은 eventCallback (onEvent 아님!). 끝 도달 시 eventCallback(null) 호출됨.
    this.timingCallbacks = new (abcjs as any).TimingCallbacks(
      screenVisualObj,
      {
        qpm: bpm,
        beatSubdivisions: 2,
        eventCallback: (ev: any) => {
          if (ev === null) {
            // 곡 끝 도달
            this.state = 'idle';
            onFinished();
            return;
          }
          onEvent(ev);
        },
      }
    );
  }

  play(): void {
    if (!this.synth || !this.timingCallbacks) return;
    this.clearStartTimer();
    this.synth.start();
    // 싱크: 스피커 출력까지의 지연(baseLatency+outputLatency)만큼 커서를 늦춰
    // 소리와 커서를 정렬한다. (커서가 소리보다 앞서가는 현상 보정)
    const ctx = this.audioContext;
    const latencyMs = ctx
      ? ((ctx.baseLatency || 0) + ((ctx as any).outputLatency || 0)) * 1000
      : 0;
    if (latencyMs > 4) {
      this.startTimer = window.setTimeout(() => {
        this.startTimer = null;
        this.timingCallbacks?.start();
      }, latencyMs);
    } else {
      this.timingCallbacks.start();
    }
    this.state = 'playing';
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.clearStartTimer();
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

  /**
   * 가이드 "들어보기": 짧은 ABC 음표열을 단발 재생 (장식음 예시).
   * 곡 재생용 synth와 별개의 임시 synth를 사용하며, 롤(~)은 펼쳐서 소리낸다.
   */
  async playSnippet(notes: string, meter = '4/4', bpm = 110): Promise<void> {
    const abc = `X:1\nL:1/8\nM:${meter}\nK:D\n${notes}`;
    const expanded = expandRolls(abc);
    const vobj = (abcjs as any).renderAbc('*', expanded, {})[0];
    if (!vobj) return;
    const ctx = await this.ensureAudioContext();
    const snip = new (abcjs as any).synth.CreateSynth();
    await snip.init({
      visualObj: vobj,
      audioContext: ctx,
      millisecondsPerMeasure: calcMsPerMeasure(meter, bpm),
    });
    await snip.prime();
    snip.start();
    // snippet은 짧으므로 일정 시간 후 정리
    setTimeout(() => { try { snip.stop(); } catch (_) { /* 무시 */ } }, 6000);
  }

  private cleanup(): void {
    this.clearStartTimer();
    try { this.synth?.stop(); } catch (_) { /* 무시 */ }
    try { this.timingCallbacks?.stop(); } catch (_) { /* 무시 */ }
    this.synth = null;
    this.timingCallbacks = null;
  }
}

/** 싱글턴 플레이어 인스턴스 */
export const melodyPlayer = new MelodyPlayer();
