// sf3-generated | abcTransform: ABC 옥타브 이동 변환

/**
 * ABC notation 문자열의 멜로디 음표를 shift 옥타브만큼 이동한다.
 * 헤더 라인(A-Z: 로 시작)은 그대로 유지한다.
 */
export function shiftAbcOctave(abc: string, shift: number): string {
  if (!shift) return abc;

  return abc
    .split('\n')
    .map(line => {
      // 헤더 라인은 건드리지 않음 (예: K:, M:, T: 등)
      if (/^[A-Za-z]:/.test(line)) return line;

      return line.replace(/([A-Ga-g])([,']*)/g, (_m, note: string, marks: string) => {
        // 현재 옥타브 계산:
        //   소문자 = 옥타브 1, 대문자 = 옥타브 0
        //   ' 1개당 +1 옥타브, , 1개당 -1 옥타브
        let oct =
          (note === note.toLowerCase() ? 1 : 0) +
          (marks.match(/'/g)?.length ?? 0) -
          (marks.match(/,/g)?.length ?? 0);

        oct += shift;

        let base = '';
        let suffix = '';

        if (oct >= 1) {
          base = note.toLowerCase();
          for (let i = 1; i < oct; i++) suffix += "'";
        } else {
          base = note.toUpperCase();
          for (let i = 0; i < -oct; i++) suffix += ',';
        }

        return base + suffix;
      });
    })
    .join('\n');
}
