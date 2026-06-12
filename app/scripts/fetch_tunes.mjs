#!/usr/bin/env node
/**
 * fetch_tunes.mjs
 * thesession.org API에서 튠을 가져와 src/data/tunes.json에 추가하는 스크립트.
 *
 * 사용법:
 *   node scripts/fetch_tunes.mjs --id 10 --id 15 --id 38
 *
 * 옵션:
 *   --id <number>   thesession.org 튠 ID (여러 번 지정 가능)
 *   --dry-run       실제 파일 쓰기 없이 결과만 출력
 *
 * [web-review-recommended] thesession.org API 엔드포인트 변경 가능성 있음.
 *   현재 엔드포인트: https://thesession.org/tunes/{id}?format=json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TUNES_PATH = resolve(__dirname, '../src/data/tunes.json');
const API_BASE = 'https://thesession.org/tunes';

// CLI 인수 파싱
const args = process.argv.slice(2);
const ids = [];
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--id' && args[i + 1]) {
    ids.push(Number(args[++i]));
  } else if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

if (ids.length === 0) {
  console.error('사용법: node scripts/fetch_tunes.mjs --id <tuneId> [--id <tuneId> ...]');
  console.error('예시:   node scripts/fetch_tunes.mjs --id 10 --id 15');
  process.exit(1);
}

async function fetchTune(id) {
  const url = `${API_BASE}/${id}?format=json`;
  console.log(`Fetching: ${url}`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }

  const data = await res.json();

  // thesession.org 응답 → tunes.json 스키마 변환
  const setting = data.settings?.[0];
  if (!setting) {
    throw new Error(`튠 ${id}에 악보 데이터가 없습니다.`);
  }

  return {
    id: `thesession-${id}`,
    title: data.name ?? `Tune ${id}`,
    book: 0,
    page: 0,
    rhythm: (data.type ?? 'reel').toLowerCase(),
    meter: meterFromType(data.type),
    key: setting.key ?? 'Dmaj',
    defaultBpm: defaultBpmFromType(data.type),
    setId: '',
    setOrder: 1,
    abc: setting.abc ?? '',
    source: 'thesession',
    sourceUrl: `https://thesession.org/tunes/${id}`,
  };
}

function meterFromType(type) {
  const t = (type ?? '').toLowerCase();
  if (t === 'jig' || t === 'slide') return '6/8';
  if (t === 'slipjig') return '9/8';
  if (t === 'polka') return '2/4';
  if (t === 'waltz') return '3/4';
  return '4/4';
}

function defaultBpmFromType(type) {
  const t = (type ?? '').toLowerCase();
  if (t === 'reel') return 110;
  if (t === 'jig') return 116;
  if (t === 'polka') return 130;
  if (t === 'hornpipe') return 90;
  if (t === 'slipjig') return 100;
  return 110;
}

async function main() {
  let existing = [];
  if (existsSync(TUNES_PATH)) {
    existing = JSON.parse(readFileSync(TUNES_PATH, 'utf8'));
  }

  const existingIds = new Set(existing.map(t => t.id));
  const newTunes = [];

  for (const id of ids) {
    const key = `thesession-${id}`;
    if (existingIds.has(key)) {
      console.log(`건너뜀 (이미 존재): ${key}`);
      continue;
    }
    try {
      const tune = await fetchTune(id);
      newTunes.push(tune);
      console.log(`추가됨: ${tune.title} (${tune.rhythm})`);
    } catch (err) {
      console.error(`오류 [${id}]:`, err.message);
    }
  }

  if (newTunes.length === 0) {
    console.log('추가할 새 튠이 없습니다.');
    return;
  }

  const merged = [...existing, ...newTunes];

  if (dryRun) {
    console.log('\n[dry-run] 결과 미리보기:');
    console.log(JSON.stringify(newTunes, null, 2));
  } else {
    writeFileSync(TUNES_PATH, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`\n${newTunes.length}곡 추가됨 → ${TUNES_PATH}`);
  }
}

main().catch(err => {
  console.error('fetch_tunes 오류:', err);
  process.exit(1);
});
