# 전체 리더보드 (빌드 8단계) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 게임오버 화면에서 닉네임으로 점수를 등록하고 전체 TOP 10을 보여주는 리더보드를 Supabase(서버 코드 0줄)로 구현한다.

**Architecture:** 순수 로직(`leaderboard.js`: 검증·요청 생성·응답 해석)과 UI(`game.js`: fetch 실행·그리기)를 분리. 설정(`leaderboard-config.js`)이 비어 있으면 리더보드 UI 전체를 숨겨 Supabase 없이도 게임이 동작한다. GitHub Actions cron이 주 2회 조회를 쏴 무료 플랜 일시정지를 막는다. 스펙: `docs/superpowers/specs/2026-07-10-leaderboard-design.md`

**Tech Stack:** 바닐라 HTML/CSS/JS (ES Modules), Supabase PostgREST (fetch만, SDK 없음), GitHub Actions

## Global Constraints

- 외부 의존성 추가 금지 (npm 패키지 0 — Supabase는 fetch로만 호출)
- 로직/DOM 분리: 검증·요청 형식은 `leaderboard.js`(순수), fetch 실행·DOM은 `game.js`
- 순수 모듈(game-core.js, problems.js, format.js) 수정 금지
- 주석·테스트 이름·에러 메시지는 한국어
- 닉네임 규칙: `^[가-힣a-zA-Z0-9]{1,8}$` (trim 후) — DB CHECK와 동일해야 함
- 점수 제약: 0~100000의 10의 배수 (DB CHECK)
- anon key는 공개 전제 (RLS가 방어선) — 저장소에 평문 커밋 허용
- 설정이 비어 있으면(`url`/`anonKey` 중 하나라도 빈 문자열) 리더보드 UI 숨김, 게임 정상 동작

---

### Task 1: leaderboard.js 순수 모듈 + 단위 테스트 (TDD)

**Files:**
- Create: `leaderboard.js`
- Create: `test-leaderboard.js`
- Modify: `package.json` (test 스크립트에 편입)

**Interfaces:**
- Consumes: 없음
- Produces (Task 2가 사용):
  - `validateNickname(raw: string) → {ok: true, nickname: string} | {ok: false, reason: string}`
  - `isConfigured(config: {url, anonKey}) → boolean`
  - `buildSubmitRequest(config, {nickname, score}) → {url: string, options: object}`
  - `buildTopRequest(config, limit = 10) → {url: string, options: object}`
  - `parseTopResponse(json) → [{rank, nickname, score}]`

- [ ] **Step 1: 실패하는 테스트 작성**

`test-leaderboard.js` 전체:

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node test-leaderboard.js`
Expected: FAIL — `Cannot find module ... leaderboard.js` (모듈이 아직 없음)

- [ ] **Step 3: leaderboard.js 구현**

`leaderboard.js` 전체:

```js
// 전체 리더보드 순수 로직 — DOM·네트워크 없음 (fetch 실행은 game.js).
// Supabase PostgREST를 SDK 없이 호출하기 위한 검증·요청 생성·응답 해석만 담당한다.

// 닉네임 규칙: 한글/영문/숫자 1~8자 — DB의 CHECK 제약과 반드시 동일해야 한다 (스펙 참조)
const NICKNAME_RE = /^[가-힣a-zA-Z0-9]{1,8}$/;

// 닉네임 검증 — 통과 시 trim된 닉네임을 돌려준다
export function validateNickname(raw) {
  if (typeof raw !== 'string') return { ok: false, reason: '닉네임을 입력해 주세요' };
  const nickname = raw.trim();
  if (nickname.length === 0) return { ok: false, reason: '닉네임을 입력해 주세요' };
  if (!NICKNAME_RE.test(nickname)) {
    return { ok: false, reason: '한글/영문/숫자 1~8자만 쓸 수 있어요' };
  }
  return { ok: true, nickname };
}

// 설정이 채워졌는지 — 비어 있으면 리더보드 UI를 아예 숨긴다 (game.js)
export function isConfigured(config) {
  return Boolean(config && config.url && config.anonKey);
}

// 공통 인증 헤더 — anon key는 공개 전제 (RLS가 방어선)
function authHeaders(config) {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
  };
}

// 점수 등록 요청 — fetch(url, options)에 그대로 넘길 인자를 만든다
export function buildSubmitRequest(config, { nickname, score }) {
  return {
    url: `${config.url}/rest/v1/scores`,
    options: {
      method: 'POST',
      headers: {
        ...authHeaders(config),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ nickname, score }),
    },
  };
}

// TOP N 조회 요청 — 점수 내림차순, 동점은 먼저 등록한 쪽이 위
export function buildTopRequest(config, limit = 10) {
  const query = `select=nickname,score&order=score.desc,created_at.asc&limit=${limit}`;
  return {
    url: `${config.url}/rest/v1/scores?${query}`,
    options: { method: 'GET', headers: authHeaders(config) },
  };
}

// 서버 응답(JSON 배열)을 [{rank, nickname, score}]로 — 형식이 어긋난 항목은 버린다
export function parseTopResponse(json) {
  if (!Array.isArray(json)) return [];
  return json
    .filter((row) => row && typeof row === 'object'
      && typeof row.nickname === 'string'
      && Number.isInteger(row.score))
    .map((row, i) => ({ rank: i + 1, nickname: row.nickname, score: row.score }));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node test-leaderboard.js`
Expected: `leaderboard: 16개 통과, 0개 실패`

- [ ] **Step 5: package.json에 편입**

`package.json`의 test 스크립트를:

```json
    "test": "node test-problems.js && node test-game-core.js && node test-format.js"
```

다음으로 교체한다:

```json
    "test": "node test-problems.js && node test-game-core.js && node test-format.js && node test-leaderboard.js"
```

- [ ] **Step 6: 전체 테스트**

Run: `npm test`
Expected: 4개 파일 전부 통과 — 36 + 32 + 8 + 16 = 92개, 실패 0

- [ ] **Step 7: Commit**

```bash
git add leaderboard.js test-leaderboard.js package.json
git commit -m "feat: 리더보드 순수 로직 - 닉네임 검증, Supabase 요청 생성, 응답 해석"
```

---

### Task 2: 게임오버 패널 리더보드 UI

**Files:**
- Create: `leaderboard-config.js`
- Modify: `index.html` (게임오버 패널에 리더보드 마크업)
- Modify: `style.css` (리더보드 스타일)
- Modify: `game.js` (fetch 실행 + 그리기 + 게임오버 훅)

**Interfaces:**
- Consumes: Task 1의 `validateNickname`, `isConfigured`, `buildSubmitRequest`, `buildTopRequest`, `parseTopResponse` (시그니처는 Task 1 참조)
- Produces: `leaderboard-config.js`의 `export const LEADERBOARD_CONFIG = { url: '', anonKey: '' }` — Task 4에서 실제 값 기입

- [ ] **Step 1: leaderboard-config.js 생성**

```js
// Supabase 접속 정보 — anon key는 공개 전제(RLS가 방어선)라 커밋해도 된다.
// 두 값이 비어 있으면 리더보드 UI가 통째로 숨겨지고 게임은 그대로 동작한다.
export const LEADERBOARD_CONFIG = {
  url: '',     // 예: https://xxxx.supabase.co
  anonKey: '',
};
```

- [ ] **Step 2: index.html — 게임오버 패널에 마크업 추가**

`#gameover .panel` 안, `<p id="final-score"></p>` 와 `<button id="restart">` **사이**에 추가한다:

```html
      <div id="leaderboard" hidden>
        <p class="lb-title">🏆 전체 TOP 10</p>
        <ol id="ranking"></ol>
        <p id="lb-status"></p>
        <div class="lb-form">
          <input id="nickname" maxlength="8" placeholder="별명 (1~8자)" autocomplete="off">
          <button id="submit-score">등록</button>
        </div>
        <p class="lb-hint">실명 말고 별명을 써 주세요</p>
      </div>
```

- [ ] **Step 3: style.css — 리더보드 스타일**

`/* ---------- 게임 오버 ---------- */` 섹션 끝(`#gameover.newbest` 규칙들 뒤)에 추가한다:

```css
/* ---------- 리더보드 (게임오버 패널 안) ---------- */

#leaderboard { margin: 0 0 1rem; }
#leaderboard[hidden] { display: none; }
#leaderboard .lb-title { font-size: 1.05rem; font-weight: 900; margin: 0 0 0.4rem; }
#ranking {
  margin: 0 auto 0.4rem;
  padding-left: 1.6rem;
  max-width: 15rem;
  text-align: left;
  font-weight: 700;
  color: #374151;
}
#ranking li { margin: 0.12rem 0; }
#lb-status {
  min-height: 1.2rem;
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #6b7280;
}
.lb-form { display: flex; gap: 0.4rem; justify-content: center; }
#nickname {
  font-family: inherit;
  font-size: 1rem;
  font-weight: 700;
  width: 9.5rem;
  padding: 0.45rem 0.7rem;
  border: 3px solid var(--pink-border);
  border-radius: 12px;
}
#nickname:focus { outline: none; border-color: var(--pink-deep); }
#submit-score {
  font-family: inherit;
  font-size: 1rem;
  font-weight: 800;
  padding: 0.45rem 1.1rem;
  border: none;
  border-radius: 999px;
  background: var(--pink-deep);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 0 var(--pink);
}
#submit-score:disabled { opacity: 0.55; cursor: default; box-shadow: none; }
#submit-score:not(:disabled):active { transform: translateY(3px); box-shadow: 0 1px 0 var(--pink); }
.lb-hint { margin: 0.4rem 0 0; font-size: 0.8rem; color: #9ca3af; }
```

- [ ] **Step 4: game.js — import·DOM 참조·리더보드 로직 추가**

(a) 파일 상단 import 블록에 추가:

```js
import { LEADERBOARD_CONFIG } from './leaderboard-config.js';
import {
  validateNickname, isConfigured, buildSubmitRequest, buildTopRequest, parseTopResponse,
} from './leaderboard.js';
```

(b) DOM 참조 블록(`const restartBtn = ...` 아래)에 추가:

```js
const leaderboardEl = document.getElementById('leaderboard');
const rankingEl = document.getElementById('ranking');
const nicknameEl = document.getElementById('nickname');
const submitScoreBtn = document.getElementById('submit-score');
const lbStatusEl = document.getElementById('lb-status');
```

(c) `saveBest` 함수 아래에 리더보드 블록 추가:

```js
// ---------- 리더보드 (fetch 실행과 그리기만 — 규칙은 leaderboard.js) ----------

// 마지막 닉네임 기억 (최고점과 같은 localStorage 패턴)
const NICK_KEY = 'math-game.nickname';
function loadNickname() {
  try {
    return localStorage.getItem(NICK_KEY) || '';
  } catch {
    return '';
  }
}
function saveNickname(name) {
  try {
    localStorage.setItem(NICK_KEY, name);
  } catch {
    // 저장 실패해도 게임은 계속되어야 한다
  }
}

let scoreSubmitted = false; // 게임당 1회 등록

// TOP 10 조회·그리기 — 실패해도 게임 진행에는 영향이 없다
async function refreshRanking() {
  lbStatusEl.textContent = '불러오는 중...';
  rankingEl.textContent = '';
  try {
    const { url, options } = buildTopRequest(LEADERBOARD_CONFIG);
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = parseTopResponse(await res.json());
    lbStatusEl.textContent = rows.length === 0 ? '아직 등록된 점수가 없어요' : '';
    for (const row of rows) {
      const li = document.createElement('li');
      li.textContent = `${row.nickname} — ${row.score}점`; // 순위 번호는 ol이 붙인다
      rankingEl.append(li);
    }
  } catch {
    lbStatusEl.textContent = '순위를 불러오지 못했어요';
  }
}

// 점수 등록 — 성공하면 버튼을 잠그고 목록을 갱신한다
async function submitScore() {
  const checked = validateNickname(nicknameEl.value);
  if (!checked.ok) {
    lbStatusEl.textContent = checked.reason;
    return;
  }
  submitScoreBtn.disabled = true;
  lbStatusEl.textContent = '등록 중...';
  try {
    const { url, options } = buildSubmitRequest(LEADERBOARD_CONFIG, {
      nickname: checked.nickname,
      score: state.score,
    });
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    scoreSubmitted = true;
    saveNickname(checked.nickname);
    await refreshRanking();
    lbStatusEl.textContent = '등록 완료!';
  } catch {
    lbStatusEl.textContent = '등록에 실패했어요';
    submitScoreBtn.disabled = false; // 재시도 허용
  }
}
```

(d) `update()`의 게임오버 전이 블록을 다음처럼 확장한다 (기존 최고점 로직은 그대로):

```js
  if (prevState.phase !== 'gameover' && state.phase === 'gameover') {
    isNewBest = state.score > best;
    if (isNewBest) {
      best = state.score;
      saveBest(best);
    }
    // 게임오버에 들어올 때마다 리더보드를 새로 준비한다
    if (isConfigured(LEADERBOARD_CONFIG)) {
      scoreSubmitted = false;
      submitScoreBtn.disabled = false;
      nicknameEl.value = loadNickname();
      refreshRanking();
    }
  }
```

(e) 이벤트 연결 블록(`restartBtn.addEventListener` 근처)에 추가:

```js
// 등록 중(버튼 비활성)이거나 이미 등록했으면 무시 — Enter 연타로 인한 이중 POST 방지
function trySubmitScore() {
  if (scoreSubmitted || submitScoreBtn.disabled) return;
  submitScore();
}
submitScoreBtn.addEventListener('click', trySubmitScore);
nicknameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') trySubmitScore();
});
```

(f) 파일 끝 최초 `render();` 호출 **앞**에 추가:

```js
// 설정이 비어 있으면 리더보드 섹션을 통째로 숨긴다 (Supabase 셋업 전에도 게임은 동작)
leaderboardEl.hidden = !isConfigured(LEADERBOARD_CONFIG);
```

- [ ] **Step 5: 회귀 테스트**

Run: `npm test`
Expected: 92개 전부 통과, 실패 0

- [ ] **Step 6: 브라우저 확인 (설정 없이)**

로컬 서버(`python -m http.server 8000`)에서: 게임오버까지 플레이 → 리더보드 섹션이 **보이지 않고** 기존 게임오버 화면과 동일하게 동작하는지 확인 (config가 비어 있으므로), 콘솔 에러 없음.

- [ ] **Step 7: Commit**

```bash
git add leaderboard-config.js index.html style.css game.js
git commit -m "feat: 게임오버 패널에 리더보드 UI - TOP 10 + 닉네임 등록 (설정 없으면 숨김)"
```

---

### Task 3: Supabase 깨우기 GitHub Actions cron

**Files:**
- Create: `.github/workflows/supabase-keepalive.yml`

**Interfaces:**
- Consumes: 없음
- Produces: 주 2회(월·목) TOP 1 조회로 DB 활동 기록. env 두 값은 Task 4에서 기입 — 비어 있으면 스스로 건너뛰므로 그 전에도 워크플로는 초록불

- [ ] **Step 1: 워크플로 작성**

`.github/workflows/supabase-keepalive.yml` 전체:

```yaml
# Supabase 무료 플랜은 7일간 DB 활동이 없으면 일시정지된다 — 주 2회 조회로 깨어 있게 유지.
# URL과 anon key는 공개 전제(RLS가 방어선)라 평문으로 둔다 (leaderboard-config.js와 같은 값).
name: supabase-keepalive
on:
  schedule:
    - cron: '0 0 * * 1,4' # 월·목 UTC 00:00 (KST 09:00)
  workflow_dispatch: {}
jobs:
  ping:
    runs-on: ubuntu-latest
    env:
      SUPABASE_URL: ''      # Task 4(셋업)에서 기입
      SUPABASE_ANON_KEY: '' # Task 4(셋업)에서 기입
    steps:
      - name: DB 활동 기록용 TOP 1 조회
        run: |
          if [ -z "$SUPABASE_URL" ]; then
            echo "Supabase 미설정 — 건너뜀"
            exit 0
          fi
          curl -sf "$SUPABASE_URL/rest/v1/scores?select=score&limit=1" \
            -H "apikey: $SUPABASE_ANON_KEY" \
            -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

- [ ] **Step 2: YAML 문법 확인**

Run: `node -e "console.log('yml exists:', require('fs').existsSync('.github/workflows/supabase-keepalive.yml'))"`
Expected: `yml exists: true` (문법은 push 후 Actions 탭에서 최종 확인 — Task 4)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/supabase-keepalive.yml
git commit -m "chore: Supabase 무료 플랜 일시정지 방지용 주 2회 keepalive cron"
```

---

### Task 4: Supabase 셋업 + 값 기입 + 검증 + 문서 갱신 (사용자와 함께)

**Files:**
- Modify: `leaderboard-config.js` (실제 url·anonKey 기입)
- Modify: `.github/workflows/supabase-keepalive.yml` (같은 값 기입)
- Modify: `README.md` (8단계 체크박스 ⬜→✅)
- Modify: `CLAUDE.md` ("현재 상태" 섹션 갱신)

**Interfaces:**
- Consumes: Task 1~3 전부
- Produces: 실동작하는 전체 리더보드 + 최신 문서

이 태스크는 **사용자의 Supabase 계정 작업이 선행**된다. 컨트롤러가 사용자에게 아래 절차를 안내한다:

- [ ] **Step 1: 사용자 안내 — Supabase 프로젝트 생성**

1. https://supabase.com 가입 → New project (리전: Northeast Asia (Seoul) 권장)
2. SQL Editor에 스펙(`docs/superpowers/specs/2026-07-10-leaderboard-design.md`)의
   "Supabase 스키마 + 보안" SQL 블록을 붙여넣고 Run
3. Settings → API에서 **Project URL**과 **anon public key**를 복사해 전달

- [ ] **Step 2: 값 기입**

전달받은 두 값을 `leaderboard-config.js`의 `url`/`anonKey`와
`.github/workflows/supabase-keepalive.yml`의 `SUPABASE_URL`/`SUPABASE_ANON_KEY`에 기입한다.

- [ ] **Step 3: 실동작 확인 (브라우저)**

로컬 서버에서 게임오버까지 플레이:
1. 리더보드 섹션이 보이고 "아직 등록된 점수가 없어요" 표시
2. 별명 입력 → 등록 → "등록 완료!" + 목록에 내 점수 표시, 버튼 비활성
3. 잘못된 별명(특수문자, 9자)은 에러 문구, 등록 안 됨
4. 다시 시작 → 게임오버 → 목록이 다시 뜨고 재등록 가능
5. curl로 위조 점수 거부 확인: 점수 15(10의 배수 아님) POST → HTTP 4xx

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST "$SUPABASE_URL/rest/v1/scores" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"nickname":"위조","score":15}'
# 기대: 400대 (CHECK 제약 위반)
```

- [ ] **Step 4: README 체크박스 갱신**

`README.md`의:

```markdown
8. ⬜ 전체 리더보드 — 서버/DB 붙이기 (별도 설계)
```

다음으로 교체한다:

```markdown
8. ✅ 전체 리더보드 — Supabase TOP 10 + 닉네임 등록
```

- [ ] **Step 5: CLAUDE.md "현재 상태" 갱신**

- 첫 항목의 "빌드 7단계(GitHub Pages 배포) 완료 — 테스트 76개 통과(36+32+8)"를
  "빌드 8단계(전체 리더보드)까지 완료 — 테스트 92개 통과(36+32+8+16)"로,
  "8단계(전체 리더보드)는 서버 설계 필요." 문장은 삭제
- "전체 리더보드는 서버가 필요하며 **아직 설계되지 않음**..." 항목을 다음으로 교체:

```markdown
- 전체 리더보드(8단계): Supabase 무료 플랜 — 스키마·RLS는
  `docs/superpowers/specs/2026-07-10-leaderboard-design.md`. 순수 로직은
  `leaderboard.js`, 접속 정보는 `leaderboard-config.js`(anon key 공개 전제,
  비어 있으면 UI 숨김). 무료 플랜 7일 정지 방지용 keepalive cron이
  `.github/workflows/supabase-keepalive.yml`에 있음
```

- "현재 상태"의 다른 항목과 다른 섹션(컨벤션·작업 방식 등)은 수정하지 않는다.

- [ ] **Step 6: 최종 테스트 + Commit**

Run: `npm test` — Expected: 92개 통과

```bash
git add leaderboard-config.js .github/workflows/supabase-keepalive.yml README.md CLAUDE.md
git commit -m "feat: 빌드 8단계 - Supabase 리더보드 연결 + 문서 갱신"
```

- [ ] **Step 7: 사용자 확인 후 푸시**

푸시하면 https://arbang0214.github.io/math-game/ 에 반영된다. **푸시 전 사용자 확인**. 푸시 후 GitHub Actions 탭에서 supabase-keepalive를 workflow_dispatch로 1회 수동 실행해 초록불 확인.

```bash
git push origin master
```
