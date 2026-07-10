// leaderboard.js 단위 테스트 — 실행: node test-leaderboard.js
import {
  validateNickname, isConfigured, buildSubmitRequest, buildTopRequest, parseTopResponse,
} from './leaderboard.js';

let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    fail++;
    console.error(`  ❌ ${name}`);
    console.error(`     ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const CFG = { url: 'https://example.supabase.co', anonKey: 'test-key' };

console.log('validateNickname (결정적)');
test('한글 닉네임은 통과한다', () => {
  const r = validateNickname('토끼왕');
  assert(r.ok && r.nickname === '토끼왕', `기대 ok "토끼왕", 실제 ${JSON.stringify(r)}`);
});
test('영문+숫자 8자는 통과한다', () => {
  assert(validateNickname('rabbit12').ok, '8자 영문+숫자는 통과해야 한다');
});
test('앞뒤 공백은 잘라내고 통과한다', () => {
  const r = validateNickname('  별명  ');
  assert(r.ok && r.nickname === '별명', `기대 "별명", 실제 ${JSON.stringify(r)}`);
});
test('9자는 거부한다', () => {
  assert(!validateNickname('123456789').ok, '9자는 거부해야 한다');
});
test('빈 문자열과 공백만은 거부한다', () => {
  assert(!validateNickname('').ok, '빈 문자열은 거부해야 한다');
  assert(!validateNickname('   ').ok, '공백만은 거부해야 한다');
});
test('특수문자는 거부한다', () => {
  assert(!validateNickname('토끼!').ok, '특수문자는 거부해야 한다');
});
test('가운데 공백은 거부한다', () => {
  assert(!validateNickname('토 끼').ok, '가운데 공백은 거부해야 한다');
});
test('문자열이 아니면 거부한다', () => {
  assert(!validateNickname(null).ok, 'null은 거부해야 한다');
  assert(!validateNickname(123).ok, '숫자는 거부해야 한다');
});

console.log('설정·요청 생성·응답 해석 (결정적)');
test('isConfigured: url과 anonKey가 둘 다 있어야 true', () => {
  assert(isConfigured(CFG), '둘 다 있으면 true');
  assert(!isConfigured({ url: '', anonKey: '' }), '둘 다 비면 false');
  assert(!isConfigured({ url: 'https://x', anonKey: '' }), 'anonKey가 비면 false');
  assert(!isConfigured({ url: '', anonKey: 'k' }), 'url이 비면 false');
});
test('buildSubmitRequest: POST + 인증 헤더 + JSON 바디', () => {
  const { url, options } = buildSubmitRequest(CFG, { nickname: '토끼', score: 120 });
  assert(url === 'https://example.supabase.co/rest/v1/scores', `url이 ${url}`);
  assert(options.method === 'POST', 'POST여야 한다');
  assert(options.headers.apikey === 'test-key', 'apikey 헤더 필요');
  assert(options.headers.Authorization === 'Bearer test-key', 'Bearer 헤더 필요');
  assert(options.headers['Content-Type'] === 'application/json', 'JSON 타입 필요');
  const body = JSON.parse(options.body);
  assert(body.nickname === '토끼' && body.score === 120,
    `바디가 ${options.body}`);
});
test('buildTopRequest: 점수 내림차순, 동점은 먼저 등록 순, limit 10', () => {
  const { url, options } = buildTopRequest(CFG);
  assert(options.method === 'GET', 'GET이어야 한다');
  assert(options.headers.apikey === 'test-key', 'apikey 헤더 필요');
  assert(url.includes('order=score.desc,created_at.asc'), `정렬 조건 누락: ${url}`);
  assert(url.includes('limit=10'), `limit 누락: ${url}`);
});
test('parseTopResponse: 순서대로 rank를 붙인다', () => {
  const rows = parseTopResponse([
    { nickname: '가', score: 30 },
    { nickname: '나', score: 20 },
  ]);
  const expected = JSON.stringify([
    { rank: 1, nickname: '가', score: 30 },
    { rank: 2, nickname: '나', score: 20 },
  ]);
  assert(JSON.stringify(rows) === expected, `실제 ${JSON.stringify(rows)}`);
});
test('parseTopResponse: 형식이 어긋난 항목은 버리고 rank를 다시 센다', () => {
  const rows = parseTopResponse([
    { nickname: '가', score: 30 },
    { nickname: 5, score: 'x' },
    null,
    { nickname: '나', score: 10 },
  ]);
  assert(rows.length === 2, `2개여야 하는데 ${rows.length}개`);
  assert(rows[1].rank === 2 && rows[1].nickname === '나', '두 번째가 rank 2 "나"');
});
test('parseTopResponse: 배열이 아니면 빈 배열', () => {
  assert(parseTopResponse(null).length === 0, 'null → []');
  assert(parseTopResponse({}).length === 0, '객체 → []');
});

console.log('무작위 속성 검사');
test('무작위 문자열 500개: 검증을 통과한 닉네임은 항상 한글/영문/숫자 1~8자', () => {
  const pool = '가나다랑ABz09 !@#/\\.,한글English🐰';
  for (let i = 0; i < 500; i++) {
    const len = Math.floor(Math.random() * 12);
    let s = '';
    for (let j = 0; j < len; j++) s += pool[Math.floor(Math.random() * pool.length)];
    const r = validateNickname(s);
    if (r.ok) {
      assert(/^[가-힣a-zA-Z0-9]{1,8}$/.test(r.nickname),
        `통과한 닉네임 "${r.nickname}"이 규칙 위반 (원문 "${s}")`);
    }
  }
});
test('무작위 유효 입력 500개: 등록 요청 바디는 JSON 왕복이 되고 url은 config로 시작', () => {
  const names = ['토끼', 'rabbit', '별명123', 'A1'];
  for (let i = 0; i < 500; i++) {
    const entry = {
      nickname: names[Math.floor(Math.random() * names.length)],
      score: Math.floor(Math.random() * 10000) * 10, // 게임 규칙상 10의 배수
    };
    const { url, options } = buildSubmitRequest(CFG, entry);
    assert(url.startsWith(CFG.url), `url이 config.url로 시작하지 않음: ${url}`);
    const round = JSON.parse(options.body);
    assert(round.nickname === entry.nickname && round.score === entry.score,
      `바디 왕복 불일치: ${options.body}`);
  }
});

console.log(`\nleaderboard: ${pass}개 통과, ${fail}개 실패`);
if (fail > 0) process.exit(1);
