// sf3-generated | abcTransform: ABC 옥타브 이동 + 롤(roll) 펼침 변환

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

// ── 롤(roll) 펼침: 재생 전용 ──
// 아일랜드 음악의 ~ (long roll)을 실제 음표로 펼쳐 abcjs synth가 "굴림"을 소리내게 한다.
// 악보는 원본(~) 유지, 재생용 ABC만 변환한다. (abcjs synth는 ~를 소리로 재생하지 않음)

const SCALE = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** 음표(letter+옥타브marks)를 다이아토닉 절대 인덱스로 (옥타브0 C = 0) */
function noteToDiatonic(note: string, marks: string): number {
  const letter = note.toUpperCase();
  const oct =
    (note === note.toLowerCase() ? 1 : 0) +
    (marks.match(/'/g)?.length ?? 0) -
    (marks.match(/,/g)?.length ?? 0);
  return oct * 7 + SCALE.indexOf(letter);
}

/** 다이아토닉 절대 인덱스를 ABC 음표 표기로 (accidental은 key signature가 자동 적용) */
function diatonicToAbc(dia: number): string {
  const oct = Math.floor(dia / 7);
  const idx = ((dia % 7) + 7) % 7;
  const letter = SCALE[idx];
  if (oct >= 1) {
    let s = letter.toLowerCase();
    for (let i = 1; i < oct; i++) s += "'";
    return s;
  }
  let s = letter.toUpperCase();
  for (let i = 0; i < -oct; i++) s += ',';
  return s;
}

/**
 * ~X(len) long roll을 5음(주음-윗음-주음-아랫음-주음) 5연음으로 펼친다.
 * 윗/아랫음은 다이아토닉(key signature가 샵/플랫 자동 적용).
 * 길이는 (5:len:5 튜플렛으로 보존한다.
 */
export function expandRolls(abc: string): string {
  if (!abc.includes('~')) return abc;

  return abc
    .split('\n')
    .map(line => {
      // 헤더 라인은 건드리지 않음
      if (/^[A-Za-z]:/.test(line)) return line;

      // ~ [accidental]? [음표] [옥타브marks]* [길이숫자]?
      return line.replace(
        /~(\^{1,2}|_{1,2}|=)?([A-Ga-g])([,']*)(\d*)/g,
        (_m, acc: string | undefined, note: string, marks: string, len: string) => {
          const accidental = acc ?? '';
          const dia = noteToDiatonic(note, marks);
          const principal = accidental + note + marks; // 주음 (accidental 유지)
          const upper = diatonicToAbc(dia + 1);         // 다이아토닉 윗음
          const lower = diatonicToAbc(dia - 1);         // 다이아토닉 아랫음
          // 원래 음 길이(없으면 1)를 5연음 시간 단위로 → 길이 보존
          const tupletTime = len && /^\d+$/.test(len) ? len : '1';
          // (5:time:5  P U P L P
          return `(5:${tupletTime}:5${principal}${upper}${principal}${lower}${principal}`;
        }
      );
    })
    .join('\n');
}
