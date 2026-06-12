// sf3-generated | rhythmPatterns: 아일랜드 리듬별 퍼커션 패턴

/**
 * 각 리듬의 8분음표 단위 타격 패턴.
 * 'D' = 다운비트 (바우런 다운스트로크 / 베이스 타격)
 * 't' = 틱 (업스트로크 / 하이햇 느낌)
 * '-' = 쉼 (무음)
 */
export const RHYTHM_PATTERNS: Record<string, string[]> = {
  reel:     ['D', 't', 'D', 't', 'D', 't', 'D', 't'],
  jig:      ['D', 't', 't', 'D', 't', 't'],
  slipjig:  ['D', 't', 't', 'D', 't', 't', 'D', 't', 't'],
  hornpipe: ['D', '-', 't', '-', 'D', '-', 't', '-'],
  polka:    ['D', 't', 'D', 't'],
  slide:    ['D', 't', 't', 't', 't', 't', 'D', 't', 't', 't', 't', 't'],
};

/** 리듬에 맞는 Tone.js 시퀀스 subdivision 반환 */
export function getRhythmSubdivision(_rhythm: string): string {
  // 모든 패턴이 8분음표 기반
  return '8n';
}
